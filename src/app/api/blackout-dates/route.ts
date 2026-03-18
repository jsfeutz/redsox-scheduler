import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isOrgAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blackouts = await prisma.blackoutDate.findMany({
    where: { organizationId: user.organizationId },
    include: {
      facility: { select: { id: true, name: true } },
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(blackouts);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isOrgAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, startDate, endDate, scope, facilityId, eventTypes } = body;

  if (!title || !startDate || !endDate || !scope) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (scope === "FACILITY" && !facilityId) {
    return NextResponse.json(
      { error: "Facility is required for facility-scoped blackouts" },
      { status: 400 }
    );
  }

  const parsedStart = startDate.length === 10 ? new Date(startDate + "T00:00:00") : new Date(startDate);
  const parsedEnd = endDate.length === 10 ? new Date(endDate + "T23:59:59") : new Date(endDate);

  const blackout = await prisma.blackoutDate.create({
    data: {
      title: title.trim(),
      startDate: parsedStart,
      endDate: parsedEnd,
      scope,
      facilityId: scope === "FACILITY" ? facilityId : null,
      eventTypes: eventTypes || "ALL",
      organizationId: user.organizationId,
    },
    include: {
      facility: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(blackout, { status: 201 });
}
