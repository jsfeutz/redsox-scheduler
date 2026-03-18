import { prisma } from "@/lib/prisma";
import { generateICS } from "@/lib/calendar";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: rawToken } = await params;
  const cancelToken = rawToken.replace(/\.ics$/, "");

  const assignment = await prisma.jobAssignment.findUnique({
    where: { cancelToken },
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

  if (!assignment || !assignment.gameJob.scheduleEvent) {
    return new Response("Not found", { status: 404 });
  }

  const evt = assignment.gameJob.scheduleEvent;
  const location = evt.subFacility
    ? `${evt.subFacility.facility.name} – ${evt.subFacility.name}`
    : evt.customLocation ?? "TBD";

  const ics = generateICS({
    uid: assignment.id,
    title: `${assignment.gameJob.jobTemplate.name} – ${evt.title}`,
    startTime: evt.startTime.toISOString(),
    endTime: evt.endTime.toISOString(),
    location,
    description: `Volunteer shift: ${assignment.gameJob.jobTemplate.name}\nEvent: ${evt.title}\nLocation: ${location}`,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="signup-${assignment.id}.ics"`,
    },
  });
}
