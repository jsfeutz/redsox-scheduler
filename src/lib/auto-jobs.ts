import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function createAutoJobs(event: {
  id: string;
  type: string;
  teamId: string | null;
  seasonId: string | null;
  subFacilityId: string | null;
  gameVenue?: string | null;
  organizationId: string;
}) {
  if (event.gameVenue === "AWAY") return;

  const existingJobs = await prisma.gameJob.findMany({
    where: { scheduleEventId: event.id },
    select: { jobTemplateId: true },
  });
  const existingTemplateIds = new Set(existingJobs.map((j) => j.jobTemplateId));

  const jobsToCreate: Prisma.GameJobCreateManyInput[] = [];

  const subFacility = event.subFacilityId
    ? await prisma.subFacility.findUnique({
        where: { id: event.subFacilityId },
        select: { facilityId: true },
      })
    : null;

  if (subFacility) {
    const facilityConfigs = await prisma.facilityJobConfig.findMany({
      where: { facilityId: subFacility.facilityId },
      include: { jobTemplate: { select: { active: true, forEventType: true } } },
    });
    for (const cfg of facilityConfigs) {
      if (!cfg.jobTemplate.active) continue;
      if (cfg.jobTemplate.forEventType !== "ALL" && cfg.jobTemplate.forEventType !== event.type) continue;
      if (existingTemplateIds.has(cfg.jobTemplateId)) continue;
      jobsToCreate.push({
        jobTemplateId: cfg.jobTemplateId,
        scheduleEventId: event.id,
        slotsNeeded: cfg.slotsNeeded,
        isPublic: true,
      });
    }
  }

  if (jobsToCreate.length > 0) {
    await prisma.gameJob.createMany({ data: jobsToCreate });
  }
}
