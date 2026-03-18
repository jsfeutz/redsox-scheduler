import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageSchedule } from "@/lib/auth-helpers";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageSchedule(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const gameJob = await prisma.gameJob.findFirst({
    where: { id, jobTemplate: { organizationId: user.organizationId } },
    include: {
      jobTemplate: { select: { hoursPerGame: true } },
      _count: { select: { assignments: { where: { cancelledAt: null } } } },
    },
  });
  if (!gameJob) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (gameJob._count.assignments >= gameJob.slotsNeeded) {
    return NextResponse.json(
      { error: "All slots are filled" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { userId, name, email } = body;

  if (!userId && !name) {
    return NextResponse.json(
      { error: "Either userId or name is required" },
      { status: 400 }
    );
  }

  if (userId) {
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, organizationId: user.organizationId },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
  }

  const hoursEarned = gameJob.overrideHoursPerGame ?? gameJob.jobTemplate.hoursPerGame;

  const assignment = await prisma.jobAssignment.create({
    data: {
      gameJobId: id,
      userId: userId || null,
      name: name?.trim() || null,
      email: email?.trim() || null,
      hoursEarned,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageSchedule(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { assignmentId } = body;

  if (!assignmentId) {
    return NextResponse.json(
      { error: "assignmentId is required" },
      { status: 400 }
    );
  }

  const assignment = await prisma.jobAssignment.findFirst({
    where: {
      id: assignmentId,
      gameJobId: id,
      gameJob: { jobTemplate: { organizationId: user.organizationId } },
    },
  });
  if (!assignment) {
    return NextResponse.json(
      { error: "Assignment not found" },
      { status: 404 }
    );
  }

  await prisma.jobAssignment.delete({ where: { id: assignmentId } });

  return NextResponse.json({ success: true });
}
