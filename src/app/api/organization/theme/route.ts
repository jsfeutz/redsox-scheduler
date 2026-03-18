import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const org = await prisma.organization.findFirst({
    select: { primaryColor: true, themeMode: true },
  });

  return NextResponse.json(org ?? { primaryColor: "#dc2626", themeMode: "light" });
}
