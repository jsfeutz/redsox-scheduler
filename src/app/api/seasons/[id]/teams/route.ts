import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { UserRole } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: seasonId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const season = await prisma.season.findFirst({
    where: { id: seasonId, organizationId: user.organizationId },
  });
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  const body = await req.json();
  const { teamId } = body;

  if (!teamId) {
    return NextResponse.json(
      { error: "teamId is required" },
      { status: 400 }
    );
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId: user.organizationId },
  });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const existing = await prisma.seasonTeam.findUnique({
    where: { seasonId_teamId: { seasonId, teamId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Team is already in this season" },
      { status: 409 }
    );
  }

  const seasonTeam = await prisma.seasonTeam.create({
    data: { seasonId, teamId },
    include: {
      team: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json(seasonTeam, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: seasonId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { teamId } = body;

  if (!teamId) {
    return NextResponse.json(
      { error: "teamId is required" },
      { status: 400 }
    );
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

  await prisma.seasonTeam.delete({
    where: { id: seasonTeam.id },
  });

  return NextResponse.json({ success: true });
}
