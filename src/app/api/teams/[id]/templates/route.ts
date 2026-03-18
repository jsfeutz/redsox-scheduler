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

  const templates = await prisma.jobTemplate.findMany({
    where: { teamId },
    include: { _count: { select: { gameJobs: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(templates);
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
  const { name, description, forEventType, hoursPerGame, maxSlots } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const validEventTypes = ["ALL", "GAME", "PRACTICE", "OTHER"];
  const template = await prisma.jobTemplate.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      scope: "TEAM",
      forEventType: validEventTypes.includes(forEventType) ? forEventType : "ALL",
      hoursPerGame: typeof hoursPerGame === "number" ? hoursPerGame : 2,
      maxSlots: typeof maxSlots === "number" && maxSlots >= 1 ? maxSlots : 1,
      organizationId: user.organizationId,
      teamId,
    },
    include: { _count: { select: { gameJobs: true } } },
  });

  return NextResponse.json(template, { status: 201 });
}
