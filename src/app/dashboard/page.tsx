export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserTeamIds } from "@/lib/auth-helpers";
import { UserRole } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Users, Heart, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { SessionUser } from "@/types";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user) return null;

  const isAdmin =
    user.role === UserRole.ADMIN ||
    user.role === UserRole.SCHEDULE_MANAGER;

  const teamFilter = isAdmin
    ? { organizationId: user.organizationId }
    : { id: { in: await getUserTeamIds(user.id) } };

  const [facilityCount, teamCount, upcomingEvents, volunteerGaps] =
    await Promise.all([
      prisma.facility.count({
        where: { organizationId: user.organizationId },
      }),
      prisma.team.count({
        where: teamFilter,
      }),
      prisma.scheduleEvent.findMany({
        where: {
          OR: [
            { team: teamFilter },
            { type: "CLUB_EVENT" },
          ],
          cancelledByBumpId: null,
          startTime: { gte: new Date() },
        },
        include: { team: true, subFacility: { include: { facility: true } } },
        orderBy: { startTime: "asc" },
        take: 10,
      }),
      prisma.volunteerSlot.findMany({
        where: {
          scheduleEvent: {
            team: teamFilter,
            startTime: { gte: new Date() },
          },
          status: "OPEN",
        },
        include: {
          scheduleEvent: { include: { team: true } },
          signups: true,
        },
        take: 10,
      }),
    ]);

  const openSlots = volunteerGaps.filter(
    (s) => s.signups.length < s.slotsNeeded
  );

  const stats = [
    {
      label: "Facilities",
      value: facilityCount,
      icon: MapPin,
      href: "/dashboard/facilities",
      gradient: "from-blue-500/15 to-blue-600/5",
      iconColor: "text-blue-500",
    },
    {
      label: "Teams",
      value: teamCount,
      icon: Users,
      href: "/dashboard/teams",
      gradient: "from-emerald-500/15 to-emerald-600/5",
      iconColor: "text-emerald-500",
    },
    {
      label: "Upcoming Events",
      value: upcomingEvents.length,
      icon: Calendar,
      href: "/dashboard/schedules",
      gradient: "from-amber-500/15 to-amber-600/5",
      iconColor: "text-amber-500",
    },
    {
      label: "Volunteer Gaps",
      value: openSlots.length,
      icon: Heart,
      href: "/dashboard/volunteers",
      gradient: "from-primary/15 to-primary/5",
      iconColor: "text-primary",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {user.name}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="group hover:shadow-lg hover:shadow-black/5 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer rounded-2xl border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient}`}
                  >
                    <s.icon className={`h-5 w-5 ${s.iconColor}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200 -translate-x-2 group-hover:translate-x-0" />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">
                  {s.label}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Volunteer Needs
              </CardTitle>
              <Link
                href="/dashboard/volunteers"
                className="text-xs text-primary font-medium hover:underline"
              >
                Manage
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {openSlots.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Heart className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  All volunteer slots are filled!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {openSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-3 rounded-xl p-3 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 shrink-0">
                      <Heart className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {slot.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {slot.scheduleEvent.team?.name ?? "Club Event"} &middot;{" "}
                        {format(
                          new Date(slot.scheduleEvent.startTime),
                          "MMM d, h:mm a"
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-1 text-sm font-bold">
                        <span className="text-primary">
                          {slot.signups.length}
                        </span>
                        <span className="text-muted-foreground font-normal">
                          /{slot.slotsNeeded}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
