import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  canManageSchedule,
  isOrgAdmin,
} from "@/lib/auth-helpers";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageSchedule(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.jobTemplate.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, description, scope, forEventType, hoursPerGame, maxSlots, active, askComfortLevel } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const effectiveScope = scope || existing.scope;

  if (effectiveScope === "FACILITY" && !isOrgAdmin(user.role)) {
    return NextResponse.json(
      { error: "Only admins can manage facility-scoped templates" },
      { status: 403 }
    );
  }

  const validEventTypes = ["ALL", "GAME", "PRACTICE", "OTHER"];
  const newForEventType =
    typeof forEventType === "string" && validEventTypes.includes(forEventType)
      ? forEventType
      : undefined;

  try {
    const template = await prisma.jobTemplate.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        scope: effectiveScope,
        ...(newForEventType !== undefined ? { forEventType: newForEventType } : {}),
        hoursPerGame: typeof hoursPerGame === "number" ? hoursPerGame : undefined,
        maxSlots: typeof maxSlots === "number" && maxSlots >= 1 ? maxSlots : undefined,
        active: typeof active === "boolean" ? active : undefined,
        askComfortLevel:
          typeof askComfortLevel === "boolean" ? askComfortLevel : undefined,
      },
      include: {
        _count: { select: { gameJobs: true } },
      },
    });

    // Clean up future GameJobs that no longer match the event type
    if (
      newForEventType &&
      newForEventType !== "ALL" &&
      newForEventType !== existing.forEventType
    ) {
      const now = new Date();
      const mismatchedJobs = await prisma.gameJob.findMany({
        where: {
          jobTemplateId: id,
          scheduleEventId: { not: null },
          scheduleEvent: {
            startTime: { gte: now },
            type: { not: newForEventType as "GAME" | "PRACTICE" | "OTHER" },
          },
        },
        select: { id: true },
      });
      if (mismatchedJobs.length > 0) {
        await prisma.jobAssignment.deleteMany({
          where: { gameJobId: { in: mismatchedJobs.map((j) => j.id) } },
        });
        await prisma.gameJob.deleteMany({
          where: { id: { in: mismatchedJobs.map((j) => j.id) } },
        });
      }
    }

    return NextResponse.json(template);
  } catch (err) {
    console.error("[templates PUT]", err);
    const msg =
      err instanceof Error ? err.message : "Failed to update template";
    if (msg.includes("askComfortLevel") || msg.includes("does not exist")) {
      return NextResponse.json(
        {
          error:
            "Database is out of date. Run: npx prisma migrate deploy (or migrate dev) and restart the app.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageSchedule(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.jobTemplate.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await prisma.jobTemplate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
