import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import {
  sendSignupConfirmation,
  sendJobCancellationNotification,
  sendAdminVolunteerCancellationAlert,
  sendAdminUnfilledJobsAlert,
} from "@/lib/email";
import { format, startOfWeek } from "date-fns";
import {
  AdminNotifyChannel,
  AdminNotifyEvent,
} from "@prisma/client";

const APP_URL = process.env.APP_URL || "http://localhost:3003";
const ORG_NAME = "Rubicon Redsox";

async function isOrgSmsEnabled(): Promise<boolean> {
  try {
    const org = await prisma.organization.findFirst({
      select: { smsEnabled: true },
    });
    return org?.smsEnabled ?? true;
  } catch {
    return false;
  }
}

function resolvePhone(assignment: {
  phone?: string | null;
  playerVolunteer?: { phone?: string | null } | null;
  user?: { phone?: string | null; smsEnabled?: boolean } | null;
}): string | null {
  if (assignment.user && !assignment.user.smsEnabled) return null;
  return (
    assignment.phone ||
    assignment.user?.phone ||
    assignment.playerVolunteer?.phone ||
    null
  );
}

export async function notifyJobSignup(opts: {
  assignmentId: string;
  name: string;
  email: string;
  phone?: string | null;
  jobName: string;
  eventTitle: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  cancelToken: string;
  mySignupsToken: string;
  eventId?: string;
  gameJobId?: string;
}) {
  try {
    await sendSignupConfirmation({
      to: opts.email,
      name: opts.name,
      jobName: opts.jobName,
      eventTitle: opts.eventTitle,
      eventDate: opts.eventDate,
      startTime: opts.startTime,
      endTime: opts.endTime,
      location: opts.location,
      cancelToken: opts.cancelToken,
      mySignupsToken: opts.mySignupsToken,
    });
  } catch (err) {
    console.error("[NOTIFY] Email signup confirmation failed:", err);
  }

  if (opts.phone && (await isOrgSmsEnabled())) {
    const msg = `${ORG_NAME}: You're signed up for ${opts.jobName} - ${opts.eventTitle} on ${opts.eventDate} at ${opts.location}. Reply STOP to opt out.`;
    await sendSms(opts.phone, msg, {
      type: "SIGNUP_CONFIRM",
      relatedEventId: opts.eventId,
      relatedJobId: opts.gameJobId,
      relatedAssignId: opts.assignmentId,
    });
  }
}

export async function notifyJobCancellation(opts: {
  assignmentId: string;
  name: string;
  email: string;
  phone?: string | null;
  jobName: string;
  eventTitle: string;
  eventDate: string;
  location: string;
  reason: string;
  eventId?: string;
  gameJobId?: string;
}) {
  try {
    await sendJobCancellationNotification({
      to: opts.email,
      name: opts.name,
      jobName: opts.jobName,
      eventTitle: opts.eventTitle,
      eventDate: opts.eventDate,
      location: opts.location,
      reason: opts.reason,
    });
  } catch (err) {
    console.error("[NOTIFY] Email cancellation failed:", err);
  }

  if (opts.phone && (await isOrgSmsEnabled())) {
    const msg = `${ORG_NAME}: Your ${opts.jobName} signup for ${opts.eventTitle} has been cancelled. Reason: ${opts.reason}. Reply STOP to opt out.`;
    await sendSms(opts.phone, msg, {
      type: "CANCELLATION",
      relatedEventId: opts.eventId,
      relatedJobId: opts.gameJobId,
      relatedAssignId: opts.assignmentId,
    });
  }
}

export async function notifyScheduleChange(opts: {
  eventId: string;
  changeType: "updated" | "cancelled";
  eventTitle: string;
  oldTime?: string;
  newTime?: string;
  location?: string;
}) {
  if (!(await isOrgSmsEnabled())) return;

  const assignments = await prisma.jobAssignment.findMany({
    where: {
      cancelledAt: null,
      gameJob: { scheduleEventId: opts.eventId },
    },
    select: {
      id: true,
      phone: true,
      email: true,
      name: true,
      user: { select: { phone: true, smsEnabled: true } },
      playerVolunteer: { select: { phone: true } },
    },
  });

  let msg: string;
  if (opts.changeType === "cancelled") {
    msg = `${ORG_NAME}: ${opts.eventTitle} has been cancelled. Reply STOP to opt out.`;
  } else {
    const timeInfo = opts.newTime ? ` New time: ${opts.newTime}.` : "";
    const locInfo = opts.location ? ` Location: ${opts.location}.` : "";
    msg = `${ORG_NAME}: Schedule change - ${opts.eventTitle} has been updated.${timeInfo}${locInfo} Reply STOP to opt out.`;
  }

  for (const a of assignments) {
    const phone = resolvePhone(a);
    if (phone) {
      await sendSms(phone, msg, {
        type: "SCHEDULE_CHANGE",
        relatedEventId: opts.eventId,
        relatedAssignId: a.id,
      });
    }
  }
}

export async function notifyJobReminder(opts: {
  assignmentId: string;
  phone: string;
  name: string;
  jobName: string;
  eventTitle: string;
  eventDate: string;
  location: string;
  hoursUntil: number;
  eventId?: string;
  gameJobId?: string;
}) {
  const timeLabel =
    opts.hoursUntil <= 2
      ? `in ${opts.hoursUntil} hour${opts.hoursUntil === 1 ? "" : "s"}`
      : `tomorrow`;
  const msg = `${ORG_NAME} Reminder: Your ${opts.jobName} shift at ${opts.location} starts ${timeLabel} (${opts.eventDate}). Reply STOP to opt out.`;

  await sendSms(opts.phone, msg, {
    type: "JOB_REMINDER",
    relatedEventId: opts.eventId,
    relatedJobId: opts.gameJobId,
    relatedAssignId: opts.assignmentId,
    reminderKey: `reminder:${opts.assignmentId}:${opts.hoursUntil}h`,
  });
}

export async function getReminderWindows(): Promise<number[]> {
  try {
    const org = await prisma.organization.findFirst({
      select: { reminderHoursBefore: true },
    });
    if (!org?.reminderHoursBefore) return [24, 2];
    return org.reminderHoursBefore
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
  } catch {
    return [24, 2];
  }
}

export function formatEventDate(date: Date): string {
  return format(date, "EEE, MMM d 'at' h:mm a");
}

export async function notifyAdminsVolunteerCancellation(opts: {
  organizationId: string;
  volunteerName: string | null;
  volunteerEmail: string | null;
  jobName: string;
  eventTitle: string;
  eventDate: string;
  location: string;
}) {
  const prefs = await prisma.adminNotificationPref.findMany({
    where: {
      event: AdminNotifyEvent.JOB_CANCELLATION,
      enabled: true,
      user: { organizationId: opts.organizationId, active: true },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          smsEnabled: true,
        },
      },
    },
  });

  for (const p of prefs) {
    const u = p.user;
    const sendEmail =
      p.channel === AdminNotifyChannel.EMAIL ||
      p.channel === AdminNotifyChannel.BOTH;
    const sendSmsPref =
      (p.channel === AdminNotifyChannel.SMS ||
        p.channel === AdminNotifyChannel.BOTH) &&
      u.smsEnabled !== false &&
      u.phone;

    if (sendEmail) {
      try {
        await sendAdminVolunteerCancellationAlert({
          to: u.email,
          recipientName: u.name,
          volunteerName: opts.volunteerName,
          volunteerEmail: opts.volunteerEmail,
          jobName: opts.jobName,
          eventTitle: opts.eventTitle,
          eventDate: opts.eventDate,
          location: opts.location,
        });
      } catch (e) {
        console.error("[NOTIFY] Admin cancellation email failed:", e);
      }
    }

    if (sendSmsPref && u.phone) {
      const msg = `Redsox admin: ${opts.volunteerName || "Volunteer"} cancelled ${opts.jobName} for ${opts.eventTitle} (${opts.eventDate}).`;
      await sendSms(u.phone, msg, {
        type: "ADMIN_ALERT",
        reminderKey: `adminCancel:${opts.jobName}:${opts.eventDate}:${u.id}`.slice(0, 200),
      });
    }
  }
}

/** Cron: unfilled public jobs for events starting in ~24h */
export async function processUnfilledJobs24hNotifications(): Promise<{
  eventsNotified: number;
}> {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org) return { eventsNotified: 0 };

  const now = new Date();
  const windowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

  const jobs = await prisma.gameJob.findMany({
    where: {
      isPublic: true,
      disabled: false,
      scheduleEvent: {
        cancelledByBumpId: null,
        startTime: { gte: windowStart, lte: windowEnd },
      },
    },
    include: {
      jobTemplate: { select: { name: true } },
      scheduleEvent: {
        select: {
          id: true,
          title: true,
          startTime: true,
          team: { select: { organizationId: true } },
          subFacility: {
            select: {
              name: true,
              facility: { select: { name: true, organizationId: true } },
            },
          },
        },
      },
      assignments: { where: { cancelledAt: null }, select: { id: true } },
    },
  });

  const unfilled = jobs.filter(
    (j) => j.assignments.length < j.slotsNeeded && j.scheduleEvent
  );

  const byEvent = new Map<
    string,
    { title: string; start: Date; lines: string[] }
  >();

  for (const j of unfilled) {
    const e = j.scheduleEvent!;
    const orgId =
      e.team?.organizationId ?? e.subFacility?.facility?.organizationId;
    if (orgId !== org.id) continue;

    const open = j.slotsNeeded - j.assignments.length;
    const line = `${j.jobTemplate.name}: ${open} spot(s) open`;
    const existing = byEvent.get(e.id);
    if (existing) {
      existing.lines.push(line);
    } else {
      byEvent.set(e.id, {
        title: e.title,
        start: new Date(e.startTime),
        lines: [line],
      });
    }
  }

  const prefs = await prisma.adminNotificationPref.findMany({
    where: {
      event: AdminNotifyEvent.UNFILLED_JOBS_24H,
      enabled: true,
      user: { organizationId: org.id, active: true },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          smsEnabled: true,
        },
      },
    },
  });

  let eventsNotified = 0;

  for (const [eventId, data] of byEvent) {
    const when = format(data.start, "EEE MMM d, h:mm a");
    const block = data.lines.join("; ");
    let anyRecipient = false;

    for (const p of prefs) {
      const u = p.user;
      const reminderKey = `unfilled24h:${u.id}:${eventId}`;
      const existing = await prisma.notificationLog.findFirst({
        where: { reminderKey, status: "SENT" },
      });
      if (existing) continue;

      const sendEmail =
        p.channel === AdminNotifyChannel.EMAIL ||
        p.channel === AdminNotifyChannel.BOTH;
      const sendSmsPref =
        (p.channel === AdminNotifyChannel.SMS ||
          p.channel === AdminNotifyChannel.BOTH) &&
        u.smsEnabled !== false &&
        u.phone;

      let delivered = false;

      if (sendSmsPref && u.phone) {
        const r = await sendSms(
          u.phone,
          `Redsox: Unfilled jobs in 24h — ${data.title} (${when}): ${block}`.slice(
            0,
            300
          ),
          {
            type: "ADMIN_ALERT",
            relatedEventId: eventId,
            reminderKey,
          }
        );
        if (r.success) delivered = true;
      }

      if (sendEmail) {
        try {
          await sendAdminUnfilledJobsAlert({
            to: u.email,
            recipientName: u.name,
            title: `Unfilled jobs in 24h: ${data.title}`,
            intro: `The following volunteer roles still need people for <strong>${data.title}</strong> (${when}).`,
            lines: data.lines,
          });
          delivered = true;
        } catch (e) {
          console.error("[NOTIFY] Unfilled 24h email failed:", e);
        }
      }

      if (delivered) {
        anyRecipient = true;
        const already = await prisma.notificationLog.findFirst({
          where: { reminderKey, status: "SENT" },
        });
        if (!already) {
          await prisma.notificationLog.create({
            data: {
              type: "ADMIN_ALERT",
              channel: "EMAIL",
              recipientEmail: u.email,
              message: `Unfilled 24h: ${data.title}`,
              status: "SENT",
              relatedEventId: eventId,
              reminderKey,
            },
          });
        }
      }
    }
    if (anyRecipient) eventsNotified++;
  }

  return { eventsNotified };
}

/** Cron: Monday weekly digest of unfilled jobs in the next 7 days */
export async function processUnfilledJobsWeeklyDigest(): Promise<{
  sent: number;
  skipped: string;
}> {
  const day = new Date().getDay();
  if (day !== 1) {
    return { sent: 0, skipped: "not_monday" };
  }

  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org) return { sent: 0, skipped: "no_org" };

  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const jobs = await prisma.gameJob.findMany({
    where: {
      isPublic: true,
      disabled: false,
      scheduleEvent: {
        cancelledByBumpId: null,
        startTime: { gte: now, lte: weekEnd },
      },
    },
    include: {
      jobTemplate: { select: { name: true } },
      scheduleEvent: {
        select: {
          id: true,
          title: true,
          startTime: true,
          team: { select: { organizationId: true } },
          subFacility: {
            select: {
              facility: { select: { organizationId: true } },
            },
          },
        },
      },
      assignments: { where: { cancelledAt: null }, select: { id: true } },
    },
  });

  const lines: string[] = [];
  for (const j of jobs) {
    if (j.assignments.length >= j.slotsNeeded || !j.scheduleEvent) continue;
    const e = j.scheduleEvent;
    const orgId =
      e.team?.organizationId ?? e.subFacility?.facility?.organizationId;
    if (orgId !== org.id) continue;
    const open = j.slotsNeeded - j.assignments.length;
    const when = format(new Date(e.startTime), "EEE MMM d, h:mm a");
    lines.push(`${when} — ${e.title}: ${j.jobTemplate.name} (${open} open)`);
  }

  lines.sort();

  const prefs = await prisma.adminNotificationPref.findMany({
    where: {
      event: AdminNotifyEvent.UNFILLED_JOBS_WEEK,
      enabled: true,
      user: { organizationId: org.id, active: true },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          smsEnabled: true,
        },
      },
    },
  });

  const weekKey = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  let sent = 0;

  for (const p of prefs) {
    const u = p.user;
    const reminderKey = `unfilledWeek:${u.id}:${weekKey}`;
    const existing = await prisma.notificationLog.findFirst({
      where: { reminderKey, status: "SENT" },
    });
    if (existing) continue;

    const sendEmail =
      p.channel === AdminNotifyChannel.EMAIL ||
      p.channel === AdminNotifyChannel.BOTH;
    const sendSmsPref =
      (p.channel === AdminNotifyChannel.SMS ||
        p.channel === AdminNotifyChannel.BOTH) &&
      u.smsEnabled !== false &&
      u.phone;

    let delivered = false;

    if (sendSmsPref && u.phone) {
      const smsBody =
        lines.length === 0
          ? "Redsox: No unfilled public shifts in the next 7 days."
          : `Redsox: ${lines.length} unfilled shift(s) this week. Check email or the app.`.slice(
              0,
              300
            );
      const r = await sendSms(u.phone, smsBody, {
        type: "ADMIN_ALERT",
        reminderKey,
      });
      if (r.success) delivered = true;
    }

    if (sendEmail) {
      try {
        await sendAdminUnfilledJobsAlert({
          to: u.email,
          recipientName: u.name,
          title: "Weekly unfilled volunteer jobs",
          intro:
            "Here are public volunteer shifts that still need people in the next 7 days:",
          lines,
        });
        delivered = true;
      } catch (e) {
        console.error("[NOTIFY] Weekly unfilled email failed:", e);
      }
    }

    if (delivered) {
      const already = await prisma.notificationLog.findFirst({
        where: { reminderKey, status: "SENT" },
      });
      if (!already) {
        await prisma.notificationLog.create({
          data: {
            type: "ADMIN_ALERT",
            channel: "EMAIL",
            recipientEmail: u.email,
            message: "Weekly unfilled digest",
            status: "SENT",
            reminderKey,
          },
        });
      }
      sent++;
    }
  }

  return { sent, skipped: "ok" };
}
