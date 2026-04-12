import nodemailer from "nodemailer";
const APP_URL = process.env.APP_URL || "http://localhost:3003";
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "1025", 10);
const SMTP_USER = process.env.SMTP_USER || undefined;
const SMTP_PASS = process.env.SMTP_PASS || undefined;
/** Default: display name + address (RFC 5322). Override via SMTP_FROM. */
const SMTP_FROM =
  process.env.SMTP_FROM ||
  "Rubicon Redsox Notification <noreply@rubiconredsox.com>";

function getTransport() {
  if (!SMTP_HOST) return null;
  const useTlsStart = SMTP_PORT === 587 || SMTP_PORT === 2587;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465 || SMTP_PORT === 2465,
    ...(useTlsStart ? { requireTLS: true } : {}),
    ...(SMTP_USER && SMTP_PASS
      ? { auth: { user: SMTP_USER, pass: SMTP_PASS } }
      : {}),
  });
}

async function send(to: string, subject: string, html: string) {
  const transport = getTransport();
  if (transport) {
    try {
      await transport.sendMail({ from: SMTP_FROM, to, subject, html });
    } catch (err) {
      const e = err as {
        message?: string;
        response?: string;
        responseCode?: number;
        code?: string;
      };
      console.error(
        "[EMAIL] SMTP send failed:",
        e.message || err,
        e.responseCode != null ? `code=${e.responseCode}` : "",
        e.response ? `response=${e.response.slice(0, 500)}` : ""
      );
      throw err;
    }
  }
  console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
  if (!transport) {
    console.log(`[EMAIL] (no SMTP configured — printing body)\n${html}\n`);
  }
}

export async function sendInvitation(opts: {
  to: string;
  inviterName: string;
  role: string;
  teamName?: string | null;
  teamRole?: string | null;
  replacingName?: string | null;
  token: string;
  expiresAt: Date;
}) {
  const acceptUrl = `${APP_URL}/invite/${opts.token}`;
  const roleLabel = opts.role.charAt(0) + opts.role.slice(1).toLowerCase();
  const teamRoleLabel = opts.teamRole
    ? opts.teamRole.replace(/_/g, " ").toLowerCase()
    : null;
  const expiresFormatted = opts.expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const teamInfo = opts.teamName
    ? `<p style="color:#666;margin:0 0 4px">You'll be joining <strong>${opts.teamName}</strong>${teamRoleLabel ? ` as <strong>${teamRoleLabel}</strong>` : ""}.</p>`
    : "";

  const replacingInfo = opts.replacingName
    ? `<p style="color:#666;margin:0 0 16px">You will be replacing <strong>${opts.replacingName}</strong> in this role.</p>`
    : "";

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:20px">Rubicon Redsox</h1>
      </div>
      <h2 style="margin:0 0 8px">You're Invited!</h2>
      <p style="color:#666;margin:0 0 16px">
        ${opts.inviterName} has invited you to join Rubicon Redsox as a <strong>${roleLabel}</strong>.
      </p>
      ${teamInfo}
      ${replacingInfo}
      <p style="color:#666;margin:0 0 20px">
        Click the button below to create your account and get started.
      </p>
      <a href="${acceptUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
        Accept Invitation
      </a>
      <p style="color:#999;font-size:12px;margin-top:24px">
        This invitation expires on ${expiresFormatted}. If you didn't expect this, you can safely ignore it.
      </p>
    </div>
  `;

  await send(opts.to, `You're invited to Rubicon Redsox${opts.teamName ? ` — ${opts.teamName}` : ""}`, html);
}

export async function sendReplacementNotification(opts: {
  to: string;
  replacedName: string;
  newPersonName: string;
  teamName: string;
  role: string;
}) {
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:20px">Rubicon Redsox</h1>
      </div>
      <h2 style="margin:0 0 8px">Team Role Change</h2>
      <p style="color:#666;margin:0 0 16px">
        Hi ${opts.replacedName}, this is to let you know that your role has changed on <strong>${opts.teamName}</strong>.
      </p>
      <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:20px">
        <p style="margin:0 0 4px"><strong>Team:</strong> ${opts.teamName}</p>
        <p style="margin:0 0 4px"><strong>Previous Role:</strong> ${opts.role}</p>
        <p style="margin:0"><strong>New ${opts.role}:</strong> ${opts.newPersonName}</p>
      </div>
      <p style="color:#666;margin:0 0 20px">
        You have been removed from the ${opts.role} role for ${opts.teamName}. 
        If you have questions, please reach out to your league administrator.
      </p>
    </div>
  `;

  await send(opts.to, `Role change: ${opts.teamName}`, html);
}

export async function sendSignupConfirmation(opts: {
  to: string;
  name: string;
  jobName: string;
  eventTitle: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  cancelToken: string;
  mySignupsToken: string;
}) {
  const cancelUrl = `${APP_URL}/cancel-signup?token=${opts.cancelToken}`;
  const mySignupsUrl = `${APP_URL}/my-signups?token=${opts.mySignupsToken}`;
  const calendarUrl = `${APP_URL}/api/signup/calendar/all/${opts.mySignupsToken}.ics`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:20px">Rubicon Redsox</h1>
      </div>
      <h2 style="margin:0 0 8px">You're signed up, ${opts.name}!</h2>
      <p style="color:#666;margin:0 0 16px">
        Thanks for volunteering. Here are the details:
      </p>
      <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:20px">
        <p style="margin:0 0 4px"><strong>Job:</strong> ${opts.jobName}</p>
        <p style="margin:0 0 4px"><strong>Event:</strong> ${opts.eventTitle}</p>
        <p style="margin:0 0 4px"><strong>Date:</strong> ${opts.eventDate}</p>
        <p style="margin:0"><strong>Location:</strong> ${opts.location}</p>
      </div>
      <div style="margin-bottom:20px">
        <a href="${calendarUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
          📅 Add All Signups to Calendar
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
      <div style="margin-bottom:16px">
        <a href="${cancelUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:13px">
          Cancel This Signup
        </a>
      </div>
      <a href="${mySignupsUrl}" style="display:inline-block;background:#f3f4f6;color:#374151;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:13px;border:1px solid #e5e7eb">
        View All My Signups
      </a>
    </div>
  `;

  await send(opts.to, `Signup confirmed: ${opts.jobName} — ${opts.eventTitle}`, html);
}

export async function sendMagicLink(opts: {
  to: string;
  token: string;
}) {
  const url = `${APP_URL}/my-signups?token=${opts.token}`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:20px">Rubicon Redsox</h1>
      </div>
      <h2 style="margin:0 0 8px">View Your Signups</h2>
      <p style="color:#666;margin:0 0 20px">
        Click below to view and manage your volunteer signups.
        This link expires in 30 minutes.
      </p>
      <a href="${url}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
        View My Signups
      </a>
      <p style="color:#999;font-size:12px;margin-top:24px">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  await send(opts.to, "Your Rubicon Redsox signup link", html);
}

export async function sendSlotRequestNotification(opts: {
  to: string;
  recipientName: string;
  requestingTeamName: string;
  requesterName: string;
  eventTitle: string;
  eventDate: string;
  facilityName: string;
  reason: string | null;
  requestId: string;
}) {
  const date = new Date(opts.eventDate);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dashboardUrl = `${APP_URL}/dashboard/schedules`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:20px">Rubicon Redsox</h1>
      </div>
      <h2 style="margin:0 0 8px">Time Slot Request</h2>
      <p style="color:#666;margin:0 0 16px">
        Hi ${opts.recipientName}, <strong>${opts.requesterName}</strong> from <strong>${opts.requestingTeamName}</strong>
        is requesting your time slot.
      </p>
      <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:20px">
        <p style="margin:0 0 4px"><strong>Event:</strong> ${opts.eventTitle}</p>
        <p style="margin:0 0 4px"><strong>Date:</strong> ${formattedDate} at ${formattedTime}</p>
        <p style="margin:0"><strong>Facility:</strong> ${opts.facilityName}</p>
        ${opts.reason ? `<p style="margin:8px 0 0"><strong>Reason:</strong> ${opts.reason}</p>` : ""}
      </div>
      <a href="${dashboardUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
        Review Request
      </a>
      <p style="color:#999;font-size:12px;margin-top:24px">
        Log in to the dashboard to approve or deny this request.
      </p>
    </div>
  `;

  await send(opts.to, `Time slot request: ${opts.requestingTeamName} wants your ${opts.eventTitle} slot`, html);
}

export async function sendSlotRequestResponse(opts: {
  to: string;
  recipientName: string;
  approved: boolean;
  eventTitle: string;
  eventDate: string;
  ownerTeamName: string;
  requestingTeamName: string;
  responderName: string;
}) {
  const date = new Date(opts.eventDate);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const status = opts.approved ? "Approved" : "Denied";
  const dashboardUrl = `${APP_URL}/dashboard/schedules`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:20px">Rubicon Redsox</h1>
      </div>
      <h2 style="margin:0 0 8px">Time Slot Request ${status}</h2>
      <p style="color:#666;margin:0 0 16px">
        Hi ${opts.recipientName}, the time slot request from <strong>${opts.requestingTeamName}</strong>
        for <strong>${opts.ownerTeamName}</strong>&apos;s slot has been <strong>${status.toLowerCase()}</strong>
        by ${opts.responderName}.
      </p>
      <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:20px">
        <p style="margin:0 0 4px"><strong>Event:</strong> ${opts.eventTitle}</p>
        <p style="margin:0 0 4px"><strong>Date:</strong> ${formattedDate}</p>
        <p style="margin:0"><strong>Status:</strong> <span style="color:${opts.approved ? "#16a34a" : "#dc2626"};font-weight:bold">${status}</span></p>
      </div>
      ${
        opts.approved
          ? `<p style="color:#16a34a;font-weight:600">The time slot has been transferred to ${opts.requestingTeamName}. Check the schedule for updates.</p>`
          : `<p style="color:#666">You can view other available slots on the schedule.</p>`
      }
      <a href="${dashboardUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin-top:12px">
        View Schedule
      </a>
    </div>
  `;

  await send(opts.to, `Time slot request ${status.toLowerCase()}: ${opts.eventTitle}`, html);
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  token: string;
}) {
  const resetUrl = `${APP_URL}/reset-password?token=${opts.token}`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:20px">Rubicon Redsox</h1>
      </div>
      <h2 style="margin:0 0 8px">Reset Your Password</h2>
      <p style="color:#666;margin:0 0 20px">
        We received a request to reset your password. Click the button below to choose a new one.
        This link expires in 1 hour.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
        Reset Password
      </a>
      <p style="color:#999;font-size:12px;margin-top:24px">
        If you didn't request a password reset, you can safely ignore this email.
        Your password will not be changed.
      </p>
    </div>
  `;

  await send(opts.to, "Reset your Rubicon Redsox password", html);
}

export async function sendJobCancellationNotification(opts: {
  to: string;
  name: string;
  jobName: string;
  eventTitle: string;
  eventDate: string;
  location: string;
  reason: string;
}) {
  const date = opts.eventDate ? new Date(opts.eventDate) : null;
  const formattedDate = date
    ? date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const helpWantedUrl = `${APP_URL}/help-wanted`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:20px">Rubicon Redsox</h1>
      </div>
      <h2 style="margin:0 0 8px">Signup Cancelled</h2>
      <p style="color:#666;margin:0 0 16px">
        Hi ${opts.name}, your volunteer signup has been cancelled.
      </p>
      <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:20px">
        <p style="margin:0 0 4px"><strong>Job:</strong> ${opts.jobName}</p>
        <p style="margin:0 0 4px"><strong>Event:</strong> ${opts.eventTitle}</p>
        ${formattedDate ? `<p style="margin:0 0 4px"><strong>Date:</strong> ${formattedDate}</p>` : ""}
        ${opts.location ? `<p style="margin:0 0 4px"><strong>Location:</strong> ${opts.location}</p>` : ""}
        <p style="margin:8px 0 0;color:#dc2626"><strong>Reason:</strong> ${opts.reason}</p>
      </div>
      <p style="color:#666;margin:0 0 20px">
        If you'd like to sign up for other available positions, please visit the Help Wanted board.
      </p>
      <a href="${helpWantedUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
        View Help Wanted
      </a>
    </div>
  `;

  await send(opts.to, `Signup cancelled: ${opts.jobName} - ${opts.eventTitle}`, html);
}

export async function sendAdminVolunteerCancellationAlert(opts: {
  to: string;
  recipientName: string;
  volunteerName: string | null;
  volunteerEmail: string | null;
  jobName: string;
  eventTitle: string;
  eventDate: string;
  location: string;
}) {
  const helpWantedUrl = `${APP_URL}/help-wanted`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:20px">Rubicon Redsox</h1>
      </div>
      <h2 style="margin:0 0 8px">Volunteer shift cancelled</h2>
      <p style="color:#666;margin:0 0 16px">Hi ${opts.recipientName}, a volunteer cancelled a signup.</p>
      <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:20px">
        <p style="margin:0 0 4px"><strong>Volunteer:</strong> ${opts.volunteerName || "Unknown"}${opts.volunteerEmail ? ` (${opts.volunteerEmail})` : ""}</p>
        <p style="margin:0 0 4px"><strong>Job:</strong> ${opts.jobName}</p>
        <p style="margin:0 0 4px"><strong>Event:</strong> ${opts.eventTitle}</p>
        <p style="margin:0 0 4px"><strong>When:</strong> ${opts.eventDate}</p>
        ${opts.location ? `<p style="margin:0"><strong>Location:</strong> ${opts.location}</p>` : ""}
      </div>
      <a href="${helpWantedUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
        Open Volunteer Signup
      </a>
    </div>
  `;

  await send(
    opts.to,
    `Shift cancelled: ${opts.jobName} — ${opts.eventTitle}`,
    html
  );
}

export async function sendAdminUnfilledJobsAlert(opts: {
  to: string;
  recipientName: string;
  title: string;
  intro: string;
  lines: string[];
}) {
  const listHtml =
    opts.lines.length === 0
      ? "<p style='color:#666'>No open shifts in this window.</p>"
      : `<ul style="margin:0;padding-left:20px;color:#333">${opts.lines.map((l) => `<li style="margin:4px 0">${l}</li>`).join("")}</ul>`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:20px">Rubicon Redsox</h1>
      </div>
      <h2 style="margin:0 0 8px">${opts.title}</h2>
      <p style="color:#666;margin:0 0 16px">${opts.intro}</p>
      ${listHtml}
      <p style="margin-top:20px">
        <a href="${APP_URL}/help-wanted" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">Volunteer Signup</a>
      </p>
    </div>
  `;

  await send(opts.to, opts.title, html);
}

export async function sendEventAddedNotification(opts: {
  to: string;
  eventTitle: string;
  eventDate: string;
  eventId?: string;
  teamName?: string | null;
  location?: string | null;
}) {
  const scheduleLink = opts.eventId
    ? `${APP_URL}/dashboard/schedules?event=${opts.eventId}`
    : `${APP_URL}/dashboard/schedules`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:20px">Rubicon Redsox</h1>
      </div>
      <h2 style="margin:0 0 8px">New Event Added</h2>
      <p style="color:#666;margin:0 0 16px">A new event has been added to the schedule.</p>
      <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:20px">
        <p style="margin:0 0 4px"><strong>Event:</strong> ${opts.eventTitle}</p>
        <p style="margin:0 0 4px"><strong>When:</strong> ${opts.eventDate}</p>
        ${opts.teamName ? `<p style="margin:0 0 4px"><strong>Team:</strong> ${opts.teamName}</p>` : ""}
        ${opts.location ? `<p style="margin:0"><strong>Location:</strong> ${opts.location}</p>` : ""}
      </div>
      <a href="${scheduleLink}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
        View Event
      </a>
    </div>
  `;
  await send(opts.to, `New event: ${opts.eventTitle}`, html);
}

export async function sendEventCancelledNotification(opts: {
  to: string;
  eventTitle: string;
  eventDate: string;
  eventId?: string;
  teamName?: string | null;
  location?: string | null;
  volunteers?: { jobName: string; name: string | null; email: string | null }[];
}) {
  const volunteerRows = (opts.volunteers ?? [])
    .map(
      (v) =>
        `<tr>
          <td style="padding:4px 8px;border-bottom:1px solid #fecaca;font-size:13px">${v.jobName}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #fecaca;font-size:13px">${v.name || "—"}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #fecaca;font-size:13px">${v.email || "—"}</td>
        </tr>`
    )
    .join("");

  const volunteersSection =
    volunteerRows
      ? `<div style="margin-bottom:20px">
          <p style="margin:0 0 8px;font-weight:600;font-size:14px;color:#333">Affected Volunteers</p>
          <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:6px;overflow:hidden;border:1px solid #fecaca">
            <thead>
              <tr style="background:#fef2f2">
                <th style="padding:6px 8px;text-align:left;font-size:11px;text-transform:uppercase;color:#666;font-weight:600">Job</th>
                <th style="padding:6px 8px;text-align:left;font-size:11px;text-transform:uppercase;color:#666;font-weight:600">Name</th>
                <th style="padding:6px 8px;text-align:left;font-size:11px;text-transform:uppercase;color:#666;font-weight:600">Email</th>
              </tr>
            </thead>
            <tbody>${volunteerRows}</tbody>
          </table>
        </div>`
      : "";

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:20px">Rubicon Redsox</h1>
      </div>
      <h2 style="margin:0 0 8px;color:#dc2626">Event Cancelled</h2>
      <p style="color:#666;margin:0 0 16px">The following event has been removed from the schedule.</p>
      <div style="background:#fef2f2;border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid #fecaca">
        <p style="margin:0 0 4px"><strong>Event:</strong> ${opts.eventTitle}</p>
        <p style="margin:0 0 4px"><strong>Was scheduled:</strong> ${opts.eventDate}</p>
        ${opts.teamName ? `<p style="margin:0 0 4px"><strong>Team:</strong> ${opts.teamName}</p>` : ""}
        ${opts.location ? `<p style="margin:0"><strong>Location:</strong> ${opts.location}</p>` : ""}
      </div>
      ${volunteersSection}
      <div style="display:flex;gap:8px">
        <a href="${APP_URL}/dashboard/reports?tab=cancelled${opts.eventId ? `&event=${opts.eventId}` : ""}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
          View Cancelled Event
        </a>
        <a href="${APP_URL}/dashboard/schedules" style="display:inline-block;background:#f3f4f6;color:#374151;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
          View Schedule
        </a>
      </div>
    </div>
  `;
  await send(opts.to, `Event cancelled: ${opts.eventTitle}`, html);
}

export async function sendEventTimeChangedNotification(opts: {
  to: string;
  eventTitle: string;
  oldTime: string;
  newTime: string;
  eventId?: string;
  teamName?: string | null;
  location?: string | null;
}) {
  const scheduleLink = opts.eventId
    ? `${APP_URL}/dashboard/schedules?event=${opts.eventId}`
    : `${APP_URL}/dashboard/schedules`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:20px">Rubicon Redsox</h1>
      </div>
      <h2 style="margin:0 0 8px">Schedule Change</h2>
      <p style="color:#666;margin:0 0 16px">The date or time for an event has been updated.</p>
      <div style="background:#fffbeb;border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid #fde68a">
        <p style="margin:0 0 4px"><strong>Event:</strong> ${opts.eventTitle}</p>
        <p style="margin:0 0 4px;color:#dc2626;text-decoration:line-through"><strong>Was:</strong> ${opts.oldTime}</p>
        <p style="margin:0 0 4px;color:#16a34a"><strong>Now:</strong> ${opts.newTime}</p>
        ${opts.teamName ? `<p style="margin:0 0 4px"><strong>Team:</strong> ${opts.teamName}</p>` : ""}
        ${opts.location ? `<p style="margin:0"><strong>Location:</strong> ${opts.location}</p>` : ""}
      </div>
      <a href="${scheduleLink}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
        View Event
      </a>
    </div>
  `;
  await send(opts.to, `Schedule change: ${opts.eventTitle}`, html);
}

export async function sendVolunteerEventCancelledEmail(opts: {
  to: string;
  volunteerName: string;
  jobName: string;
  eventTitle: string;
  eventDate: string;
  location?: string | null;
  eventId?: string;
}) {
  const cancelledUrl = opts.eventId
    ? `${APP_URL}/dashboard/reports?tab=cancelled&event=${opts.eventId}`
    : `${APP_URL}/help-wanted`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:20px">Rubicon Redsox</h1>
      </div>
      <h2 style="margin:0 0 8px;color:#dc2626">Event Cancelled</h2>
      <p style="color:#666;margin:0 0 16px">
        Hi ${opts.volunteerName}, the event you signed up for has been cancelled.
      </p>
      <div style="background:#fef2f2;border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid #fecaca">
        <p style="margin:0 0 4px"><strong>Your job:</strong> ${opts.jobName}</p>
        <p style="margin:0 0 4px"><strong>Event:</strong> ${opts.eventTitle}</p>
        <p style="margin:0 0 4px"><strong>Was scheduled:</strong> ${opts.eventDate}</p>
        ${opts.location ? `<p style="margin:0"><strong>Location:</strong> ${opts.location}</p>` : ""}
      </div>
      <p style="color:#666;margin:0 0 20px">
        Your signup has been automatically removed. If you'd like to volunteer for other events, check the Help Wanted board.
      </p>
      <a href="${APP_URL}/help-wanted" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
        View Help Wanted
      </a>
    </div>
  `;
  await send(opts.to, `Event cancelled: ${opts.jobName} — ${opts.eventTitle}`, html);
}

export async function sendVolunteerEventTimeChangedEmail(opts: {
  to: string;
  volunteerName: string;
  jobName: string;
  eventTitle: string;
  oldTime: string;
  newTime: string;
  location?: string | null;
  eventId?: string;
}) {
  const scheduleLink = opts.eventId
    ? `${APP_URL}/dashboard/schedules?event=${opts.eventId}`
    : `${APP_URL}/schedule`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:20px">Rubicon Redsox</h1>
      </div>
      <h2 style="margin:0 0 8px">Event Time Changed</h2>
      <p style="color:#666;margin:0 0 16px">
        Hi ${opts.volunteerName}, the event you signed up for has been rescheduled.
      </p>
      <div style="background:#fffbeb;border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid #fde68a">
        <p style="margin:0 0 4px"><strong>Your job:</strong> ${opts.jobName}</p>
        <p style="margin:0 0 4px"><strong>Event:</strong> ${opts.eventTitle}</p>
        <p style="margin:0 0 4px;color:#dc2626;text-decoration:line-through"><strong>Was:</strong> ${opts.oldTime}</p>
        <p style="margin:0 0 4px;color:#16a34a"><strong>Now:</strong> ${opts.newTime}</p>
        ${opts.location ? `<p style="margin:0"><strong>Location:</strong> ${opts.location}</p>` : ""}
      </div>
      <p style="color:#666;margin:0 0 20px">
        Your signup is still active for the new time. If you can no longer make it, please cancel your signup.
      </p>
      <a href="${scheduleLink}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
        View Event
      </a>
    </div>
  `;
  await send(opts.to, `Time changed: ${opts.jobName} — ${opts.eventTitle}`, html);
}
