import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const unlinked = await prisma.jobAssignment.findMany({
    where: {
      playerVolunteerId: null,
      email: { not: null },
      cancelledAt: null,
    },
    select: { id: true, email: true },
  });

  if (unlinked.length === 0) {
    console.log("Backfill: No unlinked assignments to process.");
    return;
  }

  const emails = [...new Set(unlinked.map((a) => a.email).filter(Boolean))];

  const volunteers = await prisma.playerVolunteer.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, player: { select: { name: true } } },
  });

  const emailToVolunteer = new Map();
  for (const v of volunteers) {
    if (v.email) emailToVolunteer.set(v.email.toLowerCase(), v);
  }

  if (emailToVolunteer.size === 0) {
    console.log("Backfill: No matching PlayerVolunteers found.");
    return;
  }

  let linked = 0;
  for (const assignment of unlinked) {
    const vol = emailToVolunteer.get(assignment.email?.toLowerCase());
    if (vol) {
      await prisma.jobAssignment.update({
        where: { id: assignment.id },
        data: {
          playerVolunteerId: vol.id,
          playerName: vol.player.name,
        },
      });
      linked++;
    }
  }

  console.log(`Backfill: Linked ${linked} assignments to PlayerVolunteers.`);
}

main()
  .catch((e) => {
    console.error("Backfill error:", e);
  })
  .finally(() => prisma.$disconnect());
