import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isOrgAdmin, canManageTeam } from "@/lib/auth-helpers";
import { TeamRole } from "@prisma/client";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.team.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const canManage = await canManageTeam(user, id);
  if (!canManage && !isOrgAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, ageGroup, icon, color, headCoachId, active } = body;

  const data: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) data.name = name.trim();
  if (ageGroup !== undefined) data.ageGroup = ageGroup?.trim() || null;
  if (icon !== undefined) data.icon = icon || null;
  if (typeof color === "string") data.color = color;
  if (headCoachId !== undefined) data.headCoachId = headCoachId || null;
  if (typeof active === "boolean" && isOrgAdmin(user.role)) data.active = active;

  const team = await prisma.team.update({
    where: { id },
    data,
    include: {
      headCoach: { select: { id: true, name: true, email: true } },
    },
  });

  if (headCoachId !== undefined && headCoachId !== existing.headCoachId) {
    if (existing.headCoachId) {
      const oldMember = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: id, userId: existing.headCoachId } },
      });
      if (oldMember && oldMember.role === TeamRole.HEAD_COACH) {
        await prisma.teamMember.update({
          where: { id: oldMember.id },
          data: { role: TeamRole.ASSISTANT_COACH },
        });
      }
    }

    if (headCoachId) {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: id, userId: headCoachId } },
        create: { teamId: id, userId: headCoachId, role: TeamRole.HEAD_COACH },
        update: { role: TeamRole.HEAD_COACH },
      });
    }
  }

  return NextResponse.json(team);
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

  const existing = await prisma.team.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      _count: {
        select: {
          scheduleEvents: true,
          seasonTeams: true,
          members: true,
        },
      },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const confirm = url.searchParams.get("confirm") === "true";

  if (!confirm) {
    return NextResponse.json({
      teamName: existing.name,
      events: existing._count.scheduleEvents,
      seasons: existing._count.seasonTeams,
      members: existing._count.members,
    });
  }

  await prisma.team.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
