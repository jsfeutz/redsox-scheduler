export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { Calendar, MapPin, Clock, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import { VolunteerSlotCard } from "../volunteer-slot-card";

type PageProps = { params: Promise<{ orgId: string }> };

export default async function OrgVolunteerPage({ params }: PageProps) {
  const { orgId } = await params;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });

  if (!org) notFound();

  const events = await prisma.scheduleEvent.findMany({
    where: {
      startTime: { gte: new Date() },
      team: { organizationId: orgId },
      volunteerSlots: {
        some: { status: "OPEN" },
      },
    },
    include: {
      team: { select: { id: true, name: true, color: true } },
      subFacility: {
        include: { facility: { select: { id: true, name: true } } },
      },
      volunteerSlots: {
        where: { status: "OPEN" },
        include: {
          _count: { select: { signups: true } },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const eventsByDate = events.reduce<
    Record<string, typeof events>
  >((acc, event) => {
    const dateKey = format(new Date(event.startTime), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Heart className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Volunteer Sign-Up
        </h1>
        <p className="mt-1 text-lg font-medium text-primary">{org.name}</p>
        <p className="mt-2 text-muted-foreground">
          Help make our games great! Browse upcoming events and sign up for
          volunteer shifts below.
        </p>
      </div>

      {Object.keys(eventsByDate).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">
              No open volunteer slots right now
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back later for upcoming opportunities!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(eventsByDate).map(([dateKey, dateEvents]) => (
            <section key={dateKey}>
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">
                  {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
                </h2>
              </div>

              <div className="space-y-4">
                {dateEvents.map((event) => (
                  <Card key={event.id}>
                    <CardContent className="space-y-4 pt-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{event.title}</h3>
                            <Badge variant="secondary">
                              {event.team?.name ?? "Club Event"}
                            </Badge>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {format(new Date(event.startTime), "h:mm a")} –{" "}
                              {format(new Date(event.endTime), "h:mm a")}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {event.subFacility ? `${event.subFacility.facility.name} – ${event.subFacility.name}` : "TBD"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 border-t pt-3">
                        {event.volunteerSlots.map((slot) => (
                          <VolunteerSlotCard
                            key={slot.id}
                            slot={{
                              id: slot.id,
                              name: slot.name,
                              description: slot.description,
                              slotsNeeded: slot.slotsNeeded,
                              signupCount: slot._count.signups,
                            }}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
