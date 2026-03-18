import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isOrgAdmin,
  getUserTeamIds,
} from "@/lib/auth-helpers";
import { UserRole } from "@prisma/client";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where: { organizationId: string; id?: { in: string[] }; active?: boolean } = {
    organizationId: user.organizationId,
  };

  if (!isOrgAdmin(user.role) && user.role !== UserRole.SCHEDULE_MANAGER) {
    const teamIds = await getUserTeamIds(user.id);
    where.id = { in: teamIds };
    where.active = true;
  }

  const teams = await prisma.team.findMany({
    where,
    include: {
      headCoach: { select: { id: true, name: true, email: true } },
      members: {
        select: {
          role: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, ageGroup, color, headCoachId } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const team = await prisma.team.create({
    data: {
      name: name.trim(),
      ageGroup: ageGroup?.trim() || null,
      color: color || "#3b82f6",
      headCoachId: headCoachId || null,
      organizationId: user.organizationId,
    },
    include: {
      headCoach: { select: { id: true, name: true, email: true } },
    },
  });

  if (headCoachId) {
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: headCoachId, role: "HEAD_COACH" },
    });
  }

  return NextResponse.json(team, { status: 201 });
}
