import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isOrgAdmin } from "@/lib/auth-helpers";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isOrgAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, role, active } = body;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.id === user.id && active === false) {
    return NextResponse.json(
      { error: "You cannot deactivate yourself" },
      { status: 400 }
    );
  }

  if (target.id === user.id && role && role !== user.role) {
    return NextResponse.json(
      { error: "You cannot change your own role" },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name.trim();
  if (role !== undefined) data.role = role;
  if (active !== undefined) data.active = active;

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      teamMembers: {
        select: {
          id: true,
          role: true,
          team: { select: { id: true, name: true } },
        },
      },
      coachOfTeams: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isOrgAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === user.id) {
    return NextResponse.json(
      { error: "You cannot delete yourself" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.team.updateMany({
    where: { headCoachId: id },
    data: { headCoachId: null },
  });

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
