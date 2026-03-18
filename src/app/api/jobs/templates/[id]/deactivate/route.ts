import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isOrgAdmin } from "@/lib/auth-helpers";
import { notifyJobCancellation } from "@/lib/notify";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isOrgAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { confirm, teamId } = body;

  const template = await prisma.jobTemplate.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const now = new Date();
  const futureJobWhere = {
    jobTemplateId: id,
    scheduleEvent: { startTime: { gte: now } },
    ...(teamId ? { scheduleEvent: { startTime: { gte: now }, teamId } } : {}),
  };

  const affectedAssignments = await prisma.jobAssignment.findMany({
    where: {
      cancelledAt: null,
      gameJob: futureJobWhere,
    },
    include: {
      gameJob: {
        include: {
          jobTemplate: { select: { name: true } },
          scheduleEvent: {
            select: {
              id: true,
              title: true,
              startTime: true,
              subFacility: {
                select: { name: true, facility: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!confirm) {
    return NextResponse.json({
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

  await prisma.$transaction(async (tx) => {
    if (affectedAssignments.length > 0) {
      await tx.jobAssignment.updateMany({
        where: {
          id: { in: affectedAssignments.map((a) => a.id) },
        },
        data: { cancelledAt: now },
      });
    }

    if (!teamId) {
      await tx.jobTemplate.update({
        where: { id },
        data: { active: false },
      });
    }
  });

  for (const a of affectedAssignments) {
    if (a.email) {
      try {
        const evt = a.gameJob.scheduleEvent;
        const location = evt?.subFacility
          ? `${evt.subFacility.facility.name} – ${evt.subFacility.name}`
          : "";
        await notifyJobCancellation({
          assignmentId: a.id,
          name: a.name ?? "Volunteer",
          email: a.email,
          phone: a.phone,
          jobName: a.gameJob.jobTemplate.name,
          eventTitle: evt?.title ?? "Event",
          eventDate: evt?.startTime?.toISOString() ?? "",
          location,
          reason: "This volunteer job has been deactivated by an administrator.",
          eventId: evt?.id,
          gameJobId: a.gameJob.id,
        });
      } catch (err) {
        console.error("[NOTIFY] Failed to send cancellation:", err);
      }
    }
  }

  return NextResponse.json({
    success: true,
    cancelledSignups: affectedAssignments.length,
  });
}
