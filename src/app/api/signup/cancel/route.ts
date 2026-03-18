import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
          scheduleEvent: { select: { title: true, startTime: true } },
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

  return NextResponse.json({
    success: true,
    jobName: assignment.gameJob.jobTemplate.name,
    eventTitle: assignment.gameJob.scheduleEvent?.title ?? "Event",
  });
}
