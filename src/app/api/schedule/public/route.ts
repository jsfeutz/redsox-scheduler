import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const teamId = searchParams.get("teamId");
  const type = searchParams.get("type");
  const showAway = searchParams.get("showAway") === "true";

  const org = await prisma.organization.findFirst({
    select: { id: true, teamJobsPublicSignup: true },
  });
  if (!org) {
    return NextResponse.json([]);
  }

  const where: Record<string, unknown> = {
    OR: [
      { team: { organizationId: org.id } },
      { teamId: null },
    ],
    cancelledByBumpId: null,
  };

  if (startDate && endDate) {
    where.startTime = { gte: new Date(startDate) };
    where.endTime = { lte: new Date(endDate) };
  }

  if (teamId) where.teamId = teamId;
  if (type && type !== "ALL") where.type = type;
  if (!showAway) {
    where.NOT = { gameVenue: "AWAY" };
  }

  const events = await prisma.scheduleEvent.findMany({
    where,
    select: {
      id: true,
      title: true,
      type: true,
      startTime: true,
      endTime: true,
      customLocation: true,
      customLocationUrl: true,
      gameVenue: true,
      team: { select: { id: true, name: true, color: true, icon: true, headCoach: { select: { name: true } } } },
      subFacility: {
        select: {
          id: true,
          name: true,
          facility: { select: { id: true, name: true, googleMapsUrl: true } },
        },
      },
      gameJobs: {
        where: {
          isPublic: true,
          ...(org.teamJobsPublicSignup
            ? {}
            : { jobTemplate: { scope: { not: "TEAM" } } }),
        },
        select: {
          id: true,
          slotsNeeded: true,
          jobTemplate: { select: { name: true, scope: true } },
          assignments: {
            where: { cancelledAt: null },
            select: { id: true, name: true, playerName: true },
          },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const result = events.map((e) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    gameVenue: e.gameVenue,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    team: e.team ?? { id: "", name: "Club Event", color: "#6b7280", icon: null, headCoach: null },
    facility: e.subFacility
      ? `${e.subFacility.facility.name} – ${e.subFacility.name}`
      : e.customLocation || null,
    facilityId: e.subFacility?.facility.id ?? null,
    facilityUrl: e.subFacility?.facility.googleMapsUrl ?? e.customLocationUrl ?? null,
    openJobs: e.gameJobs.reduce((sum, j) => sum + Math.max(0, j.slotsNeeded - j.assignments.length), 0),
    jobs: e.gameJobs.map((j) => ({
      id: j.id,
      name: j.jobTemplate.name,
      slotsNeeded: j.slotsNeeded,
      filled: j.assignments.length,
      volunteers: j.assignments.map((a) => ({
        name: a.name || "Volunteer",
        playerName: a.playerName,
      })),
    })),
  }));

  return NextResponse.json(result);
}
