import { prisma } from "@/lib/prisma";

/**
 * Replace tagged teams for an event. Tags must be same-org as primary team; primary is never duplicated in tags.
 */
export async function syncScheduleEventTaggedTeams(
  scheduleEventId: string,
  primaryTeamId: string | null,
  organizationId: string,
  taggedTeamIds: string[] | undefined | null
): Promise<void> {
  await prisma.scheduleEventTaggedTeam.deleteMany({
    where: { scheduleEventId },
  });

  if (!primaryTeamId || !Array.isArray(taggedTeamIds) || taggedTeamIds.length === 0) {
    return;
  }

  const unique = [...new Set(taggedTeamIds.filter(Boolean))].filter(
    (id) => id !== primaryTeamId
  );
  if (unique.length === 0) return;

  const teams = await prisma.team.findMany({
    where: {
      id: { in: unique },
      organizationId,
    },
    select: { id: true },
  });
  const allowed = new Set(teams.map((t) => t.id));
  const toCreate = unique.filter((id) => allowed.has(id));
  if (toCreate.length === 0) return;

  await prisma.scheduleEventTaggedTeam.createMany({
    data: toCreate.map((teamId) => ({ scheduleEventId, teamId })),
    skipDuplicates: true,
  });
}
