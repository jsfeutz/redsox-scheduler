import type { Job, PgBoss } from "pg-boss";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import {
  sendEventAddedNotification,
  sendEventCancelledNotification,
  sendEventTimeChangedNotification,
  sendSignupConfirmation,
  sendJobCancellationNotification,
} from "@/lib/email";
import type { NotifyTrigger } from "@prisma/client";

export const JOB_NAMES = {
  SEND_NOTIFICATION: "send-notification",
  EVENT_CHANGE_NOTIFICATION: "event-change-notification",
  SIGNUP_REMINDER: "signup-reminder",
  UNFILLED_JOBS_CHECK: "unfilled-jobs-check",
  AUDIT_LOG_RETENTION: "audit-log-retention",
} as const;

interface SendNotificationPayload {
  channel: "EMAIL" | "SMS";
  trigger: NotifyTrigger;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  oldTime?: string;
  newTime?: string;
  teamName?: string | null;
  location?: string | null;
  volunteers?: { jobName: string; name: string | null; email: string | null }[];
}

interface EventChangePayload {
  eventId: string;
  trigger: NotifyTrigger;
  organizationId: string;
  teamId?: string | null;
  eventTitle: string;
  eventDate: string;
  oldTime?: string;
  newTime?: string;
  teamName?: string | null;
  location?: string | null;
  volunteers?: { jobName: string; name: string | null; email: string | null }[];
}

interface SignupReminderPayload {
  assignmentId: string;
  name: string;
  email: string;
  phone?: string | null;
  jobName: string;
  eventTitle: string;
  eventDate: string;
  startTimeIso?: string;
  endTimeIso?: string;
  location: string;
  hoursUntil: number;
  eventId?: string;
  gameJobId?: string;
}

const ORG_NAME = "Rubicon Redsox";

async function handleSendNotification(job: Job<SendNotificationPayload>) {
  const d = job.data;
  if (d.channel === "EMAIL" && d.recipientEmail) {
    switch (d.trigger) {
      case "EVENT_ADDED":
        await sendEventAddedNotification({
          to: d.recipientEmail,
          eventTitle: d.eventTitle,
          eventDate: d.eventDate,
          eventId: d.eventId,
          teamName: d.teamName,
          location: d.location,
        });
        break;
      case "EVENT_CANCELLED":
        await sendEventCancelledNotification({
          to: d.recipientEmail,
          eventTitle: d.eventTitle,
          eventDate: d.eventDate,
          eventId: d.eventId,
          volunteers: d.volunteers,
          teamName: d.teamName,
          location: d.location,
        });
        break;
      case "EVENT_TIME_CHANGED":
        await sendEventTimeChangedNotification({
          to: d.recipientEmail,
          eventTitle: d.eventTitle,
          oldTime: d.oldTime || d.eventDate,
          newTime: d.newTime || d.eventDate,
          eventId: d.eventId,
          teamName: d.teamName,
          location: d.location,
        });
        break;
    }
  } else if (d.channel === "SMS" && d.recipientPhone) {
    let msg: string;
    switch (d.trigger) {
      case "EVENT_ADDED":
        msg = `${ORG_NAME}: New event - ${d.eventTitle} on ${d.eventDate}.`;
        break;
      case "EVENT_CANCELLED":
        msg = `${ORG_NAME}: ${d.eventTitle} (${d.eventDate}) has been cancelled.`;
        break;
      case "EVENT_TIME_CHANGED":
        msg = `${ORG_NAME}: ${d.eventTitle} moved from ${d.oldTime} to ${d.newTime}.`;
        break;
      default:
        msg = `${ORG_NAME}: Schedule update for ${d.eventTitle}.`;
    }
    msg += " Reply STOP to opt out.";
    await sendSms(d.recipientPhone, msg.slice(0, 300), {
      type: "SCHEDULE_CHANGE",
      relatedEventId: d.eventId,
    });
  }
}

async function handleEventChangeNotification(job: Job<EventChangePayload>) {
  const d = job.data;
  const boss = (await import("@/lib/queue")).getQueue();

  const subs = await prisma.notificationSubscription.findMany({
    where: {
      organizationId: d.organizationId,
      trigger: d.trigger,
      enabled: true,
    },
    include: {
      user: { select: { id: true, email: true, phone: true, smsEnabled: true } },
    },
  });

  const filtered = await filterSubsByScope(subs, d.teamId ?? null);

  for (const sub of filtered) {
    const email = sub.recipientEmail || sub.user?.email;
    const phone = sub.recipientPhone || (sub.user?.smsEnabled ? sub.user?.phone : null);

    const target = sub.channel === "EMAIL" ? email : phone;
    if (!target) continue;

    await boss.send(JOB_NAMES.SEND_NOTIFICATION, {
      channel: sub.channel,
      trigger: d.trigger,
      recipientEmail: sub.channel === "EMAIL" ? email : null,
      recipientPhone: sub.channel === "SMS" ? phone : null,
      eventId: d.eventId,
      eventTitle: d.eventTitle,
      eventDate: d.eventDate,
      oldTime: d.oldTime,
      newTime: d.newTime,
      teamName: d.teamName,
      location: d.location,
      volunteers: d.volunteers,
    } satisfies SendNotificationPayload);
  }
}

type SubWithUser = {
  id: string;
  scope: string;
  teamId: string | null;
  userId: string | null;
  user: { id: string; email: string; phone: string | null; smsEnabled: boolean } | null;
  [key: string]: unknown;
};

async function filterSubsByScope<T extends SubWithUser>(
  subs: T[],
  eventTeamId: string | null,
): Promise<T[]> {
  const myTeamsUserIds = subs
    .filter((s) => s.scope === "MY_TEAMS" && s.userId)
    .map((s) => s.userId!);

  let userTeamMap = new Map<string, Set<string>>();
  if (myTeamsUserIds.length > 0 && eventTeamId) {
    const members = await prisma.teamMember.findMany({
      where: { userId: { in: myTeamsUserIds }, teamId: eventTeamId },
      select: { userId: true, teamId: true },
    });
    for (const m of members) {
      const set = userTeamMap.get(m.userId) ?? new Set();
      set.add(m.teamId);
      userTeamMap.set(m.userId, set);
    }
  }

  return subs.filter((sub) => {
    switch (sub.scope) {
      case "ALL_EVENTS":
        return true;
      case "SPECIFIC_TEAM":
        return eventTeamId != null && sub.teamId === eventTeamId;
      case "MY_TEAMS":
      default:
        if (!eventTeamId) return false;
        if (!sub.userId) return true;
        return userTeamMap.get(sub.userId)?.has(eventTeamId) ?? false;
    }
  });
}

async function handleSignupReminder(job: Job<SignupReminderPayload>) {
  const d = job.data;

  const assignment = await prisma.jobAssignment.findUnique({
    where: { id: d.assignmentId },
    select: { cancelledAt: true },
  });
  if (!assignment || assignment.cancelledAt) return;

  if (d.email) {
    try {
      await sendSignupConfirmation({
        to: d.email,
        name: d.name,
        jobName: d.jobName,
        eventTitle: d.eventTitle,
        eventDate: d.eventDate,
        startTime: d.startTimeIso || d.eventDate,
        endTime: d.endTimeIso || "",
        location: d.location,
        cancelToken: "",
        mySignupsToken: "",
      });
    } catch (e) {
      console.error("[QUEUE] Signup reminder email failed:", e);
    }
  }

  if (d.phone) {
    const timeLabel =
      d.hoursUntil <= 2
        ? `in ${d.hoursUntil} hour${d.hoursUntil === 1 ? "" : "s"}`
        : `tomorrow`;
    const msg = `${ORG_NAME} Reminder: Your ${d.jobName} shift at ${d.location} starts ${timeLabel} (${d.eventDate}). Reply STOP to opt out.`;
    await sendSms(d.phone, msg, {
      type: "JOB_REMINDER",
      relatedEventId: d.eventId,
      relatedJobId: d.gameJobId,
      relatedAssignId: d.assignmentId,
      reminderKey: `reminder:${d.assignmentId}:${d.hoursUntil}h`,
    });
  }
}

async function handleUnfilledJobsCheck() {
  const { processUnfilledJobs24hNotifications } = await import("@/lib/notify");
  try {
    const result = await processUnfilledJobs24hNotifications();
    console.log(`[pg-boss] Unfilled jobs check: ${result.eventsNotified} events notified`);
  } catch (err) {
    console.error("[pg-boss] Unfilled jobs check failed:", err);
  }
}

async function handleAuditLogRetention() {
  const { purgeExpiredScheduleEventAuditLogs } = await import(
    "@/lib/schedule-event-audit"
  );
  try {
    const { deleted } = await purgeExpiredScheduleEventAuditLogs();
    if (deleted > 0) {
      console.log(`[pg-boss] Schedule event audit retention: deleted ${deleted} row(s)`);
    }
  } catch (err) {
    console.error("[pg-boss] Audit log retention failed:", err);
  }
}

function batchWrap<T>(handler: (job: Job<T>) => Promise<void>) {
  return async (jobs: Job<T>[]) => {
    for (const job of jobs) await handler(job);
  };
}

export async function registerHandlers(boss: PgBoss) {
  await boss.work<SendNotificationPayload>(
    JOB_NAMES.SEND_NOTIFICATION,
    batchWrap(handleSendNotification)
  );

  await boss.work<EventChangePayload>(
    JOB_NAMES.EVENT_CHANGE_NOTIFICATION,
    batchWrap(handleEventChangeNotification)
  );

  await boss.work<SignupReminderPayload>(
    JOB_NAMES.SIGNUP_REMINDER,
    batchWrap(handleSignupReminder)
  );

  await boss.work(
    JOB_NAMES.UNFILLED_JOBS_CHECK,
    async () => { await handleUnfilledJobsCheck(); }
  );

  await boss.work(JOB_NAMES.AUDIT_LOG_RETENTION, async () => {
    await handleAuditLogRetention();
  });

  await boss.schedule(JOB_NAMES.UNFILLED_JOBS_CHECK, "0 * * * *", {}, {
    singletonKey: "unfilled-jobs-hourly",
  });

  await boss.schedule(JOB_NAMES.AUDIT_LOG_RETENTION, "15 4 * * *", {}, {
    singletonKey: "schedule-event-audit-retention-daily",
  });

  console.log(
    "[pg-boss] Handlers registered (hourly unfilled check, daily audit retention)"
  );
}
