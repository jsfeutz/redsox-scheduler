import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageSchedule, canManageTeam } from "@/lib/auth-helpers";
import { logScheduleEventAudit } from "@/lib/schedule-event-audit";

const FALLBACK_TEMPLATE_NAME = "Manual Job";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageSchedule(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    jobTemplateId,
    scheduleEventId,
    seasonId,
    teamId,
    playerId,
    slotsNeeded,
    isPublic,
    overrideName,
    overrideDescription,
    hoursPerSlot,
    assignNow,
  } = body as {
    jobTemplateId?: string | null;
    scheduleEventId?: string | null;
    seasonId?: string | null;
    teamId?: string | null;
    playerId?: string | null;
    slotsNeeded?: number;
    isPublic?: boolean;
    overrideName?: string | null;
    overrideDescription?: string | null;
    hoursPerSlot?: number | null;
    assignNow?:
      | { userId?: string | null; name?: string | null; email?: string | null }
      | { userId?: string | null; name?: string | null; email?: string | null }[]
      | null;
  };

  let derivedTeamId: string | null = teamId ?? null;
  let derivedPlayer: { id: string; name: string } | null = null;

  if (playerId) {
    const p = await prisma.player.findFirst({
      where: { id: playerId, team: { organizationId: user.organizationId } },
      select: { id: true, name: true, teamId: true },
    });
    if (!p) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    derivedPlayer = { id: p.id, name: p.name };
    if (!derivedTeamId) derivedTeamId = p.teamId;
  }

  if (scheduleEventId) {
    const evt = await prisma.scheduleEvent.findFirst({
      where: { id: scheduleEventId, team: { organizationId: user.organizationId } },
      select: { teamId: true },
    });
    if (!evt) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (!derivedTeamId) derivedTeamId = evt.teamId ?? null;
  }

  if (seasonId) {
    const season = await prisma.season.findFirst({
      where: { id: seasonId, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  if (derivedTeamId && !(await canManageTeam(user, derivedTeamId))) {
    return NextResponse.json({ error: "You are not a member of this team" }, { status: 403 });
  }

  const safeSlotsNeeded = Math.max(1, Number.isFinite(slotsNeeded as number) ? (slotsNeeded as number) : 1);
  const safeHours = typeof hoursPerSlot === "number" && Number.isFinite(hoursPerSlot) ? hoursPerSlot : null;

  const effectiveIsPublic = !!isPublic;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const template =
        jobTemplateId
          ? await tx.jobTemplate.findFirst({
              where: { id: jobTemplateId, organizationId: user.organizationId },
              select: { id: true, hoursPerGame: true },
            })
          : null;

      const ensuredTemplate =
        template ??
        (await tx.jobTemplate.findFirst({
          where: {
            organizationId: user.organizationId,
            teamId: null,
            name: FALLBACK_TEMPLATE_NAME,
          },
          select: { id: true, hoursPerGame: true },
        })) ??
        (await tx.jobTemplate.create({
          data: {
            name: FALLBACK_TEMPLATE_NAME,
            description: "Admin-created job (manual entry)",
            scope: "FACILITY",
            hoursPerGame: safeHours ?? 0,
            maxSlots: 1,
            forEventType: "ALL",
            active: true,
            askComfortLevel: false,
            organizationId: user.organizationId,
          },
          select: { id: true, hoursPerGame: true },
        }));

      const gameJob = await tx.gameJob.create({
        data: {
          jobTemplateId: ensuredTemplate.id,
          scheduleEventId: scheduleEventId || null,
          seasonId: seasonId || null,
          teamId: derivedTeamId,
          slotsNeeded: safeSlotsNeeded,
          isPublic: effectiveIsPublic,
          overrideName: overrideName?.trim() || null,
          overrideDescription: overrideDescription?.trim() || null,
          overrideHoursPerGame: safeHours,
        },
        include: {
          jobTemplate: { select: { name: true, scope: true, hoursPerGame: true } },
          assignments: { where: { cancelledAt: null } },
          scheduleEvent: { select: { id: true, title: true, startTime: true, endTime: true } },
        },
      });

      const assignmentsIn = Array.isArray(assignNow)
        ? assignNow
        : assignNow
          ? [assignNow]
          : [];

      const trimmed = assignmentsIn
        .map((a) => ({
          userId: a.userId || null,
          name: a.name?.trim() || null,
          email: a.email?.trim() || null,
        }))
        .filter((a) => a.userId || a.name);

      const hoursEarned = safeHours ?? ensuredTemplate.hoursPerGame;
      const limited = trimmed.slice(0, safeSlotsNeeded);

      const assignments = await Promise.all(
        limited.map(async (a) => {
          let playerVolunteerId: string | null = null;

          if (derivedPlayer && (a.email || a.name)) {
            const email = a.email?.trim() || null;
            const name = a.name?.trim() || "Volunteer";

            const existing = email
              ? await tx.playerVolunteer.findFirst({
                  where: { playerId: derivedPlayer.id, email: { equals: email, mode: "insensitive" } },
                  select: { id: true },
                })
              : await tx.playerVolunteer.findFirst({
                  where: { playerId: derivedPlayer.id, name: name },
                  select: { id: true },
                });

            const pv =
              existing ??
              (await tx.playerVolunteer.create({
                data: { playerId: derivedPlayer.id, name, email },
                select: { id: true },
              }));

            playerVolunteerId = pv.id;
          }

          return tx.jobAssignment.create({
            data: {
              gameJobId: gameJob.id,
              userId: a.userId,
              name: a.name,
              email: a.email,
              hoursEarned,
              playerName: derivedPlayer?.name ?? null,
              playerVolunteerId,
            },
            select: { id: true },
          });
        })
      );

      return { gameJob, assignments };
    });

    const jobName = result.gameJob.overrideName || result.gameJob.jobTemplate.name;
    const assignedNames = result.assignments.length > 0
      ? ` — assigned ${result.assignments.length}`
      : "";
    await logScheduleEventAudit(prisma, {
      organizationId: user.organizationId,
      scheduleEventId: scheduleEventId || null,
      action: "JOB_CREATE",
      actorUserId: user.id,
      actorLabel: `${user.name} (${user.email})`,
      summary: `Created job: ${jobName}${assignedNames}`,
      meta: {
        jobId: result.gameJob.id,
        templateName: result.gameJob.jobTemplate.name,
        assignmentCount: result.assignments.length,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[POST /api/jobs/create-with-assignment]", err);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}

