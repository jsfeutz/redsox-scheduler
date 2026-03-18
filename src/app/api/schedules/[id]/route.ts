import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  canManageSchedule,
  canBumpEvents,
  canManageTeam,
  isOrgAdmin,
} from "@/lib/auth-helpers";
import { Prisma } from "@prisma/client";
import { notifyScheduleChange, formatEventDate } from "@/lib/notify";

const eventInclude = {
  team: { select: { id: true, name: true, color: true } },
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
  if (!canManageSchedule(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.scheduleEvent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    force,
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
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
      include: eventInclude,
    });

    if (conflict) {
      if (force && canBumpEvents(user.role)) {
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
    },
    include: eventInclude,
  });

  const timeChanged =
    existing.startTime.getTime() !== newStart.getTime() ||
    existing.endTime.getTime() !== newEnd.getTime();
  if (timeChanged) {
    const loc = event.subFacility
      ? `${event.subFacility.facility.name} – ${event.subFacility.name}`
      : undefined;
    notifyScheduleChange({
      eventId: id,
      changeType: "updated",
      eventTitle: title.trim(),
      oldTime: formatEventDate(existing.startTime),
      newTime: formatEventDate(newStart),
      location: loc,
    }).catch((err) => console.error("[NOTIFY] Schedule change failed:", err));
  }

  return NextResponse.json(event);
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageSchedule(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.scheduleEvent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  notifyScheduleChange({
    eventId: id,
    changeType: "cancelled",
    eventTitle: existing.title,
  }).catch((err) => console.error("[NOTIFY] Schedule cancel notify failed:", err));

  await prisma.scheduleEvent.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
