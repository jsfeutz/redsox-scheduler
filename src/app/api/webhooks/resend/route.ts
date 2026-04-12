import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";

/** Inbound address Resend will deliver to after MX + receiving are configured. */
const DEFAULT_SUPPORT = "support@rubiconredsox.com";

function parseEmailAddress(raw: string): string {
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim().toLowerCase();
}

function isForSupportInbox(recipient: string, supportAddr: string): boolean {
  return parseEmailAddress(recipient) === supportAddr.toLowerCase();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type ReceivedEmailApi = {
  from?: string;
  subject?: string | null;
  html?: string | null;
  text?: string | null;
};

async function fetchReceivedEmail(
  emailId: string,
  apiKey: string
): Promise<ReceivedEmailApi | null> {
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    console.error(
      "[resend-inbound] Failed to fetch received email:",
      res.status,
      await res.text().then((t) => t.slice(0, 300))
    );
    return null;
  }
  return (await res.json()) as ReceivedEmailApi;
}

async function forwardSupportMessage(opts: {
  apiKey: string;
  supportFrom: string;
  forwardTo: string;
  received: ReceivedEmailApi;
}): Promise<void> {
  const { apiKey, supportFrom, forwardTo, received } = opts;
  const subj = received.subject?.trim() || "(no subject)";
  const inner =
    received.html ||
    (received.text
      ? `<pre style="white-space:pre-wrap;font-family:system-ui,sans-serif">${escapeHtml(received.text)}</pre>`
      : "<p>(empty body)</p>");
  const html = `
    <p style="font-family:system-ui,sans-serif;font-size:14px;color:#444">
      <strong>Forwarded from ${escapeHtml(supportFrom)}</strong><br/>
      <span style="font-size:12px">Original From: ${escapeHtml(received.from || "?")}</span>
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
    ${inner}
  `;
  const replyTo = received.from ? parseEmailAddress(received.from) : undefined;
  const payload: Record<string, unknown> = {
    from: `Rubicon Redsox Support <${supportFrom}>`,
    to: [forwardTo],
    subject: `[support] ${subj}`,
    html,
  };
  if (replyTo && replyTo.includes("@")) {
    payload.reply_to = replyTo;
  }

  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!sendRes.ok) {
    console.error(
      "[resend-inbound] Forward send failed:",
      sendRes.status,
      await sendRes.text().then((t) => t.slice(0, 400))
    );
  }
}

/**
 * Resend inbound webhook (event `email.received`).
 * Configure in Resend: Webhooks → add URL → event `email.received`.
 * Receiving: enable for `rubiconredsox.com` and add the MX records Resend shows (DNS).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "RESEND_WEBHOOK_SECRET is not configured" },
      { status: 503 }
    );
  }

  const raw = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTs = req.headers.get("svix-timestamp");
  const svixSig = req.headers.get("svix-signature");
  if (!svixId || !svixTs || !svixSig) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    const wh = new Webhook(secret);
    event = wh.verify(raw, {
      "svix-id": svixId,
      "svix-timestamp": svixTs,
      "svix-signature": svixSig,
    }) as { type?: string; data?: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: event.type ?? null });
  }

  const data = event.data ?? {};
  const toRaw = data.to;
  const toList: string[] = Array.isArray(toRaw)
    ? toRaw.map(String)
    : toRaw != null && toRaw !== ""
      ? [String(toRaw)]
      : [];
  const emailId = (data.email_id as string) || (data.id as string);

  const supportAddr =
    process.env.RESEND_INBOUND_SUPPORT_ADDRESS?.trim() || DEFAULT_SUPPORT;

  const matches =
    toList.length > 0 &&
    toList.some((addr) => isForSupportInbox(addr, supportAddr));

  if (!matches || !emailId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const forwardTo = process.env.RESEND_INBOUND_FORWARD_TO?.trim();
  /** Inbound body fetch requires a full-access key; send-only keys return 401. */
  const receiveApiKey =
    process.env.RESEND_API_KEY?.trim() ||
    process.env.RESEND_FULL_ACCESS_KEY?.trim();
  /** Outbound forward can use send-only SMTP key or the same full-access key. */
  const sendApiKey =
    process.env.SMTP_PASS?.trim() || process.env.RESEND_API_KEY?.trim();

  if (forwardTo && receiveApiKey && sendApiKey) {
    const received = await fetchReceivedEmail(emailId, receiveApiKey);
    if (received) {
      await forwardSupportMessage({
        apiKey: sendApiKey,
        supportFrom: supportAddr,
        forwardTo,
        received,
      });
    } else {
      console.error(
        "[resend-inbound] Fetch received email failed (wrong id or RESEND_API_KEY not full-access). email_id=",
        emailId
      );
    }
  } else if (matches) {
    console.error(
      "[resend-inbound] Missing env for forward. Need RESEND_INBOUND_FORWARD_TO, RESEND_API_KEY (full access for /emails/receiving), and SMTP_PASS (or RESEND_API_KEY) to send. email_id=",
      emailId
    );
  }

  return NextResponse.json({ ok: true });
}

export function GET() {
  return NextResponse.json({ ok: true, hint: "POST Resend webhooks here" });
}
