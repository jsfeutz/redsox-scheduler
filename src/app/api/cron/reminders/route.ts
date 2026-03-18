import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  notifyJobReminder,
  getReminderWindows,
  formatEventDate,
} from "@/lib/notify";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret") || req.headers.get("x-cron-secret");

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findFirst({
    select: { smsEnabled: true },
  });
  if (!org?.smsEnabled) {
    return NextResponse.json({ message: "SMS disabled for org", sent: 0 });
  }

  const windows = await getReminderWindows();
  const now = new Date();
  let totalSent = 0;

  for (const hours of windows) {
    const windowStart = new Date(now.getTime() + (hours - 0.5) * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + (hours + 0.5) * 60 * 60 * 1000);

    const assignments = await prisma.jobAssignment.findMany({
      where: {
        cancelledAt: null,
        gameJob: {
          scheduleEvent: {
            startTime: { gte: windowStart, lte: windowEnd },
          },
        },
      },
      include: {
        gameJob: {
          include: {
            jobTemplate: { select: { name: true } },
            scheduleEvent: {
              select: {
                id: true,
                title: true,
                startTime: true,
                subFacility: {
                  select: {
                    name: true,
                    facility: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        user: { select: { phone: true, smsEnabled: true } },
        playerVolunteer: { select: { phone: true } },
      },
    });

    for (const a of assignments) {
      const phone =
        a.phone ||
        (a.user?.smsEnabled !== false ? a.user?.phone : null) ||
        a.playerVolunteer?.phone ||
        null;

      if (!phone) continue;

      const reminderKey = `reminder:${a.id}:${hours}h`;

      const existing = await prisma.notificationLog.findFirst({
        where: { reminderKey, status: "SENT" },
      });
      if (existing) continue;

      const evt = a.gameJob.scheduleEvent;
      const location = evt?.subFacility
        ? `${evt.subFacility.facility.name} – ${evt.subFacility.name}`
        : "";

      await notifyJobReminder({
        assignmentId: a.id,
        phone,
        name: a.name ?? "Volunteer",
        jobName: a.gameJob.jobTemplate.name,
        eventTitle: evt?.title ?? "Event",
        eventDate: evt?.startTime ? formatEventDate(new Date(evt.startTime)) : "",
        location,
        hoursUntil: hours,
        eventId: evt?.id,
        gameJobId: a.gameJob.id,
      });
      totalSent++;
    }
  }

  return NextResponse.json({
    message: "Reminders processed",
    sent: totalSent,
    windows,
  });
}
