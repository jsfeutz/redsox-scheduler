import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const { token } = body;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const verification = await prisma.emailVerification.findUnique({
    where: { token },
  });

  if (!verification || verification.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Link expired or invalid" },
      { status: 401 }
    );
  }

  const signups = await prisma.jobAssignment.findMany({
    where: { email: verification.email, cancelledAt: null },
    include: {
      gameJob: {
        include: {
          jobTemplate: { select: { name: true } },
          scheduleEvent: {
            select: {
              title: true,
              startTime: true,
              endTime: true,
              team: { select: { name: true, color: true } },
              subFacility: {
                select: {
                  name: true,
                  facility: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const teamIds = [...new Set(signups.filter((s) => s.gameJob.teamId && !s.gameJob.scheduleEventId).map((s) => s.gameJob.teamId!))];
  const teams = teamIds.length > 0
    ? await prisma.team.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true, color: true } })
    : [];
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const result = signups.map((s) => {
    const isTeamRole = !s.gameJob.scheduleEventId && s.gameJob.teamId;
    const directTeam = isTeamRole ? teamMap.get(s.gameJob.teamId!) : null;

    return {
      id: s.id,
      cancelToken: s.cancelToken,
      name: s.name,
      playerName: s.playerName,
      jobName: s.gameJob.overrideName ?? s.gameJob.jobTemplate.name,
      eventTitle: s.gameJob.scheduleEvent?.title ?? (isTeamRole ? "Team Role" : "Event"),
      startTime: s.gameJob.scheduleEvent?.startTime?.toISOString() ?? null,
      endTime: s.gameJob.scheduleEvent?.endTime?.toISOString() ?? null,
      teamName: s.gameJob.scheduleEvent?.team?.name ?? directTeam?.name ?? "",
      teamColor: s.gameJob.scheduleEvent?.team?.color ?? directTeam?.color ?? "#666",
      facilityName: s.gameJob.scheduleEvent?.subFacility?.facility.name ?? "",
      subFacilityName: s.gameJob.scheduleEvent?.subFacility?.name ?? "",
      hoursEarned: s.hoursEarned,
      isTeamRole: !!isTeamRole,
      createdAt: s.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ email: verification.email, signups: result });
}
