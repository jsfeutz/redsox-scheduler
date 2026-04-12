import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import type { Prisma } from "@prisma/client";

type Row = {
  name: string;
  totalSlots: number;
  filledSlots: number;
  openSlots: number;
  fillRate: number; // 0..1
};

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const teamId = searchParams.get("teamId");

  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : null;

  const and: Prisma.GameJobWhereInput[] = [
    { jobTemplate: { organizationId: user.organizationId } },
    { disabled: false },
  ];

  if (teamId && teamId !== "ALL") {
    and.push({ OR: [{ teamId }, { scheduleEvent: { teamId } }] });
  }

  // Default: focus on future scheduled events, plus recent org-level jobs.
  and.push({
    OR: [
      {
        scheduleEvent: {
          startTime: {
            gte: start,
            ...(end ? { lte: end } : {}),
          },
        },
      },
      {
        scheduleEventId: null,
        createdAt: {
          gte: start,
          ...(end ? { lte: end } : {}),
        },
      },
    ],
  });

  const jobs = await prisma.gameJob.findMany({
    where: { AND: and },
    select: {
      id: true,
      slotsNeeded: true,
      overrideName: true,
      jobTemplate: { select: { name: true } },
      assignments: {
        where: { cancelledAt: null },
        select: { id: true },
      },
    },
  });

  const map = new Map<string, { totalSlots: number; filledSlots: number }>();
  for (const j of jobs) {
    const key = (j.overrideName || j.jobTemplate.name).trim();
    const filled = j.assignments.length;
    const total = j.slotsNeeded;
    const prev = map.get(key) || { totalSlots: 0, filledSlots: 0 };
    prev.totalSlots += total;
    prev.filledSlots += filled;
    map.set(key, prev);
  }

  const rows: Row[] = Array.from(map.entries()).map(([name, v]) => {
    const open = Math.max(0, v.totalSlots - v.filledSlots);
    const fillRate = v.totalSlots > 0 ? v.filledSlots / v.totalSlots : 0;
    return {
      name,
      totalSlots: v.totalSlots,
      filledSlots: v.filledSlots,
      openSlots: open,
      fillRate,
    };
  });

  rows.sort((a, b) => {
    if (b.openSlots !== a.openSlots) return b.openSlots - a.openSlots;
    return a.name.localeCompare(b.name);
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.totalSlots += r.totalSlots;
      acc.filledSlots += r.filledSlots;
      return acc;
    },
    { totalSlots: 0, filledSlots: 0 }
  );

  const overallFillRate = totals.totalSlots > 0 ? totals.filledSlots / totals.totalSlots : 0;
  const mostUnfilled = rows[0] || null;

  return NextResponse.json({
    overall: {
      totalSlots: totals.totalSlots,
      filledSlots: totals.filledSlots,
      openSlots: Math.max(0, totals.totalSlots - totals.filledSlots),
      fillRate: overallFillRate,
      mostUnfilled,
    },
    rows,
  });
}

