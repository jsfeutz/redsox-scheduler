import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageVolunteers } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageVolunteers(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.volunteerSlot.findFirst({
    where: {
      id,
      scheduleEvent: { team: { organizationId: user.organizationId } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, description, slotsNeeded, durationMinutes, status } = body;

  const slot = await prisma.volunteerSlot.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && {
        description: description?.trim() || null,
      }),
      ...(slotsNeeded !== undefined && { slotsNeeded }),
      ...(durationMinutes !== undefined && { durationMinutes }),
      ...(status !== undefined && { status }),
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

  return NextResponse.json(slot);
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageVolunteers(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.volunteerSlot.findFirst({
    where: {
      id,
      scheduleEvent: { team: { organizationId: user.organizationId } },
    },
    include: { signups: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slot = await prisma.volunteerSlot.update({
    where: { id },
    data: { status: "COMPLETED" },
    include: { signups: true },
  });

  await prisma.volunteerSignup.updateMany({
    where: { volunteerSlotId: id },
    data: {
      isCompleted: true,
      hoursCompleted: existing.durationMinutes / 60,
    },
  });

  return NextResponse.json(slot);
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageVolunteers(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.volunteerSlot.findFirst({
    where: {
      id,
      scheduleEvent: { team: { organizationId: user.organizationId } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.volunteerSlot.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
