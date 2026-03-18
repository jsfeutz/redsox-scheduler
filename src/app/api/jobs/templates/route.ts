import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  canManageSchedule,
  isOrgAdmin,
} from "@/lib/auth-helpers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await prisma.jobTemplate.findMany({
    where: {
      organizationId: user.organizationId,
      teamId: null,
    },
    include: {
      _count: { select: { gameJobs: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageSchedule(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, scope, forEventType, hoursPerGame, maxSlots } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  if (scope !== "TEAM" && scope !== "FACILITY") {
    return NextResponse.json(
      { error: "Scope must be TEAM or FACILITY" },
      { status: 400 }
    );
  }

  if (scope === "FACILITY" && !isOrgAdmin(user.role)) {
    return NextResponse.json(
      { error: "Only admins can create facility-scoped templates" },
      { status: 403 }
    );
  }

  const validEventTypes = ["ALL", "GAME", "PRACTICE", "OTHER"];
  const template = await prisma.jobTemplate.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      scope,
      forEventType: validEventTypes.includes(forEventType) ? forEventType : "ALL",
      hoursPerGame: typeof hoursPerGame === "number" ? hoursPerGame : 2,
      maxSlots: typeof maxSlots === "number" && maxSlots >= 1 ? maxSlots : 1,
      organizationId: user.organizationId,
    },
    include: {
      _count: { select: { gameJobs: true } },
    },
  });

  return NextResponse.json(template, { status: 201 });
}
