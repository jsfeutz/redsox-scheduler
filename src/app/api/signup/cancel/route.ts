import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { notifyAdminsVolunteerCancellation } from "@/lib/notify";

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

  await prisma.jobAssignment.update({
    where: { id: assignment.id },
    data: { cancelledAt: new Date() },
  });

  const evt = assignment.gameJob.scheduleEvent;
  let orgId =
    evt?.team?.organizationId ??
    evt?.subFacility?.facility?.organizationId ??
    null;
  if (!orgId) {
    const fallback = await prisma.organization.findFirst({ select: { id: true } });
    orgId = fallback?.id ?? null;
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
        ? format(new Date(evt.startTime), "EEEE, MMM d, yyyy 'at' h:mm a")
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
