import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageTeam } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string; playerId: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const { id, playerId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canManageTeam(user, id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, phone, relationship } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Volunteer name is required" }, { status: 400 });
  }

  const volunteer = await prisma.playerVolunteer.create({
    data: {
      playerId,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      relationship: relationship?.trim() || "Parent",
    },
  });

  return NextResponse.json(volunteer, { status: 201 });
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canManageTeam(user, id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const volunteerId = searchParams.get("volunteerId");

  if (!volunteerId) {
    return NextResponse.json({ error: "volunteerId required" }, { status: 400 });
  }

  await prisma.playerVolunteer.delete({ where: { id: volunteerId } });

  return NextResponse.json({ success: true });
}
