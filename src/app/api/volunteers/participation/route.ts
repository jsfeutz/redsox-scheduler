import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { requiredVolunteerHours: true },
  });

  const players = await prisma.player.findMany({
    where: {
      active: true,
      team: { organizationId: user.organizationId },
    },
    select: {
      id: true,
      name: true,
      number: true,
      team: { select: { id: true, name: true, color: true } },
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
    orderBy: [{ team: { name: "asc" } }, { name: "asc" }],
  });

  const requiredHours = org?.requiredVolunteerHours ?? 0;

  const result = players.map((p) => {
    const totalHours = p.volunteers.reduce(
      (sum, v) => sum + v.assignments.reduce((s, a) => s + (a.hoursEarned ?? 0), 0),
      0
    );
    const status =
      requiredHours <= 0
        ? totalHours > 0 ? "contributed" : "none"
        : totalHours >= requiredHours
          ? "fulfilled"
          : totalHours > 0
            ? "in_progress"
            : "not_started";

    return {
      playerId: p.id,
      playerName: p.name,
      playerNumber: p.number,
      teamId: p.team.id,
      teamName: p.team.name,
      teamColor: p.team.color,
      totalHours,
      requiredHours,
      status,
      volunteers: p.volunteers.map((v) => ({
        name: v.name,
        email: v.email,
        hours: v.assignments.reduce((s, a) => s + (a.hoursEarned ?? 0), 0),
      })),
    };
  });

  return NextResponse.json(result);
}
