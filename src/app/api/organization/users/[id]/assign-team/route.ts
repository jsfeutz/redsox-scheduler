import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isOrgAdmin } from "@/lib/auth-helpers";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isOrgAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { teamId, teamRole } = body;

  if (!teamId || !teamRole) {
    return NextResponse.json(
      { error: "teamId and teamRole are required" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      headCoach: { select: { id: true, name: true } },
      members: {
        where: { role: teamRole },
        select: { id: true, userId: true },
      },
    },
  });

  if (!team || team.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (teamRole === "HEAD_COACH") {
    if (team.headCoach && team.headCoach.id !== id) {
      const oldMembership = await prisma.teamMember.findFirst({
        where: { teamId, userId: team.headCoach.id, role: "HEAD_COACH" },
      });
      if (oldMembership) {
        await prisma.teamMember.delete({ where: { id: oldMembership.id } });
      }
    }
    await prisma.team.update({
      where: { id: teamId },
      data: { headCoachId: id },
    });
  } else {
    for (const existing of team.members) {
      if (existing.userId !== id) {
        await prisma.teamMember.delete({ where: { id: existing.id } });
      }
    }
  }

  const existingMembership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: id } },
  });

  if (existingMembership) {
    await prisma.teamMember.update({
      where: { id: existingMembership.id },
      data: { role: teamRole },
    });
  } else {
    await prisma.teamMember.create({
      data: { teamId, userId: id, role: teamRole },
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isOrgAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json(
      { error: "teamId is required" },
      { status: 400 }
    );
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (team.headCoachId === id) {
    await prisma.team.update({
      where: { id: teamId },
      data: { headCoachId: null },
    });
  }

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: id } },
  });
  if (membership) {
    await prisma.teamMember.delete({ where: { id: membership.id } });
  }

  return NextResponse.json({ success: true });
}
