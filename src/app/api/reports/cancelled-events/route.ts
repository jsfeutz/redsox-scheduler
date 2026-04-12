import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isOrgAdmin } from "@/lib/auth-helpers";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOrgAdmin(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const where: Prisma.ScheduleEventWhereInput = {
    cancelledAt: { not: null },
    OR: [
      { team: { organizationId: user.organizationId } },
      {
        teamId: null,
        subFacility: { facility: { organizationId: user.organizationId } },
      },
    ],
  };

  if (startDate) {
    where.startTime = { ...(where.startTime as object), gte: new Date(startDate) };
  }
  if (endDate) {
    where.startTime = { ...(where.startTime as object), lte: new Date(endDate) };
  }

  const events = await prisma.scheduleEvent.findMany({
    where,
    include: {
      team: { select: { id: true, name: true, color: true } },
      subFacility: {
        include: {
          facility: { select: { id: true, name: true } },
        },
      },
      gameJobs: {
        select: {
          id: true,
          slotsNeeded: true,
          jobTemplate: { select: { name: true } },
          assignments: {
            select: {
              id: true,
              name: true,
              email: true,
              cancelledAt: true,
            },
          },
        },
      },
    },
    orderBy: { cancelledAt: "desc" },
    take: 200,
  });

  return NextResponse.json(events);
}
