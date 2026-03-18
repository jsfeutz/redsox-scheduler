import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const { volunteerSlotId, name, email } = body;

  if (!volunteerSlotId || !name?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: "volunteerSlotId, name, and email are required" },
      { status: 400 }
    );
  }

  const slot = await prisma.volunteerSlot.findUnique({
    where: { id: volunteerSlotId },
    include: {
      signups: true,
      scheduleEvent: {
        select: { team: { select: { organizationId: true } } },
      },
    },
  });

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  if (slot.status !== "OPEN") {
    return NextResponse.json(
      { error: "This slot is no longer accepting signups" },
      { status: 400 }
    );
  }

  if (slot.signups.length >= slot.slotsNeeded) {
    return NextResponse.json(
      { error: "This slot is already full" },
      { status: 400 }
    );
  }

  const duplicate = slot.signups.find(
    (s) => s.email.toLowerCase() === email.trim().toLowerCase()
  );
  if (duplicate) {
    return NextResponse.json(
      { error: "You have already signed up for this slot" },
      { status: 400 }
    );
  }

  const orgId = slot.scheduleEvent.team?.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "Event has no team" }, { status: 400 });
  }

  const parent = await prisma.volunteerParent.findUnique({
    where: {
      email_organizationId: {
        email: email.trim().toLowerCase(),
        organizationId: orgId,
      },
    },
  });

  const signup = await prisma.volunteerSignup.create({
    data: {
      volunteerSlotId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      volunteerParentId: parent?.id ?? null,
    },
  });

  const updatedSignupCount = slot.signups.length + 1;
  if (updatedSignupCount >= slot.slotsNeeded) {
    await prisma.volunteerSlot.update({
      where: { id: volunteerSlotId },
      data: { status: "FILLED" },
    });
  }

  return NextResponse.json(signup, { status: 201 });
}
