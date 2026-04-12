import {
  SNSClient,
  PublishCommand,
  GetSMSSandboxAccountStatusCommand,
  ListSMSSandboxPhoneNumbersCommand,
} from "@aws-sdk/client-sns";
import { prisma } from "@/lib/prisma";

const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID_SNS;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY_SNS;
const REGION = process.env.AWS_REGION_SNS || "us-east-2";
/** E.164 toll-free or long code registered for SMS in this account (e.g. +18775578090). */
const SMS_ORIGINATION_NUMBER = process.env.SMS_ORIGINATION_NUMBER?.trim();

let snsClient: SNSClient | null = null;

const SANDBOX_CACHE_MS = 2 * 60 * 1000;
type SandboxCache =
  | { inSandbox: false; at: number }
  | { inSandbox: true; verified: ReadonlySet<string>; at: number };
let sandboxCache: SandboxCache | null = null;

async function getVerifiedSandboxDestinations(
  client: SNSClient
): Promise<Set<string>> {
  const verified = new Set<string>();
  let nextToken: string | undefined;
  do {
    const list = await client.send(
      new ListSMSSandboxPhoneNumbersCommand({ NextToken: nextToken })
    );
    for (const row of list.PhoneNumbers ?? []) {
      if (row.PhoneNumber && row.Status === "Verified") {
        verified.add(row.PhoneNumber);
      }
    }
    nextToken = list.NextToken;
  } while (nextToken);
  return verified;
}

/** When the account is in the SMS sandbox, only verified destinations receive SMS. */
async function assertSandboxAllowsDestination(
  client: SNSClient,
  formatted: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const now = Date.now();
  if (sandboxCache && now - sandboxCache.at < SANDBOX_CACHE_MS) {
    if (!sandboxCache.inSandbox) return { ok: true };
    return sandboxCache.verified.has(formatted)
      ? { ok: true }
      : {
          ok: false,
          reason:
            "SMS sandbox: this number is not verified (complete OTP in SNS → Text messaging → Sandbox, or exit the sandbox).",
        };
  }

  const status = await client.send(new GetSMSSandboxAccountStatusCommand({}));
  if (!status.IsInSandbox) {
    sandboxCache = { inSandbox: false, at: now };
    return { ok: true };
  }

  const verified = await getVerifiedSandboxDestinations(client);
  sandboxCache = { inSandbox: true, verified, at: now };

  return verified.has(formatted)
    ? { ok: true }
    : {
        ok: false,
        reason:
          "SMS sandbox: this number is not verified (complete OTP in SNS → Text messaging → Sandbox, or exit the sandbox).",
      };
}

function getClient(): SNSClient | null {
  if (!ACCESS_KEY || !SECRET_KEY) return null;
  if (!snsClient) {
    snsClient = new SNSClient({
      region: REGION,
      credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
    });
  }
  return snsClient;
}

/**
 * Normalize a US phone number to E.164 format (+1XXXXXXXXXX).
 * Returns null if the input can't be parsed into 10 digits.
 */
export function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.startsWith("+") && digits.length >= 11) return raw.trim();
  return null;
}

export async function sendSms(
  phone: string,
  message: string,
  opts?: {
    type?:
      | "JOB_REMINDER"
      | "SCHEDULE_CHANGE"
      | "SIGNUP_CONFIRM"
      | "CANCELLATION"
      | "ADMIN_ALERT";
    relatedEventId?: string;
    relatedJobId?: string;
    relatedAssignId?: string;
    reminderKey?: string;
  }
): Promise<{ success: boolean; messageId?: string }> {
  const formatted = toE164(phone);
  if (!formatted) {
    console.log(`[SMS] Invalid phone number: ${phone}`);
    return { success: false };
  }

  const client = getClient();
  if (!client) {
    console.log(`[SMS] (no AWS credentials) To: ${formatted} | ${message}`);
    return { success: false };
  }

  try {
    try {
      const gate = await assertSandboxAllowsDestination(client, formatted);
      if (!gate.ok) {
        console.error(`[SMS] ${gate.reason} To: ${formatted}`);
        await prisma.notificationLog.create({
          data: {
            type: opts?.type ?? "SIGNUP_CONFIRM",
            channel: "SMS",
            recipientPhone: formatted,
            message,
            status: "FAILED",
            error: gate.reason,
            relatedEventId: opts?.relatedEventId,
            relatedJobId: opts?.relatedJobId,
            relatedAssignId: opts?.relatedAssignId,
            reminderKey: opts?.reminderKey,
          },
        });
        return { success: false };
      }
    } catch (sandboxErr) {
      console.warn(
        `[SMS] Could not verify SMS sandbox status (check IAM: GetSMSSandboxAccountStatus, ListSMSSandboxPhoneNumbers). Proceeding with send. ${sandboxErr instanceof Error ? sandboxErr.message : sandboxErr}`
      );
    }

    const messageAttributes: Record<
      string,
      { DataType: string; StringValue: string }
    > = {
      "AWS.SNS.SMS.SMSType": {
        DataType: "String",
        StringValue: "Transactional",
      },
    };
    if (SMS_ORIGINATION_NUMBER?.startsWith("+")) {
      messageAttributes["AWS.MM.SMS.OriginationNumber"] = {
        DataType: "String",
        StringValue: SMS_ORIGINATION_NUMBER,
      };
    }

    const result = await client.send(
      new PublishCommand({
        PhoneNumber: formatted,
        Message: message,
        MessageAttributes: messageAttributes,
      })
    );

    await prisma.notificationLog.create({
      data: {
        type: opts?.type ?? "SIGNUP_CONFIRM",
        channel: "SMS",
        recipientPhone: formatted,
        message,
        status: "SENT",
        relatedEventId: opts?.relatedEventId,
        relatedJobId: opts?.relatedJobId,
        relatedAssignId: opts?.relatedAssignId,
        reminderKey: opts?.reminderKey,
      },
    });

    console.log(`[SMS] Sent to ${formatted} | MessageId: ${result.MessageId}`);
    return { success: true, messageId: result.MessageId };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[SMS] Failed to send to ${formatted}: ${error}`);

    try {
      await prisma.notificationLog.create({
        data: {
          type: opts?.type ?? "SIGNUP_CONFIRM",
          channel: "SMS",
          recipientPhone: formatted,
          message,
          status: "FAILED",
          error,
          relatedEventId: opts?.relatedEventId,
          relatedJobId: opts?.relatedJobId,
          relatedAssignId: opts?.relatedAssignId,
          reminderKey: opts?.reminderKey,
        },
      });
    } catch {
      // logging failure shouldn't throw
    }

    return { success: false };
  }
}
