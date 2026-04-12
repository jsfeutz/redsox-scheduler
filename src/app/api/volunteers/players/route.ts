import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const players = await prisma.player.findMany({
    where: { active: true, team: { organizationId: user.organizationId } },
    select: {
      id: true,
      name: true,
      number: true,
      team: { select: { name: true } },
    },
    orderBy: [{ team: { name: "asc" } }, { name: "asc" }],
    take: 1000,
  });

  return NextResponse.json(
    players.map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      teamName: p.team.name,
    }))
  );
}

