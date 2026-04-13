import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdminsVolunteerCancellation } from "@/lib/notify";
import { formatEventDateFull } from "@/lib/org-datetime";
import { logScheduleEventAudit } from "@/lib/schedule-event-audit";

export async function POST(req: Request) {
  const body = await req.json();
  const { token } = body;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const assignment = await prisma.jobAssignment.findUnique({
    where: { cancelToken: token },
    include: {
      gameJob: {
        include: {
          jobTemplate: { select: { name: true } },
          scheduleEvent: {
            select: {
              id: true,
              title: true,
              startTime: true,
              team: { select: { organizationId: true } },
              subFacility: {
                select: {
                  name: true,
                  facility: { select: { organizationId: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  if (assignment.cancelledAt) {
    return NextResponse.json({ error: "Already cancelled" }, { status: 409 });
  }

  const evt = assignment.gameJob.scheduleEvent;
  let orgId =
    evt?.team?.organizationId ??
    evt?.subFacility?.facility?.organizationId ??
    null;
  if (!orgId) {
    const fallback = await prisma.organization.findFirst({ select: { id: true } });
    orgId = fallback?.id ?? null;
  }

  if (orgId && evt) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { cancelCutoffHours: true },
    });
    const cutoff = org?.cancelCutoffHours ?? 0;
    if (cutoff > 0) {
      const hoursUntil =
        (new Date(evt.startTime).getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntil < cutoff) {
        return NextResponse.json(
          {
            error: `Signups cannot be cancelled within ${cutoff} hours of the event.`,
            cutoffHours: cutoff,
          },
          { status: 403 }
        );
      }
    }
  }

  await prisma.jobAssignment.update({
    where: { id: assignment.id },
    data: { cancelledAt: new Date() },
  });

  if (orgId && evt) {
    void logScheduleEventAudit(prisma, {
      organizationId: orgId,
      scheduleEventId: evt.id,
      action: "VOLUNTEER_CANCEL",
      actorUserId: null,
      actorLabel: `${assignment.name} (${assignment.email})`,
      summary: `${assignment.name} (${assignment.email}) cancelled ${assignment.gameJob.jobTemplate.name} signup for ${evt.title}`,
      before: {
        assignmentId: assignment.id,
        name: assignment.name,
        email: assignment.email,
        jobName: assignment.gameJob.jobTemplate.name,
        eventTitle: evt.title,
      },
    });
  }

  const loc =
    evt?.subFacility?.facility && evt.subFacility
      ? `${evt.subFacility.facility.name} – ${evt.subFacility.name}`
      : "";

  if (orgId) {
    void notifyAdminsVolunteerCancellation({
      organizationId: orgId,
      volunteerName: assignment.name,
      volunteerEmail: assignment.email,
      jobName: assignment.gameJob.jobTemplate.name,
      eventTitle: evt?.title ?? "Event",
      eventDate: evt?.startTime
        ? formatEventDateFull(new Date(evt.startTime))
        : "",
      location: loc,
    });
  }

  return NextResponse.json({
    success: true,
    jobName: assignment.gameJob.jobTemplate.name,
    eventTitle: assignment.gameJob.scheduleEvent?.title ?? "Event",
  });
}
