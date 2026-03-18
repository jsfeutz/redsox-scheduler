export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageTeam, canManageSchedule, canBumpEvents } from "@/lib/auth-helpers";
import { redirect, notFound } from "next/navigation";
import { TeamDetailTabs } from "@/components/teams/team-detail-tabs";
import { startOfDay } from "date-fns";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const todayStart = startOfDay(new Date());

  const team = await prisma.team.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      headCoach: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      seasonTeams: {
        include: { season: { select: { id: true, name: true, startDate: true, endDate: true } } },
        orderBy: { season: { startDate: "desc" } },
      },
    },
  });

  if (!team) notFound();

  const canManage = await canManageTeam(user, id);

  const [upcomingEvents, globalTeamTemplates, teamOverrides, teamSpecificTemplates, teamLevelJobs] =
    await Promise.all([
      prisma.scheduleEvent.findMany({
        where: { teamId: id, endTime: { gte: todayStart } },
        include: {
          subFacility: {
            include: { facility: { select: { id: true, name: true } } },
          },
          gameJobs: {
            include: {
              jobTemplate: { select: { id: true, name: true, hoursPerGame: true, scope: true } },
              assignments: {
                where: { cancelledAt: null },
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
        orderBy: { startTime: "asc" },
        take: 50,
      }),

      prisma.jobTemplate.findMany({
        where: {
          organizationId: user.organizationId,
          scope: "TEAM",
          teamId: null,
          active: true,
        },
        orderBy: { name: "asc" },
      }),

      prisma.teamJobOverride.findMany({
        where: { teamId: id },
      }),

      prisma.jobTemplate.findMany({
        where: { teamId: id },
        include: { _count: { select: { gameJobs: true } } },
        orderBy: { name: "asc" },
      }),

      prisma.gameJob.findMany({
        where: { teamId: id, scheduleEventId: null },
        include: {
          jobTemplate: { select: { id: true, name: true, hoursPerGame: true, description: true } },
          assignments: {
            where: { cancelledAt: null },
            select: { id: true, name: true, email: true, hoursEarned: true },
          },
        },
      }),
    ]);

  const overrideMap = new Map(
    teamOverrides.map((o) => [o.jobTemplateId, o.active])
  );

  const teamJobsByTemplate = new Map(
    teamLevelJobs.map((gj) => [gj.jobTemplateId, gj])
  );

  const teamAssignmentsByTemplate = new Map<string, { name: string | null; email: string | null }[]>();
  for (const gj of teamLevelJobs) {
    if (gj.assignments.length > 0) {
      teamAssignmentsByTemplate.set(
        gj.jobTemplateId,
        gj.assignments.map((a) => ({ name: a.name, email: a.email }))
      );
    }
  }

  const activeGlobalTemplates = globalTeamTemplates.filter((t) => {
    const override = overrideMap.get(t.id);
    return override !== false;
  });

  const activeTeamTemplates = teamSpecificTemplates.filter((t) => t.active);

  const allActiveTeamTemplates = [...activeGlobalTemplates, ...activeTeamTemplates];

  const teamRoles = allActiveTeamTemplates.map((t) => {
    const existingJob = teamJobsByTemplate.get(t.id);
    return {
      templateId: t.id,
      name: t.name,
      description: t.description,
      hoursPerGame: t.hoursPerGame,
      forEventType: t.forEventType,
      maxSlots: t.maxSlots,
      assignments: existingJob?.assignments.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
      })) ?? [],
    };
  });

  const [allTeams, facilities, seasons] = await Promise.all([
    prisma.team.findMany({
      where: { organizationId: user.organizationId, active: true },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.facility.findMany({
      where: { organizationId: user.organizationId },
      include: {
        subFacilities: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.season.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, startDate: true, endDate: true },
      orderBy: { startDate: "desc" },
    }),
  ]);

  const subFacilityIds = upcomingEvents.map((e) => e.subFacilityId).filter((id): id is string => id !== null);
  const timeRanges = upcomingEvents.map((e) => ({ start: e.startTime, end: e.endTime }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let conflictingEvents: any[] = [];
  if (subFacilityIds.length > 0) {
    const earliest = upcomingEvents[0]?.startTime;
    const latest = upcomingEvents[upcomingEvents.length - 1]?.endTime;
    if (earliest && latest) {
      conflictingEvents = await prisma.scheduleEvent.findMany({
        where: {
          teamId: { not: id },
          subFacilityId: { in: [...new Set(subFacilityIds)] },
          startTime: { lt: latest },
          endTime: { gt: earliest },
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          teamId: true,
          subFacilityId: true,
          team: { select: { name: true, color: true } },
        },
      });
    }
  }

  const conflictMap = new Map<string, { teamName: string; teamColor: string; title: string; startTime: string; endTime: string }[]>();
  for (const evt of upcomingEvents) {
    const overlaps = conflictingEvents.filter(
      (c) =>
        c.subFacilityId === evt.subFacilityId &&
        c.startTime < evt.endTime &&
        c.endTime > evt.startTime
    );
    if (overlaps.length > 0) {
      conflictMap.set(
        evt.id,
        overlaps.map((c) => ({
          teamName: (c as any).team?.name ?? "Club Event",
          teamColor: (c as any).team?.color ?? "#6b7280",
          title: c.title,
          startTime: c.startTime.toISOString(),
          endTime: c.endTime.toISOString(),
        }))
      );
    }
  }

  const signupStats = upcomingEvents.reduce(
    (acc, evt) => {
      for (const job of evt.gameJobs) {
        acc.totalSlots += job.slotsNeeded;
        const eventNames = job.assignments.map((a) => a.name).filter(Boolean);
        const teamNames = teamAssignmentsByTemplate.get(job.jobTemplateId)
          ?.map((a) => a.name).filter(Boolean) ?? [];
        acc.filledSlots += new Set([...eventNames, ...teamNames]).size;
      }
      return acc;
    },
    { totalSlots: 0, filledSlots: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg"
          style={{ backgroundColor: team.color }}
        >
          {team.icon || team.name
            .split(/\s|-/)
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
          {team.ageGroup && (
            <p className="text-muted-foreground text-sm">{team.ageGroup}</p>
          )}
        </div>
      </div>

      <TeamDetailTabs
        team={{
          id: team.id,
          name: team.name,
          icon: team.icon,
          color: team.color,
          ageGroup: team.ageGroup,
          headCoach: team.headCoach,
          members: team.members.map((m) => ({
            id: m.id,
            role: m.role,
            user: m.user,
          })),
          seasons: team.seasonTeams.map((st) => st.season),
        }}
        teamRoles={teamRoles}
        events={upcomingEvents.map((evt) => ({
          id: evt.id,
          title: evt.title,
          type: evt.type,
          startTime: evt.startTime.toISOString(),
          endTime: evt.endTime.toISOString(),
          recurrenceGroupId: evt.recurrenceGroupId,
          facility: evt.subFacility ? `${evt.subFacility.facility.name} - ${evt.subFacility.name}` : (evt as any).customLocation ?? "TBD",
          subFacilityId: evt.subFacilityId,
          seasonId: evt.seasonId,
          notes: evt.notes,
          isRecurring: evt.isRecurring,
          recurrenceRule: evt.recurrenceRule,
          conflicts: conflictMap.get(evt.id) ?? [],
          gameJobs: evt.gameJobs.map((gj) => {
            const eventVolunteers = gj.assignments.map((a) => a.name).filter(Boolean) as string[];
            const teamVolunteers = teamAssignmentsByTemplate.get(gj.jobTemplateId)
              ?.map((a) => a.name)
              .filter(Boolean) as string[] ?? [];
            const allNames = [...new Set([...eventVolunteers, ...teamVolunteers])];
            return {
              id: gj.id,
              name: gj.overrideName ?? gj.jobTemplate.name,
              slotsNeeded: gj.slotsNeeded,
              filled: allNames.length,
              isPublic: gj.isPublic,
              scope: gj.jobTemplate.scope,
              volunteerNames: allNames,
            };
          }),
        }))}
        scheduling={{
          teams: allTeams,
          facilities: facilities.map((f) => ({
            id: f.id,
            name: f.name,
            subFacilities: f.subFacilities,
          })),
          seasons,
          canSchedule: canManageSchedule(user.role) || canManage,
          canBump: canBumpEvents(user.role),
        }}
        jobTemplates={globalTeamTemplates.map((jt) => ({
          id: jt.id,
          name: jt.name,
          description: jt.description,
          hoursPerGame: jt.hoursPerGame,
          forEventType: jt.forEventType,
          active: overrideMap.has(jt.id) ? overrideMap.get(jt.id)! : true,
        }))}
        teamSpecificTemplates={teamSpecificTemplates.map((jt) => ({
          id: jt.id,
          name: jt.name,
          description: jt.description,
          hoursPerGame: jt.hoursPerGame,
          forEventType: jt.forEventType,
          active: jt.active,
          _count: jt._count,
        }))}
        signupStats={signupStats}
        canManage={canManage}
      />
    </div>
  );
}
