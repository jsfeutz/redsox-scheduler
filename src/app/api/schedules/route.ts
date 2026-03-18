import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  canManageSchedule,
  canBumpEvents,
  getTeamFilterForUser,
  canManageTeam,
  isOrgAdmin,
} from "@/lib/auth-helpers";
import { Prisma } from "@prisma/client";
import { RRule, Weekday } from "rrule";
import { createAutoJobs } from "@/lib/auto-jobs";
import { notifyScheduleChange, formatEventDate } from "@/lib/notify";

const eventInclude = {
  team: {
    select: {
      id: true,
      name: true,
      color: true,
      headCoach: { select: { id: true, name: true, email: true, phone: true } },
    },
  },
  subFacility: {
    include: {
      facility: { select: { id: true, name: true, googleMapsUrl: true } },
    },
  },
  gameJobs: {
    select: {
      id: true,
      slotsNeeded: true,
      isPublic: true,
      jobTemplate: { select: { name: true, scope: true } },
      assignments: {
        where: { cancelledAt: null },
        select: { id: true, name: true, playerName: true },
      },
    },
  },
} satisfies Prisma.ScheduleEventInclude;

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  const subFacilityId = searchParams.get("subFacilityId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const where: Prisma.ScheduleEventWhereInput = {
    cancelledByBumpId: null,
    OR: [
      { team: { organizationId: user.organizationId } },
      { teamId: null, subFacility: { facility: { organizationId: user.organizationId } } },
      { teamId: null, subFacilityId: null },
    ],
  };

  const teamFilter = await getTeamFilterForUser(user);
  if (teamFilter) {
    where.OR = [
      { ...teamFilter, team: { organizationId: user.organizationId } },
      { type: "CLUB_EVENT" },
    ];
  }

  if (teamId) where.teamId = teamId;
  if (subFacilityId) where.subFacilityId = subFacilityId;

  if (startDate && endDate) {
    where.startTime = { lt: new Date(endDate) };
    where.endTime = { gt: new Date(startDate) };
  } else if (startDate) {
    where.startTime = { gte: new Date(startDate) };
  } else if (endDate) {
    where.startTime = { lte: new Date(endDate) };
  }

  const events = await prisma.scheduleEvent.findMany({
    where,
    include: eventInclude,
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(events);
}

const JS_DAY_TO_RRULE: Record<number, Weekday> = {
  0: RRule.SU,
  1: RRule.MO,
  2: RRule.TU,
  3: RRule.WE,
  4: RRule.TH,
  5: RRule.FR,
  6: RRule.SA,
};

async function checkBlackout(
  orgId: string,
  eventStart: Date,
  eventEnd: Date,
  eventType: string,
  subFacilityId: string | null
): Promise<string | null> {
  const blackouts = await prisma.blackoutDate.findMany({
    where: {
      organizationId: orgId,
      startDate: { lte: eventEnd },
      endDate: { gte: eventStart },
      OR: [
        { scope: "ORG_WIDE" },
        ...(subFacilityId
          ? [
              {
                scope: "FACILITY" as const,
                facility: { subFacilities: { some: { id: subFacilityId } } },
              },
            ]
          : []),
      ],
    },
  });

  for (const b of blackouts) {
    const types = b.eventTypes.split(",").map((t) => t.trim());
    if (types.includes("ALL") || types.includes(eventType)) {
      return `Blackout: ${b.title} (${b.startDate.toLocaleDateString()} – ${b.endDate.toLocaleDateString()})`;
    }
  }
  return null;
}

async function tryPriorityBump(
  orgId: string,
  newTeamId: string | null,
  conflict: { id: string; teamId: string | null; title: string; startTime: Date },
  eventStart: Date,
  subFacilityId: string | null
): Promise<"bumped" | "no-rule" | "lower-priority"> {
  if (!newTeamId || !conflict.teamId) return "no-rule";

  const dayOfWeek = eventStart.getDay();

  const [newRules, conflictRules] = await Promise.all([
    prisma.schedulingRule.findMany({
      where: {
        organizationId: orgId,
        teamId: newTeamId,
        dayOfWeek,
        OR: [
          { subFacilityId: null },
          ...(subFacilityId ? [{ subFacilityId }] : []),
        ],
      },
      orderBy: { priority: "asc" },
    }),
    prisma.schedulingRule.findMany({
      where: {
        organizationId: orgId,
        teamId: conflict.teamId,
        dayOfWeek,
        OR: [
          { subFacilityId: null },
          ...(subFacilityId ? [{ subFacilityId }] : []),
        ],
      },
      orderBy: { priority: "asc" },
    }),
  ]);

  if (newRules.length === 0 || conflictRules.length === 0) return "no-rule";

  const newBest = newRules[0].priority;
  const conflictBest = conflictRules[0].priority;

  if (newBest < conflictBest) {
    await prisma.scheduleEvent.update({
      where: { id: conflict.id },
      data: { cancelledByBumpId: "pending" },
    });

    const bumpedTeam = await prisma.team.findUnique({
      where: { id: conflict.teamId },
      select: {
        name: true,
        headCoach: { select: { email: true, phone: true, name: true } },
      },
    });

    if (bumpedTeam?.headCoach) {
      notifyScheduleChange({
        eventId: conflict.id,
        changeType: "cancelled",
        eventTitle: `${conflict.title} (bumped by higher-priority team)`,
      }).catch((err) => console.error("[NOTIFY] Bump notification failed:", err));
    }

    return "bumped";
  }

  return "lower-priority";
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageSchedule(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    title,
    type,
    priority,
    startTime,
    endTime,
    notes,
    isRecurring,
    recurrenceFrequency,
    recurrenceDays,
    recurrenceUntil,
    teamId,
    subFacilityId,
    seasonId,
    customLocation,
    customLocationUrl,
    gameVenue,
    force,
    forceBlackout,
  } = body;

  const isClubEvent = type === "CLUB_EVENT";
  const isAwayGame = type === "GAME" && gameVenue === "AWAY";

  if (!title || !type || !startTime || !endTime) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (!isClubEvent && !isAwayGame && (!teamId || !subFacilityId)) {
    return NextResponse.json(
      { error: "Team and facility are required" },
      { status: 400 }
    );
  }

  if (isAwayGame && !teamId) {
    return NextResponse.json(
      { error: "Team is required for away games" },
      { status: 400 }
    );
  }

  if (isClubEvent && !isOrgAdmin(user.role)) {
    return NextResponse.json(
      { error: "Only admins can create club events" },
      { status: 403 }
    );
  }

  if (teamId && !(await canManageTeam(user, teamId))) {
    return NextResponse.json(
      { error: "You are not a member of this team" },
      { status: 403 }
    );
  }

  const newStart = new Date(startTime);
  const newEnd = new Date(endTime);
  const durationMs = newEnd.getTime() - newStart.getTime();

  if (durationMs <= 0) {
    return NextResponse.json(
      { error: "End time must be after start time" },
      { status: 400 }
    );
  }

  if (!forceBlackout) {
    const blackoutMsg = await checkBlackout(
      user.organizationId,
      newStart,
      newEnd,
      type,
      subFacilityId || null
    );
    if (blackoutMsg) {
      return NextResponse.json(
        { error: blackoutMsg, isBlackout: true },
        { status: 403 }
      );
    }
  }

  const wantsCustomLoc = (isClubEvent && !subFacilityId) || isAwayGame;
  const eventData = {
    title: title.trim(),
    type,
    priority: priority || "NORMAL",
    notes: notes?.trim() || null,
    teamId: teamId || null,
    subFacilityId: isAwayGame ? null : (subFacilityId || null),
    seasonId: seasonId || null,
    customLocation: wantsCustomLoc ? customLocation?.trim() || null : null,
    customLocationUrl: wantsCustomLoc ? customLocationUrl?.trim() || null : null,
    gameVenue: type === "GAME" ? (gameVenue || "HOME") : null,
  };

  if (isRecurring && Array.isArray(recurrenceDays) && recurrenceDays.length > 0) {
    let untilDate: Date;
    if (recurrenceUntil) {
      untilDate = new Date(recurrenceUntil + "T23:59:59");
    } else if (seasonId) {
      const season = await prisma.season.findUnique({
        where: { id: seasonId },
        select: { endDate: true },
      });
      untilDate = season?.endDate ?? new Date(newStart.getTime() + 6 * 30 * 24 * 60 * 60 * 1000);
    } else {
      untilDate = new Date(newStart.getTime() + 6 * 30 * 24 * 60 * 60 * 1000);
    }

    const interval = recurrenceFrequency === "BIWEEKLY" ? 2 : 1;
    const byweekday = (recurrenceDays as number[]).map((d: number) => JS_DAY_TO_RRULE[d]).filter(Boolean);

    const rule = new RRule({
      freq: RRule.WEEKLY,
      interval,
      byweekday,
      dtstart: newStart,
      until: untilDate,
    });

    const occurrences = rule.all();
    if (occurrences.length === 0) {
      return NextResponse.json(
        { error: "Recurrence rule produced no events" },
        { status: 400 }
      );
    }

    const MAX_OCCURRENCES = 200;
    if (occurrences.length > MAX_OCCURRENCES) {
      return NextResponse.json(
        { error: `Too many occurrences (${occurrences.length}). Max is ${MAX_OCCURRENCES}.` },
        { status: 400 }
      );
    }

    const recurrenceGroupId = crypto.randomUUID();
    const rruleString = rule.toString();

    const createdEvents = [];
    for (const occStart of occurrences) {
      const occEnd = new Date(occStart.getTime() + durationMs);

      if (subFacilityId && !force) {
        const conflict = await prisma.scheduleEvent.findFirst({
          where: {
            subFacilityId,
            cancelledByBumpId: null,
            startTime: { lt: occEnd },
            endTime: { gt: occStart },
          },
          include: eventInclude,
        });
        if (conflict) {
          continue;
        }
      }

      const event = await prisma.scheduleEvent.create({
        data: {
          ...eventData,
          startTime: occStart,
          endTime: occEnd,
          isRecurring: true,
          recurrenceRule: rruleString,
          recurrenceGroupId,
        },
        include: eventInclude,
      });

      await createAutoJobs({ ...event, gameVenue: event.gameVenue, organizationId: user.organizationId });
      createdEvents.push(event);
    }

    return NextResponse.json(
      { events: createdEvents, count: createdEvents.length, recurrenceGroupId },
      { status: 201 }
    );
  }

  if (subFacilityId) {
    const conflict = await prisma.scheduleEvent.findFirst({
      where: {
        subFacilityId,
        cancelledByBumpId: null,
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
      include: eventInclude,
    });

    if (conflict) {
      if (force && canBumpEvents(user.role)) {
        await prisma.scheduleEvent.delete({ where: { id: conflict.id } });
      } else {
        const bumpResult = await tryPriorityBump(
          user.organizationId,
          teamId || null,
          { id: conflict.id, teamId: conflict.teamId, title: conflict.title, startTime: conflict.startTime },
          newStart,
          subFacilityId
        );
        if (bumpResult === "bumped") {
          // event was bumped, continue creating
        } else {
          return NextResponse.json(
            { error: "Time conflict with existing event", conflict },
            { status: 409 }
          );
        }
      }
    }
  }

  const event = await prisma.scheduleEvent.create({
    data: {
      ...eventData,
      startTime: newStart,
      endTime: newEnd,
      isRecurring: false,
    },
    include: eventInclude,
  });

  await createAutoJobs({ ...event, gameVenue: event.gameVenue, organizationId: user.organizationId });

  return NextResponse.json(event, { status: 201 });
}
