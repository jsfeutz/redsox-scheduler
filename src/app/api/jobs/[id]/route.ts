import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageSchedule } from "@/lib/auth-helpers";
import { logScheduleEventAudit } from "@/lib/schedule-event-audit";

export async function PUT(
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

  const existing = await prisma.gameJob.findFirst({
    where: { id, jobTemplate: { organizationId: user.organizationId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const body = await req.json();
  const {
    slotsNeeded,
    isPublic,
    overrideName,
    overrideDescription,
    overrideHoursPerGame,
    disabled,
  } = body;

  if (typeof slotsNeeded === "number" && slotsNeeded >= 1) {
    const assignedCount = await prisma.jobAssignment.count({
      where: { gameJobId: id, cancelledAt: null },
    });
    if (slotsNeeded < assignedCount) {
      return NextResponse.json(
        { error: `Cannot reduce below ${assignedCount} assigned volunteers. Unassign someone first.` },
        { status: 400 }
      );
    }
  }

  const gameJob = await prisma.gameJob.update({
    where: { id },
    data: {
      slotsNeeded: typeof slotsNeeded === "number" ? slotsNeeded : undefined,
      isPublic: typeof isPublic === "boolean" ? isPublic : undefined,
      disabled: typeof disabled === "boolean" ? disabled : undefined,
      overrideName: overrideName !== undefined ? (overrideName?.trim() || null) : undefined,
      overrideDescription: overrideDescription !== undefined ? (overrideDescription?.trim() || null) : undefined,
      overrideHoursPerGame: overrideHoursPerGame !== undefined
        ? (typeof overrideHoursPerGame === "number" ? overrideHoursPerGame : null)
        : undefined,
    },
    include: {
      jobTemplate: true,
      assignments: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  const jobName = gameJob.overrideName || gameJob.jobTemplate.name;
  const action = typeof disabled === "boolean" && disabled ? "JOB_DISABLE" as const : "JOB_UPDATE" as const;
  await logScheduleEventAudit(prisma, {
    organizationId: user.organizationId,
    scheduleEventId: existing.scheduleEventId,
    action,
    actorUserId: user.id,
    actorLabel: `${user.name} (${user.email})`,
    summary: action === "JOB_DISABLE" ? `Disabled job: ${jobName}` : `Updated job: ${jobName}`,
    meta: { jobId: id, templateName: gameJob.jobTemplate.name },
  });

  return NextResponse.json(gameJob);
}

export async function PATCH(
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

  const existing = await prisma.gameJob.findFirst({
    where: { id, jobTemplate: { organizationId: user.organizationId } },
    include: { jobTemplate: { select: { name: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const body = await req.json();
  const newDisabled = typeof body.disabled === "boolean" ? body.disabled : !existing.disabled;
  const gameJob = await prisma.gameJob.update({
    where: { id },
    data: { disabled: newDisabled },
  });

  const jobName = existing.overrideName || existing.jobTemplate.name;
  await logScheduleEventAudit(prisma, {
    organizationId: user.organizationId,
    scheduleEventId: existing.scheduleEventId,
    action: newDisabled ? "JOB_DISABLE" : "JOB_UPDATE",
    actorUserId: user.id,
    actorLabel: `${user.name} (${user.email})`,
    summary: newDisabled ? `Disabled job: ${jobName}` : `Re-enabled job: ${jobName}`,
    meta: { jobId: id },
  });

  return NextResponse.json(gameJob);
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

  const existing = await prisma.gameJob.findFirst({
    where: { id, jobTemplate: { organizationId: user.organizationId } },
    include: {
      _count: { select: { assignments: true } },
      jobTemplate: { select: { name: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const activeCount = await prisma.jobAssignment.count({
    where: { gameJobId: id, cancelledAt: null },
  });
  if (activeCount > 0) {
    return NextResponse.json(
      { error: "Unassign all volunteers before removing this job" },
      { status: 400 }
    );
  }

  const gameJob = await prisma.gameJob.update({
    where: { id },
    data: { disabled: true },
    select: { id: true, disabled: true },
  });

  const jobName = existing.overrideName || existing.jobTemplate.name;
  await logScheduleEventAudit(prisma, {
    organizationId: user.organizationId,
    scheduleEventId: existing.scheduleEventId,
    action: "JOB_DISABLE",
    actorUserId: user.id,
    actorLabel: `${user.name} (${user.email})`,
    summary: `Removed job: ${jobName}`,
    meta: { jobId: id },
  });

  return NextResponse.json({ success: true, job: gameJob });
}
