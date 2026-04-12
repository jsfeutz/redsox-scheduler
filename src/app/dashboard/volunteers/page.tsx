export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageSchedule, getUserTeamIds } from "@/lib/auth-helpers";
import { UserRole, EventType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { VolunteerView } from "@/components/volunteers/volunteer-view";

/** Team-tied events and org club events (no team) scoped to this organization. */
function scheduleEventsForOrg(organizationId: string): Prisma.ScheduleEventWhereInput {
  return {
    cancelledAt: null,
    OR: [
      { team: { organizationId } },
      {
        type: EventType.CLUB_EVENT,
        OR: [
          { season: { organizationId } },
          { subFacility: { facility: { organizationId } } },
          {
            gameJobs: {
              some: { jobTemplate: { organizationId } },
            },
          },
        ],
      },
    ],
  };
}

export default async function VolunteersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SCHEDULE_MANAGER;
  const userTeamIds = isAdmin ? [] : await getUserTeamIds(user.id);

  const teams = await prisma.team.findMany({
    where: { organizationId: user.organizationId, active: true },
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
  });

  const upcomingEvents = await prisma.scheduleEvent.findMany({
    where: {
      startTime: { gte: new Date() },
      ...scheduleEventsForOrg(user.organizationId),
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      teamId: true,
      team: { select: { name: true } },
      subFacility: { select: { name: true, facility: { select: { name: true } } } },
    },
    orderBy: { startTime: "asc" },
    take: 200,
  });

  const players = await prisma.player.findMany({
    where: { active: true, team: { organizationId: user.organizationId } },
    select: {
      id: true,
      name: true,
      number: true,
      team: { select: { name: true } },
    },
    orderBy: [{ team: { name: "asc" } }, { name: "asc" }],
    take: 500,
  });

  const unfilledJobs = await prisma.gameJob.findMany({
    where: {
      disabled: false,
      jobTemplate: { scope: "FACILITY", organizationId: user.organizationId },
      scheduleEvent: {
        startTime: { gte: new Date() },
        ...scheduleEventsForOrg(user.organizationId),
      },
    },
    include: {
      jobTemplate: { select: { name: true, scope: true } },
      assignments: {
        where: { cancelledAt: null },
        select: { id: true, name: true, playerName: true },
      },
      scheduleEvent: {
        select: {
          id: true,
          title: true,
          type: true,
          startTime: true,
          endTime: true,
          team: {
            select: {
              id: true,
              name: true,
              color: true,
              headCoach: { select: { name: true } },
            },
          },
          taggedTeams: {
            include: {
              team: { select: { id: true, name: true } },
            },
          },
          subFacility: {
            select: {
              name: true,
              facility: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { scheduleEvent: { startTime: "asc" } },
  });

  const orgLevelJobs = await prisma.gameJob.findMany({
    where: {
      jobTemplate: { organizationId: user.organizationId },
      scheduleEventId: null,
      disabled: false,
    },
    include: {
      jobTemplate: { select: { name: true, scope: true } },
      season: { select: { id: true, name: true } },
      assignments: {
        where: { cancelledAt: null },
        select: { id: true, name: true, playerName: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const jobs = unfilledJobs
    .filter((j) => j.assignments.length < j.slotsNeeded && j.scheduleEvent)
    .map((j) => {
      const evt = j.scheduleEvent!;
      return {
        id: j.id,
        jobName: j.jobTemplate.name,
        jobScope: j.jobTemplate.scope,
        slotsNeeded: j.slotsNeeded,
        slotsFilled: j.assignments.length,
        isPublic: j.isPublic,
        disabled: false as const,
        volunteers: j.assignments
          .filter((a) => a.name)
          .map((a) => ({ assignmentId: a.id, name: a.name as string })),
        signups: j.assignments.map((a) => ({
          name: a.name ?? "Volunteer",
          playerName: a.playerName,
        })),
        event: {
          id: evt.id,
          title: evt.title,
          type: evt.type,
          startTime: evt.startTime.toISOString(),
          endTime: evt.endTime.toISOString(),
          teamId: evt.team?.id ?? null,
          teamName: evt.team?.name ?? "Club Event",
          teamColor: evt.team?.color ?? "#6b7280",
          coachName: evt.team?.headCoach?.name ?? null,
          taggedTeamNames: evt.taggedTeams.map((t) => t.team.name),
          facility: evt.subFacility
            ? `${evt.subFacility.facility.name} – ${evt.subFacility.name}`
            : null,
        },
      };
    });

  const orgJobs = orgLevelJobs
    .map((j) => ({
      id: j.id,
      jobName: j.overrideName || j.jobTemplate.name,
      jobScope: j.jobTemplate.scope,
      slotsNeeded: j.slotsNeeded,
      slotsFilled: j.assignments.length,
      isPublic: j.isPublic,
      disabled: j.disabled,
      volunteers: j.assignments
        .filter((a) => a.name)
        .map((a) => ({ assignmentId: a.id, name: a.name as string })),
      signups: j.assignments.map((a) => ({
        name: a.name ?? "Volunteer",
        playerName: a.playerName,
      })),
      event: {
        id: "__org__",
        title: j.season?.name ? `Season: ${j.season.name}` : "Organization Job",
        type: "ORG",
        startTime: j.createdAt.toISOString(),
        endTime: j.createdAt.toISOString(),
        teamId: null,
        teamName: "Organization",
        teamColor: "#6b7280",
        coachName: null,
        facility: null,
      },
      isOrgJob: true as const,
    }));

  return (
    <div className="flex flex-col flex-1 min-h-0 md:block md:space-y-6">
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
        <p className="text-muted-foreground mt-1">
          Track open jobs and volunteer signups
        </p>
      </div>
      <VolunteerView
        jobs={[...orgJobs, ...jobs]}
        teams={teams}
        players={players.map((p) => ({
          id: p.id,
          name: p.name,
          number: p.number,
          teamName: p.team.name,
        }))}
        events={upcomingEvents.map((e) => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime.toISOString(),
          endTime: e.endTime.toISOString(),
          teamId: e.teamId ?? null,
          teamName: e.team?.name ?? "Club Event",
          facility: e.subFacility ? `${e.subFacility.facility.name} – ${e.subFacility.name}` : null,
        }))}
        canManage={canManageSchedule(user.role)}
        isAdmin={isAdmin}
        userTeamIds={userTeamIds}
      />
    </div>
  );
}
