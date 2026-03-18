import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageVolunteers } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const scheduleEventId = searchParams.get("scheduleEventId");

  const slots = await prisma.volunteerSlot.findMany({
    where: {
      scheduleEvent: { team: { organizationId: user.organizationId } },
      ...(scheduleEventId ? { scheduleEventId } : {}),
    },
    include: {
      signups: {
        select: {
          id: true,
          name: true,
          email: true,
          hoursCompleted: true,
          isCompleted: true,
        },
      },
      scheduleEvent: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          team: { select: { id: true, name: true, color: true } },
          subFacility: {
            include: { facility: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: { scheduleEvent: { startTime: "asc" } },
  });

  return NextResponse.json(slots);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageVolunteers(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, slotsNeeded, durationMinutes, scheduleEventId } =
    body;

  if (!name || !scheduleEventId) {
    return NextResponse.json(
      { error: "Name and scheduleEventId are required" },
      { status: 400 }
    );
  }

  const event = await prisma.scheduleEvent.findFirst({
    where: {
      id: scheduleEventId,
      team: { organizationId: user.organizationId },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const slot = await prisma.volunteerSlot.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      slotsNeeded: slotsNeeded || 1,
      durationMinutes: durationMinutes || 120,
      scheduleEventId,
    },
    include: {
      signups: true,
      scheduleEvent: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          team: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });

  return NextResponse.json(slot, { status: 201 });
}
