import { prisma } from "@/lib/prisma";
import { generateMultiICS } from "@/lib/calendar";
import { subDays } from "date-fns";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  const type = searchParams.get("type");

  const org = await prisma.organization.findFirst({ select: { id: true, name: true } });
  if (!org) {
    return new Response("Not found", { status: 404 });
  }

  const where: Record<string, unknown> = {
    team: { organizationId: org.id },
    startTime: { gte: subDays(new Date(), 30) },
  };
  if (teamId) where.teamId = teamId;
  if (type && type !== "ALL") where.type = type;

  const events = await prisma.scheduleEvent.findMany({
    where,
    select: {
      id: true,
      title: true,
      type: true,
      startTime: true,
      endTime: true,
      customLocation: true,
      team: { select: { name: true } },
      subFacility: {
        select: {
          name: true,
          facility: { select: { name: true } },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const teamObj = teamId
    ? await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } })
    : null;

  const calName = teamObj
    ? `${org.name} – ${teamObj.name} Schedule`
    : `${org.name} Schedule`;

  const calEvents = events.map((e) => ({
    uid: e.id,
    title: `${e.team?.name ?? "Club Event"} – ${e.title} (${e.type})`,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    location: e.subFacility
      ? `${e.subFacility.facility.name} – ${e.subFacility.name}`
      : e.customLocation ?? "",
    description: `${e.team?.name ?? "Club Event"} ${e.type.toLowerCase()}`,
  }));

  const ics = generateMultiICS(calEvents, {
    calendarName: calName,
    refreshIntervalMinutes: 60,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
    },
  });
}
