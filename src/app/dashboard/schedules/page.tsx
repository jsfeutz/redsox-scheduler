export const dynamic = "force-dynamic";

import { Suspense } from "react";
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

  const userTeamIds = isWideAccess ? [] : await getUserTeamIds(user.id);

  const [teams, facilities, seasons] = await Promise.all([
    prisma.team.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        headCoach: { select: { name: true } },
      },
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
  ]);

  const userTeams = isWideAccess
    ? teams
    : teams.filter((t) => userTeamIds.includes(t.id));

  return (
    <div className="flex flex-col flex-1 min-h-0 md:block md:space-y-6">
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground mt-1">
          Games, practices, and events
        </p>
      </div>
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground py-8 text-center">
            Loading schedule…
          </div>
        }
      >
        <ScheduleView
          teams={teams}
          facilities={facilities}
          seasons={seasons}
          canManage={canManageSchedule(user.role)}
          canBump={canBumpEvents(user.role)}
          isAdmin={isOrgAdmin(user.role)}
          userTeams={userTeams}
          userTeamIds={userTeamIds}
        />
      </Suspense>
    </div>
  );
}
