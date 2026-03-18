import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageTeam } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string; playerId: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id, playerId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canManageTeam(user, id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const { name, number, active } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name.trim();
  if (number !== undefined) data.number = number?.trim() || null;
  if (active !== undefined) data.active = active;

  const player = await prisma.player.update({
    where: { id: playerId },
    data,
    include: { volunteers: true },
  });

  return NextResponse.json(player);
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id, playerId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canManageTeam(user, id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.player.delete({ where: { id: playerId } });

  return NextResponse.json({ success: true });
}
