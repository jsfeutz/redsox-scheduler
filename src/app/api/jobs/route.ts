import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  canManageSchedule,
  getTeamFilterForUser,
  canManageTeam,
} from "@/lib/auth-helpers";
import type { Prisma } from "@prisma/client";
import { logScheduleEventAudit } from "@/lib/schedule-event-audit";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const scheduleEventId = searchParams.get("scheduleEventId");
  const seasonId = searchParams.get("seasonId");

  const where: Prisma.GameJobWhereInput = {
    jobTemplate: { organizationId: user.organizationId },
  };

  const teamFilter = await getTeamFilterForUser(user);
  if (teamFilter) {
    where.scheduleEvent = teamFilter;
  }

  if (scheduleEventId) {
    where.scheduleEventId = scheduleEventId;
  }
  if (seasonId) {
    where.seasonId = seasonId;
  }

  const gameJobs = await prisma.gameJob.findMany({
    where,
    include: {
      jobTemplate: true,
      assignments: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      scheduleEvent: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          teamId: true,
          team: { select: { id: true, name: true, color: true } },
        },
      },
      season: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(gameJobs);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageSchedule(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    jobTemplateId,
    scheduleEventId,
    seasonId,
    teamId,
    slotsNeeded,
    isPublic,
    overrideName,
    overrideDescription,
    overrideHoursPerGame,
  } = body;

  if (!jobTemplateId) {
    return NextResponse.json(
      { error: "Job template is required" },
      { status: 400 }
    );
  }

  const template = await prisma.jobTemplate.findFirst({
    where: { id: jobTemplateId, organizationId: user.organizationId },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (!scheduleEventId && !seasonId) {
    return NextResponse.json(
      { error: "Either scheduleEventId or seasonId is required" },
      { status: 400 }
    );
  }

  if (teamId && !(await canManageTeam(user, teamId))) {
    return NextResponse.json(
      { error: "You are not a member of this team" },
      { status: 403 }
    );
  }

  if (scheduleEventId && !teamId) {
    const event = await prisma.scheduleEvent.findUnique({
      where: { id: scheduleEventId },
      select: { teamId: true },
    });
    if (event?.teamId && !(await canManageTeam(user, event.teamId))) {
      return NextResponse.json(
        { error: "You are not a member of this team" },
        { status: 403 }
      );
    }
  }

  const gameJob = await prisma.gameJob.create({
    data: {
      jobTemplateId,
      scheduleEventId: scheduleEventId || null,
      seasonId: seasonId || null,
      teamId: teamId || null,
      slotsNeeded: slotsNeeded || 1,
      isPublic: isPublic ?? false,
      overrideName: overrideName?.trim() || null,
      overrideDescription: overrideDescription?.trim() || null,
      overrideHoursPerGame: typeof overrideHoursPerGame === "number" ? overrideHoursPerGame : null,
    },
    include: {
      jobTemplate: true,
      assignments: true,
    },
  });

  const jobName = gameJob.overrideName || gameJob.jobTemplate.name;
  await logScheduleEventAudit(prisma, {
    organizationId: user.organizationId,
    scheduleEventId: scheduleEventId || null,
    action: "JOB_CREATE",
    actorUserId: user.id,
    actorLabel: `${user.name} (${user.email})`,
    summary: `Created job: ${jobName} (${gameJob.slotsNeeded} slot${gameJob.slotsNeeded !== 1 ? "s" : ""})`,
    meta: { jobId: gameJob.id, templateName: gameJob.jobTemplate.name },
  });

  return NextResponse.json(gameJob, { status: 201 });
}
