export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Briefcase } from "lucide-react";
import Link from "next/link";
import { HelpWantedBoard, type JobData, type FilterOption } from "./help-wanted-board";
import { PublicFooter } from "@/components/public-footer";

export default async function HelpWantedPage() {
  const org = await prisma.organization.findFirst({
    select: { teamJobsPublicSignup: true },
  });

  const where: Prisma.GameJobWhereInput = {
    isPublic: true,
    scheduleEvent: { startTime: { gte: new Date() } },
  };

  if (org && !org.teamJobsPublicSignup) {
    where.jobTemplate = { scope: { not: "TEAM" } };
  }

  const jobs = await prisma.gameJob.findMany({
    where,
    include: {
      jobTemplate: true,
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

  const jobData: JobData[] = jobs
    .filter((j) => j.scheduleEvent)
    .map((job) => {
      const evt = job.scheduleEvent!;

      if (evt.team && !teamsMap.has(evt.team.id)) {
        teamsMap.set(evt.team.id, {
          id: evt.team.id,
          name: evt.team.name,
          color: evt.team.color,
          coachName: evt.team.headCoach?.name ?? undefined,
        });
      }
      if (evt.subFacility && !facilitiesMap.has(evt.subFacility.facility.id)) {
        facilitiesMap.set(evt.subFacility.facility.id, {
          id: evt.subFacility.facility.id,
          name: evt.subFacility.facility.name,
        });
      }

      return {
        id: job.id,
        templateName: job.overrideName || job.jobTemplate.name,
        templateDescription: job.overrideDescription || job.jobTemplate.description,
        eventId: evt.id,
        eventTitle: evt.title,
        eventType: evt.type,
        startTime: evt.startTime.toISOString(),
        endTime: evt.endTime.toISOString(),
        teamId: evt.team?.id ?? "",
        teamName: evt.team?.name ?? "Club Event",
        teamColor: evt.team?.color ?? "#6b7280",
        facilityId: evt.subFacility?.facility.id ?? "",
        facilityName: evt.subFacility?.facility.name ?? "",
        subFacilityName: evt.subFacility?.name ?? "",
        slotsNeeded: job.slotsNeeded,
        assignmentCount: job.assignments.length,
        volunteerNames: job.assignments.map((a) => a.name).filter(Boolean) as string[],
        hoursPerGame: job.overrideHoursPerGame ?? job.jobTemplate.hoursPerGame,
      };
    });

  const teams = Array.from(teamsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const facilities = Array.from(facilitiesMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="min-h-dvh bg-background">
      <div className="bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-16">
          <div className="mb-6 sm:mb-8 text-center">
            <div className="mx-auto mb-4 sm:mb-5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/25">
              <Briefcase className="h-7 w-7" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Volunteer Signup
            </h1>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">
              We need help on game days! Browse upcoming jobs and sign up for a
              shift below.
            </p>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <Link
                href="/schedule"
                className="text-primary hover:underline font-medium"
              >
                View Schedule
              </Link>
              <span className="text-border">|</span>
              <Link
                href="/my-signups"
                className="text-primary hover:underline font-medium"
              >
                Manage your signups &rarr;
              </Link>
            </div>
          </div>

          <HelpWantedBoard
            jobs={jobData}
            teams={teams}
            facilities={facilities}
          />

          <PublicFooter />
        </div>
      </div>
    </div>
  );
}
