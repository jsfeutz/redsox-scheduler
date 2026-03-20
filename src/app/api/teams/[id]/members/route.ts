import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  canManageTeam,
  canInviteToTeam,
} from "@/lib/auth-helpers";
import { TeamRole } from "@prisma/client";

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

  if (!(await canManageTeam(user, teamId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
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

  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId: user.organizationId },
  });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (!(await canInviteToTeam(user, teamId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, role } = body;

  if (!userId || !role) {
    return NextResponse.json(
      { error: "userId and role are required" },
      { status: 400 }
    );
  }

  const validRoles: TeamRole[] = [
    TeamRole.HEAD_COACH,
    TeamRole.ASSISTANT_COACH,
    TeamRole.TEAM_MANAGER,
  ];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: userId, organizationId: user.organizationId },
  });
  if (!targetUser) {
    return NextResponse.json(
      { error: "User not found in organization" },
      { status: 404 }
    );
  }

  const existing = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "User is already a member of this team" },
      { status: 409 }
    );
  }

  if (role === TeamRole.HEAD_COACH) {
    await prisma.$transaction([
      prisma.teamMember.updateMany({
        where: { teamId, role: TeamRole.HEAD_COACH },
        data: { role: TeamRole.ASSISTANT_COACH },
      }),
      prisma.team.update({
        where: { id: teamId },
        data: { headCoachId: userId },
      }),
    ]);
  }

  const member = await prisma.teamMember.create({
    data: { teamId, userId, role },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(member, { status: 201 });
}

export async function PATCH(
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

  if (!(await canManageTeam(user, teamId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, role } = body;

  if (!userId || !role) {
    return NextResponse.json(
      { error: "userId and role are required" },
      { status: 400 }
    );
  }

  const validRoles: TeamRole[] = [
    TeamRole.HEAD_COACH,
    TeamRole.ASSISTANT_COACH,
    TeamRole.TEAM_MANAGER,
  ];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (userId === user.id && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "You cannot change your own role" },
      { status: 403 }
    );
  }

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (role === TeamRole.HEAD_COACH && membership.role !== TeamRole.HEAD_COACH) {
    await prisma.$transaction([
      prisma.teamMember.updateMany({
        where: { teamId, role: TeamRole.HEAD_COACH },
        data: { role: TeamRole.ASSISTANT_COACH },
      }),
      prisma.team.update({
        where: { id: teamId },
        data: { headCoachId: userId },
      }),
    ]);
  }

  if (membership.role === TeamRole.HEAD_COACH && role !== TeamRole.HEAD_COACH) {
    await prisma.team.update({
      where: { id: teamId },
      data: { headCoachId: null },
    });
  }

  const updated = await prisma.teamMember.update({
    where: { id: membership.id },
    data: { role },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(updated);
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

  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId: user.organizationId },
  });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (!(await canManageTeam(user, teamId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  if (userId === user.id && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "You cannot remove yourself from the team" },
      { status: 403 }
    );
  }

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "Member not found" },
      { status: 404 }
    );
  }

  if (membership.role === TeamRole.HEAD_COACH && team.headCoachId === userId) {
    await prisma.team.update({
      where: { id: teamId },
      data: { headCoachId: null },
    });
  }

  await prisma.teamMember.delete({
    where: { id: membership.id },
  });

  return NextResponse.json({ success: true });
}
