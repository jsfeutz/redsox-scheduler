import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageSchedule } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ groupId: string }> };

export async function GET(req: Request, { params }: RouteContext) {
  const { groupId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await prisma.scheduleEvent.findMany({
    where: {
      recurrenceGroupId: groupId,
      team: { organizationId: user.organizationId },
    },
    include: {
      team: { select: { id: true, name: true, color: true } },
      subFacility: {
        include: { facility: { select: { id: true, name: true } } },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json({ events, count: events.length });
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const { groupId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageSchedule(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const first = await prisma.scheduleEvent.findFirst({
    where: { recurrenceGroupId: groupId },
    select: { teamId: true, team: { select: { organizationId: true } } },
  });

  if (!first) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  if (first.team && first.team.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const futureOnly = searchParams.get("futureOnly") === "true";

  const where: { recurrenceGroupId: string; startTime?: { gte: Date } } = {
    recurrenceGroupId: groupId,
  };
  if (futureOnly) {
    where.startTime = { gte: new Date() };
  }

  const result = await prisma.scheduleEvent.deleteMany({ where });

  return NextResponse.json({ deleted: result.count });
}
