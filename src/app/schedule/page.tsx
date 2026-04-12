export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { PublicSchedule } from "./public-schedule";

export default async function PublicSchedulePage() {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-muted-foreground">Schedule not available.</p>
      </div>
    );
  }

  const [teams, facilities] = await Promise.all([
    prisma.team.findMany({
      where: { organizationId: org.id, active: true },
      select: { id: true, name: true, color: true, icon: true, headCoach: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.facility.findMany({
      where: { organizationId: org.id },
      select: {
        id: true,
        name: true,
        color: true,
        subFacilities: {
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center text-muted-foreground text-sm">
          Loading schedule…
        </div>
      }
    >
      <PublicSchedule teams={teams} facilities={facilities} />
    </Suspense>
  );
}
