import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parents = await prisma.volunteerParent.findMany({
    where: { organizationId: user.organizationId },
    include: {
      signups: {
        include: {
          volunteerSlot: {
            select: { durationMinutes: true },
          },
        },
      },
    },
    orderBy: { email: "asc" },
  });

  const result = parents.map((parent) => ({
    id: parent.id,
    name: parent.name,
    email: parent.email,
    signupCount: parent.signups.length,
    scheduledHours: parent.signups.reduce(
      (sum, s) => sum + s.volunteerSlot.durationMinutes / 60,
      0
    ),
    completedHours: parent.signups.reduce(
      (sum, s) => sum + s.hoursCompleted,
      0
    ),
  }));

  return NextResponse.json(result);
}
