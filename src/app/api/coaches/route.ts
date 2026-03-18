import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { UserRole } from "@prisma/client";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coaches = await prisma.user.findMany({
    where: {
      organizationId: user.organizationId,
      role: { in: [UserRole.COACH, UserRole.ADMIN, UserRole.TEAM_ADMIN] },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(coaches);
}
