import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { documentsVisibleWhere, parseTags, publicDocumentsWhere } from "@/lib/documents-access";

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

  const rows = await prisma.document.findMany({
    where: base,
    select: { tags: true },
  });

  const set = new Set<string>();
  for (const r of rows) {
    for (const t of parseTags(r.tags)) {
      set.add(t);
    }
  }

  return NextResponse.json(Array.from(set).sort((a, b) => a.localeCompare(b)));
}
