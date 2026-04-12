import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageSchedule, getCurrentUser } from "@/lib/auth-helpers";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageSchedule(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const { assignmentId, playerId } = (body ?? {}) as {
    assignmentId?: string;
    playerId?: string | null;
  };

  if (!assignmentId) {
    return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
  }

  // Ensure the assignment is in the user's org.
  const assignment = await prisma.jobAssignment.findFirst({
    where: {
      id: assignmentId,
      cancelledAt: null,
      gameJob: {
        OR: [
          { scheduleEvent: { team: { organizationId: user.organizationId } } },
          { scheduleEvent: { subFacility: { facility: { organizationId: user.organizationId } } } },
          { scheduleEventId: null, jobTemplate: { organizationId: user.organizationId } },
        ],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  if (!playerId) {
    const updated = await prisma.jobAssignment.update({
      where: { id: assignment.id },
      data: { playerName: null, playerVolunteerId: null },
      select: { id: true, playerName: true, playerVolunteerId: true },
    });
    return NextResponse.json(updated);
  }

  const player = await prisma.player.findFirst({
    where: { id: playerId, team: { organizationId: user.organizationId } },
    select: { id: true, name: true },
  });
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const volunteerName = assignment.name?.trim() || "Volunteer";
  const volunteerEmail = assignment.email?.trim() || null;

  const existing = volunteerEmail
    ? await prisma.playerVolunteer.findFirst({
        where: { playerId: player.id, email: { equals: volunteerEmail, mode: "insensitive" } },
        select: { id: true },
      })
    : await prisma.playerVolunteer.findFirst({
        where: { playerId: player.id, name: volunteerName },
        select: { id: true },
      });

  const pv =
    existing ??
    (await prisma.playerVolunteer.create({
      data: { playerId: player.id, name: volunteerName, email: volunteerEmail },
      select: { id: true },
    }));

  const updated = await prisma.jobAssignment.update({
    where: { id: assignment.id },
    data: {
      playerName: player.name,
      playerVolunteerId: pv.id,
    },
    select: { id: true, playerName: true, playerVolunteerId: true },
  });

  return NextResponse.json(updated);
}

