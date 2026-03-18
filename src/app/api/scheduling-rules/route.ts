import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isOrgAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = await prisma.schedulingRule.findMany({
    where: { organizationId: user.organizationId },
    include: {
      team: { select: { id: true, name: true, color: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { priority: "asc" }],
  });

  return NextResponse.json(rules);
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
  const { teamId, subFacilityId, dayOfWeek, eventType, priority } = body;

  if (!teamId || dayOfWeek === undefined || dayOfWeek === null) {
    return NextResponse.json(
      { error: "Team and day of week are required" },
      { status: 400 }
    );
  }

  if (dayOfWeek < 0 || dayOfWeek > 6) {
    return NextResponse.json(
      { error: "Day of week must be 0-6" },
      { status: 400 }
    );
  }

  const rule = await prisma.schedulingRule.create({
    data: {
      teamId,
      subFacilityId: subFacilityId || null,
      dayOfWeek: Number(dayOfWeek),
      eventType: eventType || "ALL",
      priority: Number(priority) || 1,
      organizationId: user.organizationId,
    },
    include: {
      team: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
