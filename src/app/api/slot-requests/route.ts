import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageTeam, getUserTeamIds } from "@/lib/auth-helpers";
import { UserRole } from "@prisma/client";
import { sendSlotRequestNotification } from "@/lib/email";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const direction = searchParams.get("direction"); // "incoming" | "outgoing"

  const teamIds =
    user.role === UserRole.ADMIN
      ? undefined
      : await getUserTeamIds(user.id);

  const include = {
    scheduleEvent: {
      include: {
        team: { select: { id: true, name: true, color: true } },
        subFacility: {
          include: { facility: { select: { id: true, name: true } } },
        },
      },
    },
    requestingTeam: { select: { id: true, name: true, color: true } },
    requestedBy: { select: { id: true, name: true } },
    respondedBy: { select: { id: true, name: true } },
  };

  if (direction === "incoming") {
    const where = teamIds
      ? { scheduleEvent: { teamId: { in: teamIds } } }
      : { scheduleEvent: { team: { organizationId: user.organizationId } } };

    const requests = await prisma.slotRequest.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  }

  if (direction === "outgoing") {
    const where = teamIds
      ? { requestingTeamId: { in: teamIds } }
      : { requestingTeam: { organizationId: user.organizationId } };

    const requests = await prisma.slotRequest.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  }

  // Return both incoming and outgoing
  const [incoming, outgoing] = await Promise.all([
    prisma.slotRequest.findMany({
      where: teamIds
        ? { scheduleEvent: { teamId: { in: teamIds } } }
        : { scheduleEvent: { team: { organizationId: user.organizationId } } },
      include,
      orderBy: { createdAt: "desc" },
    }),
    prisma.slotRequest.findMany({
      where: teamIds
        ? { requestingTeamId: { in: teamIds } }
        : { requestingTeam: { organizationId: user.organizationId } },
      include,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Deduplicate
  const seen = new Set<string>();
  const all = [...incoming, ...outgoing].filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return NextResponse.json(all);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { scheduleEventId, requestingTeamId, reason } = body;

  if (!scheduleEventId || !requestingTeamId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (!(await canManageTeam(user, requestingTeamId))) {
    return NextResponse.json(
      { error: "You are not a member of the requesting team" },
      { status: 403 }
    );
  }

  const event = await prisma.scheduleEvent.findUnique({
    where: { id: scheduleEventId },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          headCoachId: true,
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
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.teamId === requestingTeamId) {
    return NextResponse.json(
      { error: "Cannot request your own team's slot" },
      { status: 400 }
    );
  }

  const existing = await prisma.slotRequest.findFirst({
    where: {
      scheduleEventId,
      requestingTeamId,
      status: "PENDING",
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A pending request already exists for this slot" },
      { status: 409 }
    );
  }

  const requestingTeam = await prisma.team.findUnique({
    where: { id: requestingTeamId },
    select: { name: true },
  });

  const slotRequest = await prisma.slotRequest.create({
    data: {
      scheduleEventId,
      requestingTeamId,
      requestedById: user.id,
      reason: reason?.trim() || null,
    },
  });

  const ownerRecipients = new Map<string, string>();
  if (event.team?.headCoach?.email) {
    ownerRecipients.set(event.team.headCoach.email, event.team.headCoach.name ?? "Coach");
  }
  for (const m of event.team?.members ?? []) {
    if (m.user.email && !ownerRecipients.has(m.user.email)) {
      ownerRecipients.set(m.user.email, m.user.name ?? "Coach");
    }
  }

  const emailPromises = Array.from(ownerRecipients.entries()).map(([email, name]) =>
    sendSlotRequestNotification({
      to: email,
      recipientName: name,
      requestingTeamName: requestingTeam?.name ?? "Unknown",
      requesterName: user.name,
      eventTitle: event.title,
      eventDate: event.startTime.toISOString(),
      facilityName: event.subFacility ? `${event.subFacility.facility.name} — ${event.subFacility.name}` : "N/A",
      reason: reason?.trim() || null,
      requestId: slotRequest.id,
    })
  );
  await Promise.allSettled(emailPromises);

  return NextResponse.json(slotRequest, { status: 201 });
}
