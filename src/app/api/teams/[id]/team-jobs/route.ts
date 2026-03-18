import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageTeam } from "@/lib/auth-helpers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: teamId } = await params;

  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId: user.organizationId },
  });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const teamJobs = await prisma.gameJob.findMany({
    where: { teamId, scheduleEventId: null },
    include: {
      jobTemplate: { select: { id: true, name: true, hoursPerGame: true, description: true } },
      assignments: {
        where: { cancelledAt: null },
        select: { id: true, name: true, email: true, hoursEarned: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(teamJobs);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: teamId } = await params;

  if (!(await canManageTeam(user, teamId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId: user.organizationId },
  });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const body = await req.json();
  const { jobTemplateId, name, email } = body;

  if (!jobTemplateId) {
    return NextResponse.json({ error: "jobTemplateId is required" }, { status: 400 });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const template = await prisma.jobTemplate.findFirst({
    where: {
      id: jobTemplateId,
      organizationId: user.organizationId,
      scope: "TEAM",
    },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  let gameJob = await prisma.gameJob.findFirst({
    where: { jobTemplateId, teamId, scheduleEventId: null },
    include: { _count: { select: { assignments: { where: { cancelledAt: null } } } } },
  });

  if (!gameJob) {
    gameJob = await prisma.gameJob.create({
      data: {
        jobTemplateId,
        teamId,
        slotsNeeded: template.maxSlots,
        isPublic: false,
      },
      include: { _count: { select: { assignments: { where: { cancelledAt: null } } } } },
    });
  }

  if (gameJob._count.assignments >= gameJob.slotsNeeded) {
    return NextResponse.json(
      { error: "All slots for this job are filled" },
      { status: 400 }
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { teamJobsCountHours: true },
  });

  const hoursEarned = org?.teamJobsCountHours ? template.hoursPerGame : 0;

  const assignment = await prisma.jobAssignment.create({
    data: {
      gameJobId: gameJob.id,
      name: name.trim(),
      email: email?.trim() || null,
      hoursEarned,
    },
    select: { id: true, name: true, email: true, hoursEarned: true },
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

  const { id: teamId } = await params;

  if (!(await canManageTeam(user, teamId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { assignmentId } = body;

  if (!assignmentId) {
    return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
  }

  const assignment = await prisma.jobAssignment.findFirst({
    where: {
      id: assignmentId,
      gameJob: {
        teamId,
        scheduleEventId: null,
        jobTemplate: { organizationId: user.organizationId },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  await prisma.jobAssignment.delete({ where: { id: assignmentId } });

  return NextResponse.json({ success: true });
}
