import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageTeam } from "@/lib/auth-helpers";
import { Prisma } from "@prisma/client";
import { sendSlotRequestResponse } from "@/lib/email";
import { createAutoJobs } from "@/lib/auto-jobs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body; // "approve" | "deny"

  if (!action || !["approve", "deny"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid action — must be 'approve' or 'deny'" },
      { status: 400 }
    );
  }

  const slotRequest = await prisma.slotRequest.findUnique({
    where: { id },
    include: {
      scheduleEvent: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              headCoach: { select: { email: true, name: true } },
              members: {
                where: { role: { in: ["HEAD_COACH", "TEAM_MANAGER"] } },
                include: { user: { select: { email: true, name: true } } },
              },
            },
          },
          subFacility: {
            include: { facility: { select: { name: true } } },
          },
        },
      },
      requestingTeam: {
        select: {
          id: true,
          name: true,
          headCoach: { select: { email: true, name: true } },
          members: {
            where: { role: { in: ["HEAD_COACH", "TEAM_MANAGER"] } },
            include: { user: { select: { email: true, name: true } } },
          },
        },
      },
      requestedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!slotRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (slotRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: "Request has already been responded to" },
      { status: 400 }
    );
  }

  if (slotRequest.scheduleEvent.teamId && !(await canManageTeam(user, slotRequest.scheduleEvent.teamId))) {
    return NextResponse.json(
      { error: "You are not authorized to respond to this request" },
      { status: 403 }
    );
  }

  if (action === "deny") {
    const updated = await prisma.slotRequest.update({
      where: { id },
      data: {
        status: "DENIED",
        respondedById: user.id,
        respondedAt: new Date(),
      },
    });

    const denyRecipients = new Map<string, string>();
    if (slotRequest.requestedBy.email) {
      denyRecipients.set(slotRequest.requestedBy.email, slotRequest.requestedBy.name);
    }
    if (slotRequest.requestingTeam.headCoach?.email) {
      denyRecipients.set(slotRequest.requestingTeam.headCoach.email, slotRequest.requestingTeam.headCoach.name ?? "Coach");
    }
    for (const m of slotRequest.requestingTeam.members) {
      if (m.user.email && !denyRecipients.has(m.user.email)) {
        denyRecipients.set(m.user.email, m.user.name ?? "Team Member");
      }
    }

    const denyEmails = Array.from(denyRecipients.entries()).map(([email, name]) =>
      sendSlotRequestResponse({
        to: email,
        recipientName: name,
        approved: false,
        eventTitle: slotRequest.scheduleEvent.title,
        eventDate: slotRequest.scheduleEvent.startTime.toISOString(),
        ownerTeamName: slotRequest.scheduleEvent.team?.name ?? "Unknown",
        requestingTeamName: slotRequest.requestingTeam.name,
        responderName: user.name,
      })
    );
    await Promise.allSettled(denyEmails);

    return NextResponse.json(updated);
  }

  // Approve: transfer the event to the requesting team
  const eventId = slotRequest.scheduleEventId;
  const newTeamId = slotRequest.requestingTeamId;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Update the slot request status
    await tx.slotRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        respondedById: user.id,
        respondedAt: new Date(),
      },
    });

    // Delete existing game jobs for this event (cascade handles assignments)
    await tx.gameJob.deleteMany({
      where: { scheduleEventId: eventId },
    });

    // Transfer the event to the new team
    await tx.scheduleEvent.update({
      where: { id: eventId },
      data: { teamId: newTeamId },
    });
  });

  // Re-run auto job creation for the new team context
  const updatedEvent = await prisma.scheduleEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      type: true,
      teamId: true,
      seasonId: true,
      subFacilityId: true,
    },
  });

  if (updatedEvent) {
    await createAutoJobs({ ...updatedEvent, organizationId: user.organizationId });
  }

  const approveRecipients = new Map<string, string>();
  if (slotRequest.requestedBy.email) {
    approveRecipients.set(slotRequest.requestedBy.email, slotRequest.requestedBy.name);
  }
  if (slotRequest.requestingTeam.headCoach?.email) {
    approveRecipients.set(slotRequest.requestingTeam.headCoach.email, slotRequest.requestingTeam.headCoach.name ?? "Coach");
  }
  for (const m of slotRequest.requestingTeam.members) {
    if (m.user.email && !approveRecipients.has(m.user.email)) {
      approveRecipients.set(m.user.email, m.user.name ?? "Team Member");
    }
  }
  if (slotRequest.scheduleEvent.team?.headCoach?.email) {
    approveRecipients.set(slotRequest.scheduleEvent.team.headCoach.email, slotRequest.scheduleEvent.team.headCoach.name ?? "Coach");
  }
  for (const m of slotRequest.scheduleEvent.team?.members ?? []) {
    if (m.user.email && !approveRecipients.has(m.user.email)) {
      approveRecipients.set(m.user.email, m.user.name ?? "Team Member");
    }
  }

  const approveEmails = Array.from(approveRecipients.entries()).map(([email, name]) =>
    sendSlotRequestResponse({
      to: email,
      recipientName: name,
      approved: true,
      eventTitle: slotRequest.scheduleEvent.title,
      eventDate: slotRequest.scheduleEvent.startTime.toISOString(),
      ownerTeamName: slotRequest.scheduleEvent.team?.name ?? "Unknown",
      requestingTeamName: slotRequest.requestingTeam.name,
      responderName: user.name,
    })
  );
  await Promise.allSettled(approveEmails);

  return NextResponse.json({ success: true, transferred: true });
}
