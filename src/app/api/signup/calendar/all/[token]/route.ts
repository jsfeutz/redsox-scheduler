import { prisma } from "@/lib/prisma";
import { generateMultiICS } from "@/lib/calendar";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: rawToken } = await params;
  const token = rawToken.replace(/\.ics$/, "");

  const verification = await prisma.emailVerification.findUnique({
    where: { token },
  });

  if (!verification || verification.expiresAt < new Date()) {
    return new Response("Link expired or invalid", { status: 401 });
  }

  const assignments = await prisma.jobAssignment.findMany({
    where: { email: verification.email, cancelledAt: null },
    include: {
      gameJob: {
        include: {
          jobTemplate: { select: { name: true } },
          scheduleEvent: {
            select: {
              title: true,
              startTime: true,
              endTime: true,
              customLocation: true,
              subFacility: {
                select: { name: true, facility: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });

  const events = assignments
    .filter((a) => a.gameJob.scheduleEvent)
    .map((a) => {
      const evt = a.gameJob.scheduleEvent!;
      const location = evt.subFacility
        ? `${evt.subFacility.facility.name} – ${evt.subFacility.name}`
        : evt.customLocation ?? "TBD";
      return {
        uid: a.id,
        title: `${a.gameJob.jobTemplate.name} – ${evt.title}`,
        startTime: evt.startTime.toISOString(),
        endTime: evt.endTime.toISOString(),
        location,
        description: `Volunteer shift: ${a.gameJob.jobTemplate.name}\nEvent: ${evt.title}\nLocation: ${location}`,
      };
    });

  if (events.length === 0) {
    return new Response("No signups found", { status: 404 });
  }

  const ics = generateMultiICS(events);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="my-signups.ics"`,
    },
  });
}
