import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { prisma } from "@/lib/prisma";

const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID_SNS;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY_SNS;
const REGION = process.env.AWS_REGION_SNS || "us-east-2";

let snsClient: SNSClient | null = null;

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
    const result = await client.send(
      new PublishCommand({
        PhoneNumber: formatted,
        Message: message,
        MessageAttributes: {
          "AWS.SNS.SMS.SMSType": {
            DataType: "String",
            StringValue: "Transactional",
          },
        },
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
