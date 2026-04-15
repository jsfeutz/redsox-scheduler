import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { documentsVisibleWhere, publicDocumentsWhere } from "@/lib/documents-access";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const publicOnly =
    searchParams.get("public") === "1" || searchParams.get("public") === "true";

  const user = await getCurrentUser();
  const base = publicOnly
    ? publicDocumentsWhere(org.id)
    : await documentsVisibleWhere(org.id, user);

  const rows = await prisma.document.groupBy({
    by: ["category"],
    where: { ...base, category: { not: null } },
  });

  const names = rows
    .map((r) => r.category)
    .filter((c): c is string => Boolean(c?.trim()))
    .sort((a, b) => a.localeCompare(b));

  return NextResponse.json(names);
}
