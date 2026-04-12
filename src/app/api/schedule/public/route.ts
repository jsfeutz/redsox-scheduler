import { NextResponse } from "next/server";
import { EventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const EVENT_TYPE_VALUES: EventType[] = [
  "GAME",
  "PRACTICE",
  "OTHER",
  "CLUB_EVENT",
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const teamId = searchParams.get("teamId");
    const subFacilityIdParam = searchParams.get("subFacilityId");
    const type = searchParams.get("type");
    /** Omit or true = include away games; only `false` hides them (matches public UI default). */
    const showAway = searchParams.get("showAway") !== "false";

    const org = await prisma.organization.findFirst({
      select: { id: true, teamJobsPublicSignup: true },
    });
    if (!org) {
      return NextResponse.json([]);
    }

    const orgTeamIds = (
      await prisma.team.findMany({
        where: { organizationId: org.id },
        select: { id: true },
      })
    ).map((t) => t.id);

    /**
     * Scope by org without relying only on `team.organizationId` joins (clearer SQL, avoids
     * edge cases with relation resolution). Club/org-wide events use `teamId: null`.
     */
    const orgScope: Prisma.ScheduleEventWhereInput =
      orgTeamIds.length === 0
        ? { teamId: null }
        : { OR: [{ teamId: null }, { teamId: { in: orgTeamIds } }] };

    const andConditions: Prisma.ScheduleEventWhereInput[] = [
      orgScope,
      { cancelledByBumpId: null },
      { cancelledAt: null },
    ];

    /** Same overlap as GET /api/schedules (interval intersection, not containment). */
    if (startDate && endDate) {
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate);
      andConditions.push({ startTime: { lt: rangeEnd } });
      andConditions.push({ endTime: { gt: rangeStart } });
    }

    if (teamId) andConditions.push({ teamId });

    if (subFacilityIdParam) {
      const subOk = await prisma.subFacility.findFirst({
        where: {
          id: subFacilityIdParam,
          facility: { organizationId: org.id },
        },
        select: { id: true },
      });
      if (subOk) andConditions.push({ subFacilityId: subFacilityIdParam });
    }

    if (type && type !== "ALL" && EVENT_TYPE_VALUES.includes(type as EventType)) {
      andConditions.push({ type: type as EventType });
    }

    /**
     * Only hide true away games. Safe for NULL/empty gameVenue on non-AWAY rows (unlike
     * `NOT: { gameVenue: "AWAY" }` alone, which drops NULLs in SQL).
     */
    if (!showAway) {
      andConditions.push({
        NOT: {
          AND: [{ type: "GAME" }, { gameVenue: "AWAY" }],
        },
      });
    }

    const where: Prisma.ScheduleEventWhereInput = { AND: andConditions };

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
        team: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
            headCoach: { select: { name: true } },
          },
        },
        subFacility: {
          select: {
            id: true,
            name: true,
            facility: { select: { id: true, name: true, color: true, googleMapsUrl: true } },
          },
        },
        gameJobs: {
          where: {
            isPublic: true,
            disabled: false,
            ...(org.teamJobsPublicSignup
              ? {}
              : { jobTemplate: { scope: { not: "TEAM" } } }),
          },
          select: {
            id: true,
            slotsNeeded: true,
            overrideName: true,
            overrideDescription: true,
            jobTemplate: {
              select: { name: true, description: true, scope: true, askComfortLevel: true },
            },
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
      team: e.team ?? {
        id: "",
        name: "Club Event",
        color: "#6b7280",
        icon: null,
        headCoach: null,
      },
      facility: e.subFacility
        ? `${e.subFacility.facility.name} – ${e.subFacility.name}`
        : e.customLocation || null,
      facilityId: e.subFacility?.facility.id ?? null,
      facilityColor: e.subFacility?.facility.color?.toLowerCase() === "#64748b" ? null : (e.subFacility?.facility.color ?? null),
      facilityUrl:
        e.subFacility?.facility.googleMapsUrl ?? e.customLocationUrl ?? null,
      openJobs: e.gameJobs.reduce(
        (sum, j) => sum + Math.max(0, j.slotsNeeded - j.assignments.length),
        0
      ),
      jobs: e.gameJobs
        .filter((j) => j.jobTemplate)
        .map((j) => ({
          id: j.id,
          name: j.overrideName || j.jobTemplate!.name,
          description: j.overrideDescription || j.jobTemplate!.description || null,
          slotsNeeded: j.slotsNeeded,
          filled: j.assignments.length,
          askComfortLevel: j.jobTemplate!.askComfortLevel,
          volunteers: j.assignments.map((a) => ({
            name: a.name || "Volunteer",
            playerName: a.playerName,
          })),
        })),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/schedule/public]", err);
    return NextResponse.json(
      {
        error: "Failed to load public schedule",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
