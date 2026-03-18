import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageTeam } from "@/lib/auth-helpers";
import { sendJobCancellationNotification } from "@/lib/email";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: teamId } = await params;

  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId: user.organizationId },
  });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const globalTeamTemplates = await prisma.jobTemplate.findMany({
    where: {
      organizationId: user.organizationId,
      scope: "TEAM",
      teamId: null,
      active: true,
    },
    orderBy: { name: "asc" },
  });

  const overrides = await prisma.teamJobOverride.findMany({
    where: { teamId },
  });

  const overrideMap = new Map(
    overrides.map((o) => [o.jobTemplateId, o.active])
  );

  const result = globalTeamTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    hoursPerGame: t.hoursPerGame,
    active: overrideMap.has(t.id) ? overrideMap.get(t.id)! : true,
  }));

  return NextResponse.json(result);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: teamId } = await params;

  if (!(await canManageTeam(user, teamId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { jobTemplateId, active, confirm } = body;

  if (!jobTemplateId || typeof active !== "boolean") {
    return NextResponse.json(
      { error: "jobTemplateId and active are required" },
      { status: 400 }
    );
  }

  const template = await prisma.jobTemplate.findFirst({
    where: {
      id: jobTemplateId,
      organizationId: user.organizationId,
      scope: "TEAM",
      teamId: null,
    },
  });
  if (!template) {
    return NextResponse.json(
      { error: "Global team template not found" },
      { status: 404 }
    );
  }

  if (!active) {
    const now = new Date();
    const affectedAssignments = await prisma.jobAssignment.findMany({
      where: {
        cancelledAt: null,
        gameJob: {
          jobTemplateId,
          scheduleEvent: { startTime: { gte: now }, teamId },
        },
      },
      include: {
        gameJob: {
          include: {
            jobTemplate: { select: { name: true } },
            scheduleEvent: {
              select: {
                title: true,
                startTime: true,
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
      },
    });

    if (affectedAssignments.length > 0 && !confirm) {
      return NextResponse.json({
        needsConfirmation: true,
        affectedSignups: affectedAssignments.length,
        volunteers: affectedAssignments.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          jobName: a.gameJob.jobTemplate.name,
          eventTitle: a.gameJob.scheduleEvent?.title ?? "Event",
        })),
      });
    }

    if (affectedAssignments.length > 0 && confirm) {
      await prisma.jobAssignment.updateMany({
        where: { id: { in: affectedAssignments.map((a) => a.id) } },
        data: { cancelledAt: now },
      });

      for (const a of affectedAssignments) {
        if (a.email) {
          try {
            const evt = a.gameJob.scheduleEvent;
            const location = evt?.subFacility
              ? `${evt.subFacility.facility.name} – ${evt.subFacility.name}`
              : "";
            await sendJobCancellationNotification({
              to: a.email,
              name: a.name ?? "Volunteer",
              jobName: a.gameJob.jobTemplate.name,
              eventTitle: evt?.title ?? "Event",
              eventDate: evt?.startTime?.toISOString() ?? "",
              location,
              reason: `This volunteer job has been disabled for the team.`,
            });
          } catch (err) {
            console.error("[EMAIL] Failed to send cancellation:", err);
          }
        }
      }
    }
  }

  const override = await prisma.teamJobOverride.upsert({
    where: { teamId_jobTemplateId: { teamId, jobTemplateId } },
    create: { teamId, jobTemplateId, active },
    update: { active },
  });

  return NextResponse.json(override);
}
