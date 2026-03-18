import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { UserRole } from "@prisma/client";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { records } = body as {
    records: Array<{ email: string; name?: string }>;
  };

  if (!records || !Array.isArray(records) || records.length === 0) {
    return NextResponse.json(
      { error: "No records provided" },
      { status: 400 }
    );
  }

  let imported = 0;

  for (const record of records) {
    const email = record.email?.trim().toLowerCase();
    if (!email) continue;

    await prisma.volunteerParent.upsert({
      where: {
        email_organizationId: {
          email,
          organizationId: user.organizationId,
        },
      },
      update: {
        ...(record.name?.trim() ? { name: record.name.trim() } : {}),
      },
      create: {
        email,
        name: record.name?.trim() || null,
        organizationId: user.organizationId,
      },
    });

    imported++;
  }

  return NextResponse.json({ imported });
}
