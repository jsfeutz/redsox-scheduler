import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  AdminNotifyChannel,
  AdminNotifyEvent,
  UserRole,
} from "@prisma/client";

const NOTIFY_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.SCHEDULE_MANAGER];

const VALID_EVENTS = new Set<string>(Object.values(AdminNotifyEvent));
const VALID_CHANNELS = new Set<string>(Object.values(AdminNotifyChannel));

function canManageNotificationPrefs(role: UserRole) {
  return NOTIFY_ROLES.includes(role);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      smsEnabled: true,
      adminNotificationPrefs: canManageNotificationPrefs(user.role as UserRole)
        ? { select: { event: true, channel: true, enabled: true } }
        : false,
    },
  });

  return NextResponse.json(dbUser);
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, phone, smsEnabled, currentPassword, newPassword, notificationPrefs } =
    body;

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

  const hasPrefs =
    Array.isArray(notificationPrefs) && canManageNotificationPrefs(dbUser.role);

  if (hasPrefs) {
    for (const row of notificationPrefs as {
      event?: string;
      channel?: string;
      enabled?: boolean;
    }[]) {
      if (!row?.event || !VALID_EVENTS.has(row.event)) continue;
      const ch = row.channel && VALID_CHANNELS.has(row.channel) ? row.channel : "EMAIL";
      await prisma.adminNotificationPref.upsert({
        where: {
          userId_event: {
            userId: user.id,
            event: row.event as AdminNotifyEvent,
          },
        },
        create: {
          userId: user.id,
          event: row.event as AdminNotifyEvent,
          channel: ch as AdminNotifyChannel,
          enabled: Boolean(row.enabled),
        },
        update: {
          channel: ch as AdminNotifyChannel,
          enabled: Boolean(row.enabled),
        },
      });
    }
  }

  if (Object.keys(data).length === 0 && !hasPrefs) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  let updated;
  if (Object.keys(data).length > 0) {
    updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        smsEnabled: true,
        adminNotificationPrefs: canManageNotificationPrefs(user.role as UserRole)
          ? { select: { event: true, channel: true, enabled: true } }
          : false,
      },
    });
  } else {
    updated = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        smsEnabled: true,
        adminNotificationPrefs: canManageNotificationPrefs(user.role as UserRole)
          ? { select: { event: true, channel: true, enabled: true } }
          : false,
      },
    });
  }

  return NextResponse.json(updated);
}
