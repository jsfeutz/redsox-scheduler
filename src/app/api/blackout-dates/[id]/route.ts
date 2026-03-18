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

  const existing = await prisma.blackoutDate.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { title, startDate, endDate, scope, facilityId, eventTypes } = body;

  const blackout = await prisma.blackoutDate.update({
    where: { id },
    data: {
      title: title?.trim() ?? existing.title,
      startDate: startDate ? new Date(startDate) : existing.startDate,
      endDate: endDate ? new Date(endDate) : existing.endDate,
      scope: scope ?? existing.scope,
      facilityId: scope === "FACILITY" ? facilityId : null,
      eventTypes: eventTypes ?? existing.eventTypes,
    },
    include: {
      facility: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(blackout);
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

  const existing = await prisma.blackoutDate.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.blackoutDate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
