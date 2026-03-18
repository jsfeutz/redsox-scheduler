import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { UserRole } from "@prisma/client";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seasons = await prisma.season.findMany({
    where: { organizationId: user.organizationId },
    include: {
      seasonTeams: {
        include: {
          team: { select: { id: true, name: true, color: true } },
        },
      },
    },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(seasons);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, startDate, endDate } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Start and end dates are required" },
      { status: 400 }
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end <= start) {
    return NextResponse.json(
      { error: "End date must be after start date" },
      { status: 400 }
    );
  }

  const season = await prisma.season.create({
    data: {
      name: name.trim(),
      startDate: start,
      endDate: end,
      organizationId: user.organizationId,
    },
    include: {
      seasonTeams: {
        include: {
          team: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });

  return NextResponse.json(season, { status: 201 });
}
