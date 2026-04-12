export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { Calendar, MapPin, Clock, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VolunteerSlotCard } from "./volunteer-slot-card";
import { PublicFooter } from "@/components/public-footer";

export default async function VolunteerPage() {
  const events = await prisma.scheduleEvent.findMany({
    where: {
      startTime: { gte: new Date() },
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

  const eventsByDate = events.reduce<Record<string, typeof events>>(
    (acc, event) => {
      const dateKey = format(new Date(event.startTime), "yyyy-MM-dd");
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    },
    {}
  );

  return (
    <div className="min-h-dvh bg-background">
      <div className="bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/25">
              <Heart className="h-7 w-7" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Volunteer Sign-Up
            </h1>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">
              Help the Rubicon Redsox! Browse upcoming games and pick a
              volunteer shift below.
            </p>
          </div>

          {Object.keys(eventsByDate).length === 0 ? (
            <Card className="rounded-2xl border-border/50">
              <CardContent className="flex flex-col items-center py-16">
                <Calendar className="h-14 w-14 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-semibold">
                  No open slots right now
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
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      {format(new Date(dateKey), "EEEE, MMMM d")}
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {dateEvents.map((event) => (
                      <Card
                        key={event.id}
                        className="rounded-2xl border-border/50 overflow-hidden"
                      >
                        <div
                          className="h-1"
                          style={{ backgroundColor: event.team?.color ?? "#6b7280" }}
                        />
                        <CardContent className="space-y-4 p-5">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-bold">
                                {event.title}
                              </h3>
                              <Badge
                                variant="outline"
                                style={{
                                  borderColor: event.team?.color ?? "#6b7280",
                                  color: event.team?.color ?? "#6b7280",
                                }}
                              >
                                {event.team?.name ?? "Club Event"}
                              </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {format(new Date(event.startTime), "h:mm a")}{" "}
                                &ndash;{" "}
                                {format(new Date(event.endTime), "h:mm a")}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" />
                                {event.subFacility ? `${event.subFacility.facility.name} – ${event.subFacility.name}` : "TBD"}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3 border-t border-border/50 pt-4">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                              Available Shifts
                            </p>
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

          <PublicFooter />
        </div>
      </div>
    </div>
  );
}
