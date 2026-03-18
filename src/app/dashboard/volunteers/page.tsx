export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageVolunteers } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VolunteerSignups } from "@/components/volunteers/volunteer-signups";
import { UnfilledJobs } from "@/components/volunteers/unfilled-jobs";
import { VolunteerReport } from "@/components/volunteers/volunteer-report";
import { VolunteerParticipation } from "@/components/volunteers/volunteer-participation";

export default async function VolunteersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");

  const canManage = canManageVolunteers(user.role);

  const assignments = await prisma.jobAssignment.findMany({
    where: {
      cancelledAt: null,
      gameJob: {
        jobTemplate: { scope: "FACILITY" },
        scheduleEvent: {
          team: { organizationId: user.organizationId },
        },
      },
    },
    include: {
      gameJob: {
        include: {
          jobTemplate: { select: { name: true, scope: true } },
          scheduleEvent: {
            select: {
              id: true,
              title: true,
              type: true,
              startTime: true,
              endTime: true,
              team: { select: { id: true, name: true, color: true } },
              subFacility: {
                select: {
                  name: true,
                  facility: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = assignments.map((a) => ({
    id: a.id,
    name: a.name || a.user?.name || "Unknown",
    email: a.email || a.user?.email || "",
    playerName: a.playerName,
    hoursEarned: a.hoursEarned ?? 0,
    createdAt: a.createdAt.toISOString(),
    jobName: a.gameJob.jobTemplate.name,
    jobScope: a.gameJob.jobTemplate.scope,
    event: a.gameJob.scheduleEvent
      ? {
          id: a.gameJob.scheduleEvent.id,
          title: a.gameJob.scheduleEvent.title,
          type: a.gameJob.scheduleEvent.type,
          startTime: a.gameJob.scheduleEvent.startTime.toISOString(),
          endTime: a.gameJob.scheduleEvent.endTime.toISOString(),
          teamName: a.gameJob.scheduleEvent.team?.name ?? "Club Event",
          teamColor: a.gameJob.scheduleEvent.team?.color ?? "#6b7280",
          facility: a.gameJob.scheduleEvent.subFacility
            ? `${a.gameJob.scheduleEvent.subFacility.facility.name} – ${a.gameJob.scheduleEvent.subFacility.name}`
            : null,
        }
      : null,
  }));

  const unfilledJobs = await prisma.gameJob.findMany({
    where: {
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

  const unfilledSerialized = unfilledJobs
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Volunteers</h1>
        <p className="text-muted-foreground mt-1">
          Track volunteer signups and participation
        </p>
      </div>

      <Tabs defaultValue="open">
        <TabsList className="rounded-xl">
          <TabsTrigger value="open" className="rounded-lg">
            Open Jobs ({unfilledSerialized.length})
          </TabsTrigger>
          <TabsTrigger value="signups" className="rounded-lg">
            Signups
          </TabsTrigger>
          <TabsTrigger value="participation" className="rounded-lg">
            Participation
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-lg">
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4">
          <UnfilledJobs jobs={unfilledSerialized} />
        </TabsContent>

        <TabsContent value="signups" className="mt-4">
          <VolunteerSignups
            assignments={serialized}
            canManage={canManage}
          />
        </TabsContent>

        <TabsContent value="participation" className="mt-4">
          <VolunteerParticipation />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <VolunteerReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
