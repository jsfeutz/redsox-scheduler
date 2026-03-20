import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({
    include: {
      members: true,
      headCoach: { select: { id: true, name: true } },
    },
  });

  let fixed = 0;

  for (const team of teams) {
    const headCoachMembers = team.members.filter((m) => m.role === "HEAD_COACH");
    const hasHeadCoachId = !!team.headCoachId;
    const headCoachHasMembership = headCoachMembers.some(
      (m) => m.userId === team.headCoachId
    );

    // Case 1: headCoachId set but no matching TeamMember
    if (hasHeadCoachId && !headCoachHasMembership) {
      console.log(
        `[${team.name}] headCoachId=${team.headCoachId} (${team.headCoach?.name}) has no TeamMember. Creating...`
      );
      // Demote any existing HEAD_COACH members
      for (const m of headCoachMembers) {
        await prisma.teamMember.update({
          where: { id: m.id },
          data: { role: "ASSISTANT_COACH" },
        });
        console.log(`  Demoted existing HEAD_COACH member ${m.userId} to ASSISTANT_COACH`);
      }
      await prisma.teamMember.upsert({
        where: {
          teamId_userId: { teamId: team.id, userId: team.headCoachId },
        },
        create: {
          teamId: team.id,
          userId: team.headCoachId,
          role: "HEAD_COACH",
        },
        update: { role: "HEAD_COACH" },
      });
      fixed++;
    }

    // Case 2: TeamMember with HEAD_COACH but headCoachId is different/null
    if (!hasHeadCoachId && headCoachMembers.length > 0) {
      const first = headCoachMembers[0];
      console.log(
        `[${team.name}] No headCoachId but has HEAD_COACH member ${first.userId}. Setting headCoachId...`
      );
      await prisma.team.update({
        where: { id: team.id },
        data: { headCoachId: first.userId },
      });
      // Demote extras
      for (const m of headCoachMembers.slice(1)) {
        await prisma.teamMember.update({
          where: { id: m.id },
          data: { role: "ASSISTANT_COACH" },
        });
        console.log(`  Demoted duplicate HEAD_COACH member ${m.userId}`);
      }
      fixed++;
    }

    // Case 3: Multiple HEAD_COACH members -- keep only the one matching headCoachId
    if (hasHeadCoachId && headCoachMembers.length > 1) {
      console.log(
        `[${team.name}] Multiple HEAD_COACH members (${headCoachMembers.length}). Keeping only ${team.headCoachId}...`
      );
      for (const m of headCoachMembers) {
        if (m.userId !== team.headCoachId) {
          await prisma.teamMember.update({
            where: { id: m.id },
            data: { role: "ASSISTANT_COACH" },
          });
          console.log(`  Demoted ${m.userId} to ASSISTANT_COACH`);
        }
      }
      fixed++;
    }
  }

  // Also update teamJobsCountHours to true for all orgs
  const orgs = await prisma.organization.updateMany({
    where: { teamJobsCountHours: false },
    data: { teamJobsCountHours: true },
  });
  if (orgs.count > 0) {
    console.log(`Enabled teamJobsCountHours for ${orgs.count} organization(s)`);
  }

  console.log(`\nDone. Fixed ${fixed} team(s).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
