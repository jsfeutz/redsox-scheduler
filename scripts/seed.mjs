import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existingOrg = await prisma.organization.findFirst();
  if (existingOrg) {
    console.log("Database already seeded, skipping.");
    return;
  }

  console.log("Seeding database...");

  const org = await prisma.organization.create({
    data: { name: "Rubicon Redsox" },
  });

  const passwordHash = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@rubiconredsox.club",
      name: "Club Admin",
      passwordHash,
      role: "ADMIN",
      organizationId: org.id,
    },
  });

  const coach = await prisma.user.create({
    data: {
      email: "coach@rubiconredsox.club",
      name: "Jon Doe",
      passwordHash,
      role: "COACH",
      organizationId: org.id,
    },
  });

  const assistantCoach = await prisma.user.create({
    data: {
      email: "assistant@rubiconredsox.club",
      name: "Jane Smith",
      passwordHash,
      role: "COACH",
      organizationId: org.id,
    },
  });

  const facility = await prisma.facility.create({
    data: {
      name: "Community Park Fields",
      address: "123 Main Street",
      notes: "Main baseball complex",
      organizationId: org.id,
      subFacilities: {
        create: [
          { name: "Diamond 1", type: "Full Diamond", capacity: 200 },
          { name: "Diamond 2", type: "Full Diamond", capacity: 150 },
          { name: "Practice Field A", type: "Half Diamond", capacity: 50 },
        ],
      },
    },
    include: { subFacilities: true },
  });

  const season = await prisma.season.create({
    data: {
      name: "Spring 2026",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-06-30"),
      organizationId: org.id,
    },
  });

  const teamABall = await prisma.team.create({
    data: {
      name: "A-Ball",
      ageGroup: "8U",
      color: "#3b82f6",
      headCoachId: coach.id,
      organizationId: org.id,
    },
  });

  const teamMajors = await prisma.team.create({
    data: {
      name: "Majors",
      ageGroup: "12U",
      color: "#ef4444",
      organizationId: org.id,
    },
  });

  // Create TeamMember records
  await prisma.teamMember.create({
    data: {
      teamId: teamABall.id,
      userId: coach.id,
      role: "HEAD_COACH",
    },
  });

  await prisma.teamMember.create({
    data: {
      teamId: teamABall.id,
      userId: assistantCoach.id,
      role: "ASSISTANT_COACH",
    },
  });

  const seasonTeams = await Promise.all([
    prisma.seasonTeam.create({
      data: { seasonId: season.id, teamId: teamABall.id },
    }),
    prisma.seasonTeam.create({
      data: { seasonId: season.id, teamId: teamMajors.id },
    }),
  ]);

  // Team-scoped job templates (coach manages these)
  // Scorekeeper applies to A-Ball only; others apply to all teams (no join rows)
  const [scorekeeper, walkMusic, videoStream, scoreboard] = await Promise.all([
    prisma.jobTemplate.create({
      data: {
        name: "Scorekeeper",
        description: "Keep the official game score",
        scope: "TEAM",
        hoursPerGame: 2,
        organizationId: org.id,
        teamId: teamABall.id,
      },
    }),
    prisma.jobTemplate.create({
      data: {
        name: "Walk Music Manager",
        description: "Play walk-up music for batters",
        scope: "TEAM",
        hoursPerGame: 2,
        organizationId: org.id,
      },
    }),
    prisma.jobTemplate.create({
      data: {
        name: "Video Stream Handler",
        description: "Manage the live video stream of the game",
        scope: "TEAM",
        hoursPerGame: 2.5,
        organizationId: org.id,
      },
    }),
    prisma.jobTemplate.create({
      data: {
        name: "Scoreboard Operator",
        description: "Operate the physical or digital scoreboard",
        scope: "TEAM",
        hoursPerGame: 2,
        organizationId: org.id,
      },
    }),
  ]);

  // Facility-scoped job templates (all facilities by default)
  const [concessions, fieldPrep] = await Promise.all([
    prisma.jobTemplate.create({
      data: {
        name: "Concessions",
        description: "Work the concession stand during the game",
        scope: "FACILITY",
        hoursPerGame: 3,
        organizationId: org.id,
      },
    }),
    prisma.jobTemplate.create({
      data: {
        name: "Field Prep",
        description: "Help prepare the field before the game",
        scope: "FACILITY",
        hoursPerGame: 1,
        organizationId: org.id,
      },
    }),
  ]);

  // Equipment Manager — only A-Ball
  const equipmentMgr = await prisma.jobTemplate.create({
    data: {
      name: "Equipment Manager",
      description: "Set up and break down team equipment for practice",
      scope: "TEAM",
      hoursPerGame: 1.5,
      organizationId: org.id,
      teamId: teamABall.id,
    },
  });

  // Season job configs for A-Ball: what jobs are needed per GAME
  const seasonTeamABall = seasonTeams[0];
  await prisma.seasonJobConfig.createMany({
    data: [
      {
        seasonTeamId: seasonTeamABall.id,
        jobTemplateId: scorekeeper.id,
        eventType: "GAME",
        slotsNeeded: 1,
      },
      {
        seasonTeamId: seasonTeamABall.id,
        jobTemplateId: walkMusic.id,
        eventType: "GAME",
        slotsNeeded: 1,
      },
      {
        seasonTeamId: seasonTeamABall.id,
        jobTemplateId: scoreboard.id,
        eventType: "GAME",
        slotsNeeded: 1,
      },
      {
        seasonTeamId: seasonTeamABall.id,
        jobTemplateId: equipmentMgr.id,
        eventType: "PRACTICE",
        slotsNeeded: 2,
      },
    ],
  });

  // Facility job configs: what jobs the facility always needs
  await prisma.facilityJobConfig.createMany({
    data: [
      {
        facilityId: facility.id,
        jobTemplateId: concessions.id,
        slotsNeeded: 3,
      },
      {
        facilityId: facility.id,
        jobTemplateId: fieldPrep.id,
        slotsNeeded: 2,
      },
    ],
  });

  // Create sample events with auto-created jobs
  const sunday = new Date("2026-03-22T17:30:00");
  const practice = await prisma.scheduleEvent.create({
    data: {
      title: "A-Ball Sunday Practice",
      type: "PRACTICE",
      priority: "NORMAL",
      startTime: sunday,
      endTime: new Date("2026-03-22T19:00:00"),
      teamId: teamABall.id,
      subFacilityId: facility.subFacilities[2].id,
      seasonId: season.id,
    },
  });

  // Auto-create practice jobs from season config
  await prisma.gameJob.create({
    data: {
      jobTemplateId: equipmentMgr.id,
      scheduleEventId: practice.id,
      slotsNeeded: 2,
      isPublic: false,
    },
  });

  const tuesday = new Date("2026-03-24T18:40:00");
  const game1 = await prisma.scheduleEvent.create({
    data: {
      title: "A-Ball vs Tigers",
      type: "GAME",
      priority: "HIGH",
      startTime: tuesday,
      endTime: new Date("2026-03-24T20:40:00"),
      teamId: teamABall.id,
      subFacilityId: facility.subFacilities[0].id,
      seasonId: season.id,
    },
  });

  const wednesday = new Date("2026-03-25T16:45:00");
  const game2 = await prisma.scheduleEvent.create({
    data: {
      title: "A-Ball vs Lions",
      type: "GAME",
      priority: "HIGH",
      startTime: wednesday,
      endTime: new Date("2026-03-25T18:45:00"),
      teamId: teamABall.id,
      subFacilityId: facility.subFacilities[1].id,
      seasonId: season.id,
    },
  });

  for (const game of [game1, game2]) {
    // Season-configured team jobs (coach assigns directly)
    for (const tmpl of [scorekeeper, walkMusic, scoreboard]) {
      await prisma.gameJob.create({
        data: {
          jobTemplateId: tmpl.id,
          scheduleEventId: game.id,
          slotsNeeded: 1,
          isPublic: false,
        },
      });
    }

    // Facility-required jobs (public - any parent can sign up)
    await prisma.gameJob.create({
      data: {
        jobTemplateId: concessions.id,
        scheduleEventId: game.id,
        slotsNeeded: 3,
        isPublic: true,
      },
    });
    await prisma.gameJob.create({
      data: {
        jobTemplateId: fieldPrep.id,
        scheduleEventId: game.id,
        slotsNeeded: 2,
        isPublic: true,
      },
    });

    // Volunteer slots
    await prisma.volunteerSlot.createMany({
      data: [
        {
          name: "Field Prep Volunteers",
          description: "Help prepare the field before the game",
          slotsNeeded: 3,
          durationMinutes: 60,
          scheduleEventId: game.id,
        },
        {
          name: "Concession Stand Volunteers",
          description: "Work the concession stand during the game",
          slotsNeeded: 2,
          durationMinutes: 150,
          scheduleEventId: game.id,
        },
      ],
    });
  }

  console.log("Seed complete!");
  console.log(`  Organization: ${org.name}`);
  console.log(`  Admin login: admin@rubiconredsox.club / admin123`);
  console.log(`  Coach login: coach@rubiconredsox.club / admin123`);
  console.log(`  Asst Coach login: assistant@rubiconredsox.club / admin123`);
  console.log(`  Facility: ${facility.name} with ${facility.subFacilities.length} sub-facilities`);
  console.log(`  Teams: A-Ball (Jon Doe + Jane Smith), Majors (no coach)`);
  console.log(`  Season: Spring 2026`);
  console.log(`  Season job config: Scorekeeper/Walk Music/Scoreboard for GAME, Equipment Mgr for PRACTICE`);
  console.log(`  Facility job config: Concessions (3 needed), Field Prep (2 needed)`);
  console.log(`  Sample events: 1 practice, 2 games (with auto-created jobs)`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
