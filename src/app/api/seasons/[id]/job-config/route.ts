import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  canManageTeam,
  isOrgAdmin,
  getUserTeamIds,
} from "@/lib/auth-helpers";
import { EventType } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: seasonId } = await params;

  const season = await prisma.season.findFirst({
    where: { id: seasonId, organizationId: user.organizationId },
  });
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  let teamFilter: object | undefined;
  if (!isOrgAdmin(user.role)) {
    const teamIds = await getUserTeamIds(user.id);
    teamFilter = { teamId: { in: teamIds } };
  }

  const configs = await prisma.seasonJobConfig.findMany({
    where: {
      seasonTeam: {
        seasonId,
        ...teamFilter,
      },
    },
    include: {
      jobTemplate: { select: { id: true, name: true, description: true } },
      seasonTeam: {
        include: {
          team: { select: { id: true, name: true, color: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(configs);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: seasonId } = await params;

  const season = await prisma.season.findFirst({
    where: { id: seasonId, organizationId: user.organizationId },
  });
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  const body = await req.json();
  const { teamId, jobTemplateId, eventType, slotsNeeded } = body;

  if (!teamId || !jobTemplateId || !eventType) {
    return NextResponse.json(
      { error: "teamId, jobTemplateId, and eventType are required" },
      { status: 400 }
    );
  }

  const validEventTypes: EventType[] = [EventType.GAME, EventType.PRACTICE];
  if (!validEventTypes.includes(eventType)) {
    return NextResponse.json(
      { error: "eventType must be GAME or PRACTICE" },
      { status: 400 }
    );
  }

  if (!(await canManageTeam(user, teamId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const seasonTeam = await prisma.seasonTeam.findUnique({
    where: { seasonId_teamId: { seasonId, teamId } },
  });
  if (!seasonTeam) {
    return NextResponse.json(
      { error: "Team is not in this season" },
      { status: 404 }
    );
  }

  const jobTemplate = await prisma.jobTemplate.findFirst({
    where: { id: jobTemplateId, organizationId: user.organizationId },
  });
  if (!jobTemplate) {
    return NextResponse.json(
      { error: "Job template not found" },
      { status: 404 }
    );
  }

  const existing = await prisma.seasonJobConfig.findUnique({
    where: {
      seasonTeamId_jobTemplateId_eventType: {
        seasonTeamId: seasonTeam.id,
        jobTemplateId,
        eventType,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Config already exists for this team, template, and event type" },
      { status: 409 }
    );
  }

  const config = await prisma.seasonJobConfig.create({
    data: {
      seasonTeamId: seasonTeam.id,
      jobTemplateId,
      eventType,
      slotsNeeded: slotsNeeded ?? 1,
    },
    include: {
      jobTemplate: { select: { id: true, name: true, description: true } },
      seasonTeam: {
        include: {
          team: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });

  return NextResponse.json(config, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: seasonId } = await params;

  const body = await req.json();
  const { configId } = body;

  if (!configId) {
    return NextResponse.json(
      { error: "configId is required" },
      { status: 400 }
    );
  }

  const config = await prisma.seasonJobConfig.findFirst({
    where: {
      id: configId,
      seasonTeam: {
        seasonId,
        season: { organizationId: user.organizationId },
      },
    },
  });
  if (!config) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }

  await prisma.seasonJobConfig.delete({ where: { id: configId } });

  return NextResponse.json({ success: true });
}
