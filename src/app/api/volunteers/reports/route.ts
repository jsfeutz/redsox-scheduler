import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assignments = await prisma.jobAssignment.findMany({
    where: {
      cancelledAt: null,
      gameJob: {
        scheduleEvent: {
          team: { organizationId: user.organizationId },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      playerName: true,
      hoursEarned: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
      gameJob: {
        select: {
          jobTemplate: { select: { name: true } },
          scheduleEvent: {
            select: {
              title: true,
              startTime: true,
              team: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const byPerson = new Map<
    string,
    {
      name: string;
      email: string;
      totalHours: number;
      signupCount: number;
      eventCount: number;
      jobs: {
        jobName: string;
        eventTitle: string;
        teamName: string;
        playerName: string | null;
        date: string;
        hours: number;
      }[];
    }
  >();

  for (const a of assignments) {
    const email = (a.email || a.user?.email || "").toLowerCase();
    const name = a.name || a.user?.name || "Unknown";
    if (!email) continue;

    let entry = byPerson.get(email);
    if (!entry) {
      entry = { name, email, totalHours: 0, signupCount: 0, eventCount: 0, jobs: [] };
      byPerson.set(email, entry);
    }

    const hours = a.hoursEarned ?? 0;
    entry.totalHours += hours;
    entry.signupCount += 1;
    entry.jobs.push({
      jobName: a.gameJob.jobTemplate.name,
      eventTitle: a.gameJob.scheduleEvent?.title ?? "Team-level",
      teamName: a.gameJob.scheduleEvent?.team?.name ?? "",
      playerName: a.playerName,
      date: a.gameJob.scheduleEvent?.startTime?.toISOString() ?? a.createdAt.toISOString(),
      hours,
    });
  }

  for (const entry of byPerson.values()) {
    const uniqueEvents = new Set(entry.jobs.map((j) => j.eventTitle + j.date));
    entry.eventCount = uniqueEvents.size;
    entry.totalHours = Math.round(entry.totalHours * 100) / 100;
  }

  const report = Array.from(byPerson.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return NextResponse.json(report);
}
