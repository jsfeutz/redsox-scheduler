import { prisma } from "./prisma";

const FALLBACK_MONTHS = 6;

export async function getSeasonTokenExpiry(): Promise<Date> {
  const now = new Date();

  const currentSeason = await prisma.season.findFirst({
    where: { startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { endDate: "desc" },
    select: { endDate: true },
  });

  if (currentSeason) return currentSeason.endDate;

  const nextSeason = await prisma.season.findFirst({
    where: { startDate: { gt: now } },
    orderBy: { startDate: "asc" },
    select: { endDate: true },
  });

  if (nextSeason) return nextSeason.endDate;

  return new Date(now.getTime() + FALLBACK_MONTHS * 30 * 24 * 60 * 60 * 1000);
}
