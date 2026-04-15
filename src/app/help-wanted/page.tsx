export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { HelpWantedBoard, type JobData, type FilterOption } from "./help-wanted-board";
import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";

export default async function HelpWantedPage() {
  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session?.user;

  const org = await prisma.organization.findFirst({
    select: { teamJobsPublicSignup: true, smsEnabled: true },
  });

  const where: Prisma.GameJobWhereInput = {
    isPublic: true,
    disabled: false,
    OR: [
      { scheduleEvent: { startTime: { gte: new Date() } } },
      { scheduleEventId: null },
    ],
  };

  if (org && !org.teamJobsPublicSignup) {
    where.jobTemplate = { scope: { not: "TEAM" } };
  }

  const jobs = await prisma.gameJob.findMany({
    where,
    include: {
      jobTemplate: true,
      season: { select: { id: true, name: true } },
      scheduleEvent: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              color: true,
              headCoach: { select: { name: true } },
            },
          },
          subFacility: {
            include: { facility: { select: { id: true, name: true } } },
          },
          taggedTeams: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  headCoach: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      assignments: {
        where: { cancelledAt: null },
        select: { id: true, name: true },
      },
    },
    orderBy: { scheduleEvent: { startTime: "asc" } },
  });

  const teamsMap = new Map<string, FilterOption>();
  const facilitiesMap = new Map<string, FilterOption>();

  const jobData: JobData[] = jobs.map((job) => {
      const evt = job.scheduleEvent;

      if (evt?.team && !teamsMap.has(evt.team.id)) {
          teamsMap.set(evt.team.id, {
            id: evt.team.id,
            name: evt.team.name,
            color: evt.team.color,
            coachName: evt.team.headCoach?.name ?? undefined,
          });
        }
        for (const link of evt?.taggedTeams ?? []) {
          const t = link.team;
          if (!teamsMap.has(t.id)) {
            teamsMap.set(t.id, {
              id: t.id,
              name: t.name,
              color: t.color,
              coachName: t.headCoach?.name ?? undefined,
            });
          }
        }
        if (evt?.subFacility && !facilitiesMap.has(evt.subFacility.facility.id)) {
          facilitiesMap.set(evt.subFacility.facility.id, {
            id: evt.subFacility.facility.id,
            name: evt.subFacility.facility.name,
          });
        }

      return {
        id: job.id,
        templateName: job.overrideName || job.jobTemplate.name,
        templateDescription: job.overrideDescription || job.jobTemplate.description,
        isOrgJob: !evt,
        orgLabel: job.season?.name ? `Season: ${job.season.name}` : "Ongoing",
        eventId: evt?.id ?? "__org__",
        eventTitle: evt?.title ?? "Organization Job",
        eventType: evt?.type ?? "ORG",
        startTime: (evt?.startTime ?? job.createdAt).toISOString(),
        endTime: (evt?.endTime ?? job.createdAt).toISOString(),
        teamId: evt?.team?.id ?? "",
        taggedTeamIds: evt?.taggedTeams?.map((l) => l.team.id) ?? [],
        teamName: evt?.team?.name ?? "Organization",
        teamColor: evt?.team?.color ?? "#6b7280",
        facilityId: evt?.subFacility?.facility.id ?? "",
        facilityName: evt?.subFacility?.facility.name ?? "",
        subFacilityName: evt?.subFacility?.name ?? "",
        slotsNeeded: job.slotsNeeded,
        assignmentCount: job.assignments.length,
        volunteerNames: job.assignments.map((a) => a.name).filter(Boolean) as string[],
        hoursPerGame: job.overrideHoursPerGame ?? job.jobTemplate.hoursPerGame,
        askComfortLevel: job.jobTemplate.askComfortLevel,
      };
    });

  const teams = Array.from(teamsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const facilities = Array.from(facilitiesMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  if (isAuthenticated) {
    return (
      <div className="flex flex-col flex-1 min-h-0 md:block md:space-y-6 px-3 md:px-8 md:py-8">
        <h1 className="hidden md:block text-2xl font-bold tracking-tight">
          Volunteer Signup
        </h1>
        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-visible">
          <HelpWantedBoard
            jobs={jobData}
            teams={teams}
            facilities={facilities}
            smsEnabled={org?.smsEnabled ?? true}
            compact
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-0">
      <div className="bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="mx-auto max-w-6xl px-3 sm:px-6 py-4 sm:py-16">
          <div className="mb-4 sm:mb-8">
            <PublicNav />
            <div className="mt-4 sm:mt-6 text-center">
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
                Volunteer Signup
              </h1>
              <p className="mt-2 sm:mt-3 text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
                Browse upcoming jobs and sign up for a shift below.
              </p>
            </div>
          </div>

          <HelpWantedBoard
            jobs={jobData}
            teams={teams}
            facilities={facilities}
            smsEnabled={org?.smsEnabled ?? true}
          />

          <PublicFooter />
        </div>
      </div>
    </div>
  );
}
