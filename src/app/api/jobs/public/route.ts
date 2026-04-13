import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSeasonTokenExpiry } from "@/lib/token-expiry";
import { notifyJobSignup } from "@/lib/notify";
import { isValidComfortLevel } from "@/lib/comfort-level";
import { formatEventDateLong } from "@/lib/org-datetime";
import { logScheduleEventAudit } from "@/lib/schedule-event-audit";

export async function GET() {
  const now = new Date();

  const jobs = await prisma.gameJob.findMany({
    where: {
      isPublic: true,
      disabled: false,
      jobTemplate: { scope: "FACILITY" },
      scheduleEvent: {
        startTime: { gte: now },
      },
    },
    include: {
      jobTemplate: { select: { name: true, description: true, askComfortLevel: true } },
      scheduleEvent: {
        select: {
          title: true,
          startTime: true,
          endTime: true,
          type: true,
          team: { select: { name: true, color: true } },
          subFacility: {
            select: {
              facility: { select: { name: true } },
            },
          },
        },
      },
      _count: {
        select: { assignments: { where: { cancelledAt: null } } },
      },
    },
    orderBy: {
      scheduleEvent: { startTime: "asc" },
    },
  });

  const result = jobs.map((job) => ({
    id: job.id,
    slotsNeeded: job.slotsNeeded,
    assignmentsCount: job._count.assignments,
    slotsRemaining: job.slotsNeeded - job._count.assignments,
    jobTemplate: {
      ...job.jobTemplate,
      askComfortLevel: job.jobTemplate.askComfortLevel,
    },
    scheduleEvent: job.scheduleEvent,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { gameJobId, name, email, playerName, phone, comfortLevel, reminderHoursBefore } = body;

    if (!gameJobId || !name || !email) {
      return NextResponse.json(
        { error: "gameJobId, name, and email are required" },
        { status: 400 }
      );
    }

    const emailTrimmed = email.trim().toLowerCase();

    const job = await prisma.gameJob.findFirst({
      where: { id: gameJobId, isPublic: true, disabled: false },
      include: {
        jobTemplate: { select: { hoursPerGame: true, askComfortLevel: true } },
        _count: { select: { assignments: { where: { cancelledAt: null } } } },
      },
    });
    if (!job) {
      return NextResponse.json(
        { error: "Public job not found" },
        { status: 404 }
      );
    }

    if (job._count.assignments >= job.slotsNeeded) {
      return NextResponse.json(
        { error: "No open slots available" },
        { status: 400 }
      );
    }

    const existingSignup = await prisma.jobAssignment.findFirst({
      where: { gameJobId, email: emailTrimmed, cancelledAt: null },
    });
    if (existingSignup) {
      return NextResponse.json(
        { error: "Already signed up for this job" },
        { status: 409 }
      );
    }

    if (job.jobTemplate.askComfortLevel) {
      if (!comfortLevel || !isValidComfortLevel(comfortLevel)) {
        return NextResponse.json(
          { error: "Please select your comfort level for this role" },
          { status: 400 }
        );
      }
    }

    const hoursEarned = job.overrideHoursPerGame ?? job.jobTemplate.hoursPerGame;

    const matchedVolunteer = await prisma.playerVolunteer.findFirst({
      where: { email: emailTrimmed },
      include: { player: { select: { name: true } } },
    });

    const assignment = await prisma.jobAssignment.create({
      data: {
        gameJobId,
        name: name.trim(),
        email: emailTrimmed,
        phone: phone?.trim() || null,
        playerName: playerName?.trim() || matchedVolunteer?.player.name || null,
        comfortLevel:
          job.jobTemplate.askComfortLevel && isValidComfortLevel(comfortLevel)
            ? comfortLevel
            : null,
        playerVolunteerId: matchedVolunteer?.id || null,
        hoursEarned,
        reminderHoursBefore: typeof reminderHoursBefore === "number" && reminderHoursBefore > 0
          ? reminderHoursBefore
          : null,
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
                endTime: true,
                team: { select: { organizationId: true } },
                subFacility: {
                  select: {
                    name: true,
                    facility: { select: { name: true, organizationId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const signupEvt = assignment.gameJob.scheduleEvent;
    const signupOrgId =
      signupEvt?.team?.organizationId ??
      signupEvt?.subFacility?.facility?.organizationId ??
      null;

    if (signupOrgId && signupEvt) {
      void logScheduleEventAudit(prisma, {
        organizationId: signupOrgId,
        scheduleEventId: signupEvt.id,
        action: "VOLUNTEER_SIGNUP",
        actorUserId: null,
        actorLabel: `${name.trim()} (${emailTrimmed})`,
        summary: `${name.trim()} (${emailTrimmed}) signed up for ${assignment.gameJob.jobTemplate.name} – ${signupEvt.title}`,
        after: {
          assignmentId: assignment.id,
          name: name.trim(),
          email: emailTrimmed,
          phone: phone?.trim() || null,
          jobName: assignment.gameJob.jobTemplate.name,
          eventTitle: signupEvt.title,
          playerName: assignment.playerName,
        },
      });
    }

    let verificationToken: string | null = null;
    try {
      await prisma.emailVerification.deleteMany({ where: { email: emailTrimmed } });
      const verification = await prisma.emailVerification.create({
        data: {
          email: emailTrimmed,
          expiresAt: await getSeasonTokenExpiry(),
        },
      });
      verificationToken = verification.token;

      const evt = assignment.gameJob.scheduleEvent;
      const location = evt?.subFacility
        ? `${evt.subFacility.facility.name} – ${evt.subFacility.name}`
        : "";
      await notifyJobSignup({
        assignmentId: assignment.id,
        name: name.trim(),
        email: emailTrimmed,
        phone: phone?.trim() || null,
        jobName: assignment.gameJob.jobTemplate.name,
        eventTitle: evt?.title ?? "Event",
        eventDate: evt ? formatEventDateLong(new Date(evt.startTime)) : "",
        startTime: evt?.startTime?.toISOString() ?? new Date().toISOString(),
        endTime: evt?.endTime?.toISOString() ?? new Date().toISOString(),
        location,
        cancelToken: assignment.cancelToken,
        mySignupsToken: verification.token,
        eventId: evt ? undefined : undefined,
        gameJobId: assignment.gameJobId,
      });
    } catch (err) {
      console.error("[NOTIFY] Failed to send signup notification:", err);
    }

    if (
      assignment.reminderHoursBefore &&
      assignment.reminderHoursBefore > 0 &&
      assignment.gameJob.scheduleEvent?.startTime
    ) {
      try {
        const { enqueue } = await import("@/lib/queue");
        const startTime = new Date(assignment.gameJob.scheduleEvent.startTime);
        const sendAt = new Date(startTime.getTime() - assignment.reminderHoursBefore * 60 * 60 * 1000);
        if (sendAt > new Date()) {
          const evt = assignment.gameJob.scheduleEvent;
          const location = evt?.subFacility
            ? `${evt.subFacility.facility.name} – ${evt.subFacility.name}`
            : "";
          await enqueue(
            "signup-reminder",
            {
              assignmentId: assignment.id,
              name: name.trim(),
              email: emailTrimmed,
              phone: phone?.trim() || null,
              jobName: assignment.gameJob.jobTemplate.name,
              eventTitle: evt?.title ?? "Event",
              eventDate: formatEventDateLong(startTime),
              startTimeIso: startTime.toISOString(),
              endTimeIso: evt?.endTime ? new Date(evt.endTime).toISOString() : "",
              location,
              hoursUntil: assignment.reminderHoursBefore,
              eventId: undefined,
              gameJobId: assignment.gameJobId,
            },
            { startAfter: sendAt }
          );
        }
      } catch (err) {
        console.error("[QUEUE] Failed to enqueue signup reminder:", err);
      }
    }

    return NextResponse.json(
      { ...assignment, verificationToken },
      { status: 201 }
    );
  } catch (err) {
    console.error("[SIGNUP] Failed to process signup:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
