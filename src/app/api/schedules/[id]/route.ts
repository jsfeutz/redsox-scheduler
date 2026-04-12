import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  canBumpEvents,
  canManageTeam,
  isOrgAdmin,
  canMutateExistingScheduleEvent,
} from "@/lib/auth-helpers";
import { Prisma } from "@prisma/client";
import { formatEventDate, dispatchEventNotification, notifySignedUpVolunteers } from "@/lib/notify";
import { createAutoJobs } from "@/lib/auto-jobs";
import { syncScheduleEventTaggedTeams } from "@/lib/schedule-event-tags";
import {
  logScheduleEventAudit,
  snapshotScheduleEvent,
} from "@/lib/schedule-event-audit";

const eventInclude = {
  team: { select: { id: true, name: true, color: true } },
  taggedTeams: {
    include: {
      team: { select: { id: true, name: true, color: true } },
    },
  },
  subFacility: {
    include: {
      facility: { select: { id: true, name: true, googleMapsUrl: true } },
    },
  },
} satisfies Prisma.ScheduleEventInclude;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = await prisma.scheduleEvent.findUnique({
    where: { id },
    include: {
      ...eventInclude,
      season: { select: { id: true, name: true } },
      gameJobs: true,
      volunteerSlots: true,
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (event.teamId && !(await canManageTeam(user, event.teamId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(event);
}

export async function PUT(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.scheduleEvent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await canMutateExistingScheduleEvent(user, existing.teamId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (existing.teamId && !(await canManageTeam(user, existing.teamId))) {
    return NextResponse.json(
      { error: "You are not a member of this team" },
      { status: 403 }
    );
  }

  if (!existing.teamId && !isOrgAdmin(user.role)) {
    return NextResponse.json(
      { error: "Only admins can edit club events" },
      { status: 403 }
    );
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
    recurrenceRule,
    teamId,
    subFacilityId,
    seasonId,
    customLocation,
    customLocationUrl,
    gameVenue,
    noJobs,
    force,
    taggedTeamIds: rawTaggedTeamIds,
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
      { error: "Team and facility required for non-club events" },
      { status: 400 }
    );
  }

  if (teamId && teamId !== existing.teamId && !(await canManageTeam(user, teamId))) {
    return NextResponse.json(
      { error: "You are not a member of the target team" },
      { status: 403 }
    );
  }

  const newStart = new Date(startTime);
  const newEnd = new Date(endTime);

  if (newEnd <= newStart) {
    return NextResponse.json(
      { error: "End time must be after start time" },
      { status: 400 }
    );
  }

  if (subFacilityId) {
    const conflict = await prisma.scheduleEvent.findFirst({
      where: {
        subFacilityId,
        id: { not: id },
        cancelledByBumpId: null,
        cancelledAt: null,
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
      include: eventInclude,
    });

    if (conflict) {
      if (force && canBumpEvents(user.role)) {
        await logScheduleEventAudit(prisma, {
          organizationId: user.organizationId,
          scheduleEventId: conflict.id,
          action: "DELETE",
          actorUserId: user.id,
          actorLabel: user.name || user.email,
          summary: `Event deleted (forced slot on edit): ${conflict.title}`,
          before: snapshotScheduleEvent({
            id: conflict.id,
            title: conflict.title,
            type: conflict.type,
            priority: conflict.priority,
            startTime: conflict.startTime,
            endTime: conflict.endTime,
            notes: conflict.notes,
            isRecurring: conflict.isRecurring,
            recurrenceRule: conflict.recurrenceRule,
            recurrenceGroupId: conflict.recurrenceGroupId,
            teamId: conflict.teamId,
            subFacilityId: conflict.subFacilityId,
            seasonId: conflict.seasonId,
            customLocation: conflict.customLocation,
            customLocationUrl: conflict.customLocationUrl,
            gameVenue: conflict.gameVenue,
            noJobs: conflict.noJobs,
            cancelledAt: conflict.cancelledAt,
            cancelledBy: conflict.cancelledBy,
            cancelledByBumpId: conflict.cancelledByBumpId,
          }),
          meta: { reason: "force_bump_edit_event", editingEventId: id },
        });
        await prisma.scheduleEvent.delete({ where: { id: conflict.id } });
      } else {
        return NextResponse.json(
          { error: "Time conflict with existing event", conflict },
          { status: 409 }
        );
      }
    }
  }

  const wantsCustomLoc = (isClubEvent && !subFacilityId) || isAwayGame;
  const beforeSnap = snapshotScheduleEvent({
    id: existing.id,
    title: existing.title,
    type: existing.type,
    priority: existing.priority,
    startTime: existing.startTime,
    endTime: existing.endTime,
    notes: existing.notes,
    isRecurring: existing.isRecurring,
    recurrenceRule: existing.recurrenceRule,
    recurrenceGroupId: existing.recurrenceGroupId,
    teamId: existing.teamId,
    subFacilityId: existing.subFacilityId,
    seasonId: existing.seasonId,
    customLocation: existing.customLocation,
    customLocationUrl: existing.customLocationUrl,
    gameVenue: existing.gameVenue,
    noJobs: existing.noJobs,
    cancelledAt: existing.cancelledAt,
    cancelledBy: existing.cancelledBy,
    cancelledByBumpId: existing.cancelledByBumpId,
  });

  const event = await prisma.scheduleEvent.update({
    where: { id },
    data: {
      title: title.trim(),
      type,
      priority: priority || "NORMAL",
      startTime: newStart,
      endTime: newEnd,
      notes: notes?.trim() || null,
      isRecurring: isRecurring || false,
      recurrenceRule: recurrenceRule?.trim() || null,
      teamId: teamId || null,
      subFacilityId: isAwayGame ? null : (subFacilityId || null),
      seasonId: seasonId || null,
      customLocation: wantsCustomLoc ? customLocation?.trim() || null : null,
      customLocationUrl: wantsCustomLoc ? customLocationUrl?.trim() || null : null,
      gameVenue: type === "GAME" ? (gameVenue || "HOME") : null,
      noJobs: !!noJobs,
    },
    include: eventInclude,
  });

  await logScheduleEventAudit(prisma, {
    organizationId: user.organizationId,
    scheduleEventId: id,
    recurrenceGroupId: event.recurrenceGroupId,
    action: "UPDATE",
    actorUserId: user.id,
    actorLabel: user.name || user.email,
    summary: `Updated event: ${event.title}`,
    before: beforeSnap,
    after: snapshotScheduleEvent({
      id: event.id,
      title: event.title,
      type: event.type,
      priority: event.priority,
      startTime: event.startTime,
      endTime: event.endTime,
      notes: event.notes,
      isRecurring: event.isRecurring,
      recurrenceRule: event.recurrenceRule,
      recurrenceGroupId: event.recurrenceGroupId,
      teamId: event.teamId,
      subFacilityId: event.subFacilityId,
      seasonId: event.seasonId,
      customLocation: event.customLocation,
      customLocationUrl: event.customLocationUrl,
      gameVenue: event.gameVenue,
      noJobs: event.noJobs,
      cancelledAt: event.cancelledAt,
      cancelledBy: event.cancelledBy,
      cancelledByBumpId: event.cancelledByBumpId,
    }),
  });

  const noJobsEnabled = !!noJobs;
  const noJobsToggled = noJobsEnabled !== !!existing.noJobs;
  const switchedToAway = isAwayGame && existing.gameVenue !== "AWAY";
  const switchedToHome = !isAwayGame && existing.gameVenue === "AWAY" && type === "GAME";

  if (switchedToAway || (noJobsToggled && noJobsEnabled)) {
    await prisma.gameJob.deleteMany({
      where: { scheduleEventId: id },
    });
  } else if ((switchedToHome || (noJobsToggled && !noJobsEnabled)) && !isAwayGame) {
    await createAutoJobs({
      id,
      type,
      teamId: teamId || null,
      seasonId: seasonId || null,
      subFacilityId: subFacilityId || null,
      gameVenue: gameVenue || "HOME",
      organizationId: user.organizationId,
    });
  }

  const timeChanged =
    existing.startTime.getTime() !== newStart.getTime() ||
    existing.endTime.getTime() !== newEnd.getTime();
  if (timeChanged) {
    const loc = event.subFacility
      ? `${event.subFacility.facility.name} – ${event.subFacility.name}`
      : undefined;

    dispatchEventNotification({
      eventId: id,
      trigger: "EVENT_TIME_CHANGED",
      organizationId: user.organizationId,
      teamId: teamId || null,
      eventTitle: title.trim(),
      eventDate: formatEventDate(newStart),
      oldTime: formatEventDate(existing.startTime),
      newTime: formatEventDate(newStart),
      teamName: event.team?.name,
      location: loc,
    }).catch((err) => console.error("[NOTIFY] Dispatch EVENT_TIME_CHANGED failed:", err));

    notifySignedUpVolunteers({
      eventId: id,
      changeType: "time_changed",
      eventTitle: title.trim(),
      eventDate: formatEventDate(newStart),
      oldTime: formatEventDate(existing.startTime),
      newTime: formatEventDate(newStart),
      location: loc,
    }).catch((err) => console.error("[NOTIFY] Volunteer time-change notify failed:", err));
  }

  if ("taggedTeamIds" in body) {
    const taggedTeamIds = Array.isArray(rawTaggedTeamIds)
      ? rawTaggedTeamIds.filter((x: unknown) => typeof x === "string")
      : [];
    await syncScheduleEventTaggedTeams(
      id,
      teamId || null,
      user.organizationId,
      taggedTeamIds
    );
    const refreshed = await prisma.scheduleEvent.findUnique({
      where: { id },
      include: eventInclude,
    });
    return NextResponse.json(refreshed ?? event);
  }

  return NextResponse.json(event);
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.scheduleEvent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await canMutateExistingScheduleEvent(user, existing.teamId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (existing.teamId && !(await canManageTeam(user, existing.teamId))) {
    return NextResponse.json(
      { error: "You are not a member of this team" },
      { status: 403 }
    );
  }

  if (!existing.teamId && !isOrgAdmin(user.role)) {
    return NextResponse.json(
      { error: "Only admins can delete club events" },
      { status: 403 }
    );
  }

  const fullEvent = await prisma.scheduleEvent.findUnique({
    where: { id },
    include: {
      team: { select: { name: true } },
      subFacility: { include: { facility: { select: { name: true } } } },
      gameJobs: {
        select: {
          jobTemplate: { select: { name: true } },
          assignments: {
            where: { cancelledAt: null },
            select: { name: true, email: true },
          },
        },
      },
    },
  });

  const teamName = fullEvent?.team?.name ?? null;
  const location = fullEvent?.subFacility
    ? `${fullEvent.subFacility.facility.name} – ${fullEvent.subFacility.name}`
    : null;

  const volunteers = (fullEvent?.gameJobs ?? []).flatMap((j) =>
    j.assignments.map((a) => ({
      jobName: j.jobTemplate.name,
      name: a.name,
      email: a.email,
    }))
  );

  dispatchEventNotification({
    eventId: id,
    trigger: "EVENT_CANCELLED",
    organizationId: user.organizationId,
    teamId: existing.teamId,
    eventTitle: existing.title,
    eventDate: formatEventDate(existing.startTime),
    teamName,
    location,
    volunteers,
  }).catch((err) => console.error("[NOTIFY] Dispatch EVENT_CANCELLED failed:", err));

  notifySignedUpVolunteers({
    eventId: id,
    changeType: "cancelled",
    eventTitle: existing.title,
    eventDate: formatEventDate(existing.startTime),
    location,
  }).catch((err) => console.error("[NOTIFY] Volunteer cancellation notify failed:", err));

  await logScheduleEventAudit(prisma, {
    organizationId: user.organizationId,
    scheduleEventId: id,
    recurrenceGroupId: existing.recurrenceGroupId,
    action: "REMOVE",
    actorUserId: user.id,
    actorLabel: user.name || user.email,
    summary: `Cancelled event: ${existing.title}`,
    before: snapshotScheduleEvent({
      id: existing.id,
      title: existing.title,
      type: existing.type,
      priority: existing.priority,
      startTime: existing.startTime,
      endTime: existing.endTime,
      notes: existing.notes,
      isRecurring: existing.isRecurring,
      recurrenceRule: existing.recurrenceRule,
      recurrenceGroupId: existing.recurrenceGroupId,
      teamId: existing.teamId,
      subFacilityId: existing.subFacilityId,
      seasonId: existing.seasonId,
      customLocation: existing.customLocation,
      customLocationUrl: existing.customLocationUrl,
      gameVenue: existing.gameVenue,
      noJobs: existing.noJobs,
      cancelledAt: existing.cancelledAt,
      cancelledBy: existing.cancelledBy,
      cancelledByBumpId: existing.cancelledByBumpId,
    }),
    meta: { softCancel: true },
  });

  await prisma.scheduleEvent.update({
    where: { id },
    data: {
      cancelledAt: new Date(),
      cancelledBy: user.name || user.email,
    },
  });

  return NextResponse.json({ success: true });
}
