import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isOrgAdmin } from "@/lib/auth-helpers";
import type { NotifyTrigger, NotificationChannel } from "@prisma/client";

const VALID_TRIGGERS: NotifyTrigger[] = [
  "EVENT_ADDED",
  "EVENT_CANCELLED",
  "EVENT_TIME_CHANGED",
  "JOB_SIGNUP_CANCELLED",
];
const VALID_CHANNELS: NotificationChannel[] = ["EMAIL", "SMS"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOrgAdmin(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rules = await prisma.notificationSubscription.findMany({
    where: { organizationId: user.organizationId, userId: null },
    include: { team: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rules);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOrgAdmin(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { trigger, triggers, channel, recipientEmail, recipientPhone, teamId } = body as {
    trigger?: string;
    triggers?: string[];
    channel?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    teamId?: string | null;
  };

  const triggerList: string[] = triggers?.length ? triggers : trigger ? [trigger] : [];
  if (triggerList.length === 0)
    return NextResponse.json({ error: "At least one trigger is required" }, { status: 400 });
  for (const t of triggerList) {
    if (!VALID_TRIGGERS.includes(t as NotifyTrigger))
      return NextResponse.json({ error: `Invalid trigger: ${t}` }, { status: 400 });
  }

  const channels: NotificationChannel[] =
    channel === "BOTH"
      ? ["EMAIL", "SMS"]
      : VALID_CHANNELS.includes(channel as NotificationChannel)
        ? [channel as NotificationChannel]
        : [];

  if (channels.length === 0)
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  if (channels.includes("EMAIL") && !recipientEmail)
    return NextResponse.json({ error: "recipientEmail required for EMAIL channel" }, { status: 400 });
  if (channels.includes("SMS") && !recipientPhone)
    return NextResponse.json({ error: "recipientPhone required for SMS channel" }, { status: 400 });

  const creates = triggerList.flatMap((t) =>
    channels.map((ch) =>
      prisma.notificationSubscription.create({
        data: {
          organizationId: user.organizationId,
          trigger: t as NotifyTrigger,
          channel: ch,
          recipientEmail: ch === "EMAIL" ? (recipientEmail || null) : null,
          recipientPhone: ch === "SMS" ? (recipientPhone || null) : null,
          teamId: teamId || null,
          userId: null,
        },
        include: { team: { select: { id: true, name: true } } },
      })
    )
  );

  const created = await prisma.$transaction(creates);

  return NextResponse.json(created.length === 1 ? created[0] : created, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOrgAdmin(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const rule = await prisma.notificationSubscription.updateMany({
    where: { id, organizationId: user.organizationId, userId: null },
    data: { enabled: !!body.enabled },
  });

  if (rule.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOrgAdmin(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const deleted = await prisma.notificationSubscription.deleteMany({
    where: { id, organizationId: user.organizationId, userId: null },
  });

  if (deleted.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
