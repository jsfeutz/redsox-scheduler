export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { VolunteerView } from "@/components/volunteers/volunteer-view";

export default async function VolunteersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const unfilledJobs = await prisma.gameJob.findMany({
    where: {
      jobTemplate: { scope: "FACILITY" },
      scheduleEvent: {
        team: { organizationId: user.organizationId },
        startTime: { gte: new Date() },
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
          facility: evt.subFacility
            ? `${evt.subFacility.facility.name} – ${evt.subFacility.name}`
            : null,
        },
      };
    });

  return (
    <div className="flex flex-col flex-1 min-h-0 md:block md:space-y-6">
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
        <p className="text-muted-foreground mt-1">
          Track open jobs and volunteer signups
        </p>
      </div>
      <VolunteerView jobs={jobs} />
    </div>
  );
}
