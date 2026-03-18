export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { TeamsView } from "@/components/teams/teams-view";

export default async function TeamsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin =
    user.role === UserRole.ADMIN || user.role === UserRole.SCHEDULE_MANAGER;

  const teams = await prisma.team.findMany({
    where: { organizationId: user.organizationId },
    include: {
      headCoach: { select: { id: true, name: true, email: true } },
      members: {
        select: { userId: true, role: true },
      },
      _count: { select: { scheduleEvents: true } },
    },
    orderBy: { name: "asc" },
  });

  const serialized = teams.map((t) => ({
    id: t.id,
    name: t.name,
    ageGroup: t.ageGroup,
    icon: t.icon,
    color: t.color,
    active: t.active,
    headCoachId: t.headCoachId,
    headCoachName: t.headCoach?.name ?? null,
    eventCount: t._count.scheduleEvents,
    isMyTeam:
      t.headCoachId === user.id ||
      t.members.some(
        (m) =>
          m.userId === user.id &&
          ["HEAD_COACH", "ASSISTANT_COACH", "TEAM_MANAGER"].includes(m.role)
      ),
  }));

  return (
    <div className="flex flex-col flex-1 min-h-0 md:block md:space-y-6">
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
        <p className="text-muted-foreground mt-1">
          Manage your teams and rosters
        </p>
      </div>
      <TeamsView teams={serialized} isAdmin={isAdmin} />
    </div>
  );
}
