export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Trophy } from "lucide-react";
import { SeasonForm } from "@/components/seasons/season-form";
import { SeasonTeamsManager } from "@/components/seasons/season-teams-manager";

export default async function SeasonsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [seasons, teams] = await Promise.all([
    prisma.season.findMany({
      where: { organizationId: user.organizationId },
      include: {
        seasonTeams: {
          include: {
            team: {
              select: { id: true, name: true, color: true, ageGroup: true },
            },
          },
        },
        _count: { select: { scheduleEvents: true } },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.team.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const isAdmin = user.role === UserRole.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seasons</h1>
          <p className="text-muted-foreground mt-1">
            Manage seasons and assign teams
          </p>
        </div>
        {isAdmin && (
          <SeasonForm
            trigger={
              <Button className="rounded-xl shadow-md shadow-primary/15 active:scale-95 transition-all">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Season
              </Button>
            }
          />
        )}
      </div>

      {seasons.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 mb-4">
              <Trophy className="h-8 w-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold">No seasons yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first season to start scheduling.
            </p>
            {isAdmin && (
              <SeasonForm
                trigger={
                  <Button className="mt-6 rounded-xl shadow-md shadow-primary/15">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Season
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {seasons.map((season) => {
            const now = new Date();
            const isActive =
              now >= new Date(season.startDate) &&
              now <= new Date(season.endDate);
            const isPast = now > new Date(season.endDate);

            return (
              <Card
                key={season.id}
                className="rounded-2xl border-border/50 hover:shadow-lg hover:shadow-black/5 transition-all duration-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-bold">
                          {season.name}
                        </CardTitle>
                        {isActive && (
                          <Badge className="rounded-lg bg-emerald-500/15 text-emerald-500 border-0">
                            Active
                          </Badge>
                        )}
                        {isPast && (
                          <Badge
                            variant="secondary"
                            className="rounded-lg"
                          >
                            Completed
                          </Badge>
                        )}
                        {!isActive && !isPast && (
                          <Badge
                            variant="outline"
                            className="rounded-lg"
                          >
                            Upcoming
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs">
                        {format(new Date(season.startDate), "MMM d, yyyy")}{" "}
                        &ndash;{" "}
                        {format(new Date(season.endDate), "MMM d, yyyy")}
                        {" \u00B7 "}
                        {season._count.scheduleEvents} event
                        {season._count.scheduleEvents !== 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                    {isAdmin && (
                      <SeasonForm
                        season={{
                          id: season.id,
                          name: season.name,
                          startDate: season.startDate.toISOString(),
                          endDate: season.endDate.toISOString(),
                        }}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                          >
                            Edit
                          </Button>
                        }
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Teams
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {season.seasonTeams.length} team
                        {season.seasonTeams.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {isAdmin ? (
                      <SeasonTeamsManager
                        seasonId={season.id}
                        assignedTeams={season.seasonTeams.map((st) => ({
                          id: st.team.id,
                          name: st.team.name,
                          color: st.team.color,
                          ageGroup: st.team.ageGroup,
                        }))}
                        allTeams={teams}
                      />
                    ) : season.seasonTeams.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No teams assigned yet.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {season.seasonTeams.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/50 px-3 py-1.5"
                          >
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: st.team.color }}
                            />
                            <span className="text-sm font-medium">
                              {st.team.name}
                            </span>
                            {st.team.ageGroup && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] rounded-lg"
                              >
                                {st.team.ageGroup}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
