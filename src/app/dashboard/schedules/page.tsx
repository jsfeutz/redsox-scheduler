export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  canManageSchedule,
  canBumpEvents,
  isOrgAdmin,
  getUserTeamIds,
} from "@/lib/auth-helpers";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { ScheduleView } from "@/components/schedules/schedule-view";

export default async function SchedulesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isWideAccess =
    user.role === UserRole.ADMIN || user.role === UserRole.SCHEDULE_MANAGER;

  const teamWhere = isWideAccess
    ? { organizationId: user.organizationId }
    : { organizationId: user.organizationId, id: { in: await getUserTeamIds(user.id) } };

  const userTeamIds = isWideAccess ? [] : await getUserTeamIds(user.id);

  const [teams, facilities, seasons, userTeams] = await Promise.all([
    prisma.team.findMany({
      where: teamWhere,
      select: { id: true, name: true, color: true, headCoach: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.facility.findMany({
      where: { organizationId: user.organizationId },
      include: {
        subFacilities: {
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.season.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, startDate: true, endDate: true },
      orderBy: { startDate: "desc" },
    }),
    isWideAccess
      ? prisma.team.findMany({
          where: { organizationId: user.organizationId },
          select: { id: true, name: true, color: true, headCoach: { select: { name: true } } },
          orderBy: { name: "asc" },
        })
      : prisma.team.findMany({
          where: { id: { in: userTeamIds } },
          select: { id: true, name: true, color: true, headCoach: { select: { name: true } } },
          orderBy: { name: "asc" },
        }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground mt-1">
          Games, practices, and events
        </p>
      </div>
      <ScheduleView
        teams={teams}
        facilities={facilities}
        seasons={seasons}
        canManage={canManageSchedule(user.role)}
        canBump={canBumpEvents(user.role)}
        isAdmin={isOrgAdmin(user.role)}
        userTeams={userTeams}
      />
    </div>
  );
}
