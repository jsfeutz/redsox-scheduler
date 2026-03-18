import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageSchedule, canManageTeam } from "@/lib/auth-helpers";
import { createAutoJobs } from "@/lib/auto-jobs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageSchedule(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") || "single";

  const event = await prisma.scheduleEvent.findUnique({
    where: { id },
    include: { team: { select: { organizationId: true } } },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (event.teamId && !(await canManageTeam(user, event.teamId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let events: typeof event[] = [event];

  if (scope === "series" && event.recurrenceGroupId) {
    events = await prisma.scheduleEvent.findMany({
      where: { recurrenceGroupId: event.recurrenceGroupId },
      include: { team: { select: { organizationId: true } } },
    });
  }

  let created = 0;
  for (const evt of events) {
    const existingJobTemplateIds = await prisma.gameJob.findMany({
      where: { scheduleEventId: evt.id },
      select: { jobTemplateId: true },
    });
    const existingSet = new Set(existingJobTemplateIds.map((j) => j.jobTemplateId));

    const beforeCount = existingSet.size;
    if (!evt.team) continue;
    await createAutoJobs({
      id: evt.id,
      type: evt.type,
      teamId: evt.teamId,
      seasonId: evt.seasonId,
      subFacilityId: evt.subFacilityId,
      organizationId: evt.team.organizationId,
    });

    const afterCount = await prisma.gameJob.count({
      where: { scheduleEventId: evt.id },
    });
    created += afterCount - beforeCount;
  }

  return NextResponse.json({
    synced: events.length,
    newJobs: created,
  });
}
