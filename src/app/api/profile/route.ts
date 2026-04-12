import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  NotifyTrigger,
  NotificationChannel,
  NotifScope,
} from "@prisma/client";

const VALID_TRIGGERS = new Set<string>(Object.values(NotifyTrigger));
const VALID_NOTIF_CHANNELS = new Set<string>(Object.values(NotificationChannel));
const VALID_SCOPES = new Set<string>(Object.values(NotifScope));

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [dbUser, teams] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        smsEnabled: true,
        notificationSubscriptions: {
          where: { userId: user.id },
          select: { trigger: true, channel: true, enabled: true, scope: true, teamId: true },
        },
      },
    }),
    prisma.team.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ ...dbUser, teams });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, phone, smsEnabled, currentPassword, newPassword, eventNotificationPrefs } = body;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }
  }

  if (email && email !== dbUser.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
  }

  const data: Record<string, unknown> = {};
  if (name && name.trim()) data.name = name.trim();
  if (email && email.trim()) data.email = email.trim().toLowerCase();
  if (phone !== undefined) data.phone = phone?.trim() || null;
  if (smsEnabled !== undefined) data.smsEnabled = Boolean(smsEnabled);
  if (newPassword) data.passwordHash = await bcrypt.hash(newPassword, 12);

  const hasEventPrefs = Array.isArray(eventNotificationPrefs);
  if (hasEventPrefs) {
    for (const row of eventNotificationPrefs as {
      trigger?: string;
      channel?: string;
      enabled?: boolean;
      scope?: string;
      teamId?: string | null;
    }[]) {
      if (!row?.trigger || !VALID_TRIGGERS.has(row.trigger)) continue;
      const enabled = Boolean(row.enabled);
      const scope = row.scope && VALID_SCOPES.has(row.scope)
        ? (row.scope as NotifScope)
        : NotifScope.MY_TEAMS;
      const teamId = scope === NotifScope.SPECIFIC_TEAM && row.teamId ? row.teamId : null;
      const trigger = row.trigger as NotifyTrigger;

      const isBoth = row.channel === "BOTH";
      const channels: NotificationChannel[] = isBoth
        ? [NotificationChannel.EMAIL, NotificationChannel.SMS]
        : [row.channel === "SMS" ? NotificationChannel.SMS : NotificationChannel.EMAIL];

      const existing = await prisma.notificationSubscription.findMany({
        where: { userId: user.id, trigger, organizationId: user.organizationId },
        select: { id: true, channel: true },
      });

      const existingByChannel = new Map(existing.map((e) => [e.channel, e.id]));

      for (const ch of channels) {
        const existingId = existingByChannel.get(ch);
        if (existingId) {
          await prisma.notificationSubscription.update({
            where: { id: existingId },
            data: { enabled, scope, teamId },
          });
        } else {
          await prisma.notificationSubscription.create({
            data: {
              userId: user.id,
              organizationId: user.organizationId,
              trigger,
              channel: ch,
              enabled,
              scope,
              teamId,
            },
          });
        }
        existingByChannel.delete(ch);
      }

      for (const [, obsoleteId] of existingByChannel) {
        await prisma.notificationSubscription.update({
          where: { id: obsoleteId },
          data: { enabled: false },
        });
      }
    }
  }

  if (Object.keys(data).length === 0 && !hasEventPrefs) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const select = {
    id: true,
    email: true,
    name: true,
    role: true,
    phone: true,
    smsEnabled: true,
  };

  const updated = Object.keys(data).length > 0
    ? await prisma.user.update({ where: { id: user.id }, data, select })
    : await prisma.user.findUnique({ where: { id: user.id }, select });

  return NextResponse.json(updated);
}
