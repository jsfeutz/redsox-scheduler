import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isOrgAdmin } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isOrgAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.schedulingRule.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { teamId, subFacilityId, dayOfWeek, eventType, priority } = body;

  const rule = await prisma.schedulingRule.update({
    where: { id },
    data: {
      teamId: teamId ?? existing.teamId,
      subFacilityId: subFacilityId !== undefined ? subFacilityId || null : existing.subFacilityId,
      dayOfWeek: dayOfWeek !== undefined ? Number(dayOfWeek) : existing.dayOfWeek,
      eventType: eventType ?? existing.eventType,
      priority: priority !== undefined ? Number(priority) : existing.priority,
    },
    include: {
      team: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json(rule);
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isOrgAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.schedulingRule.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.schedulingRule.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
