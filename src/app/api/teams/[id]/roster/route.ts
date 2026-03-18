import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageTeam } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const players = await prisma.player.findMany({
    where: { teamId: id },
    include: {
      volunteers: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(players);
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canManageTeam(user, id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const { name, number, volunteers } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Player name is required" }, { status: 400 });
  }

  const volunteerData = Array.isArray(volunteers)
    ? volunteers
        .filter((v: { name?: string }) => v.name?.trim())
        .map((v: { name: string; email?: string; phone?: string; relationship?: string }) => ({
          name: v.name.trim(),
          email: v.email?.trim() || null,
          phone: v.phone?.trim() || null,
          relationship: v.relationship || "Parent",
        }))
    : [];

  const player = await prisma.player.create({
    data: {
      name: name.trim(),
      number: number?.trim() || null,
      teamId: id,
      ...(volunteerData.length > 0 && {
        volunteers: { create: volunteerData },
      }),
    },
    include: { volunteers: true },
  });

  return NextResponse.json(player, { status: 201 });
}
