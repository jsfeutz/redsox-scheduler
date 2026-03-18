import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { requiredVolunteerHours: true },
  });

  const players = await prisma.player.findMany({
    where: { teamId: id, active: true },
    select: {
      id: true,
      name: true,
      number: true,
      volunteers: {
        select: {
          id: true,
          name: true,
          email: true,
          assignments: {
            where: { cancelledAt: null },
            select: { hoursEarned: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = players.map((p) => {
    const totalHours = p.volunteers.reduce(
      (sum, v) => sum + v.assignments.reduce((s, a) => s + (a.hoursEarned ?? 0), 0),
      0
    );
    return {
      playerId: p.id,
      playerName: p.name,
      playerNumber: p.number,
      totalHours,
      requiredHours: org?.requiredVolunteerHours ?? 0,
      volunteerCount: p.volunteers.length,
      volunteers: p.volunteers.map((v) => ({
        id: v.id,
        name: v.name,
        email: v.email,
        hours: v.assignments.reduce((s, a) => s + (a.hoursEarned ?? 0), 0),
      })),
    };
  });

  return NextResponse.json(result);
}
