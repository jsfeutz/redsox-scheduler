import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import { sendSignupConfirmation, sendJobCancellationNotification } from "@/lib/email";
import { format } from "date-fns";

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
