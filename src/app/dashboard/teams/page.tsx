export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { TeamForm } from "@/components/teams/team-form";
import { DeleteTeamDialog } from "@/components/teams/delete-team-dialog";
import { ToggleTeamActive } from "@/components/teams/toggle-team-active";
import { StopPropagation } from "@/components/ui/stop-propagation";
import { TeamStaffSection } from "@/components/teams/team-staff-section";

export default async function TeamsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const teams = await prisma.team.findMany({
    where: { organizationId: user.organizationId },
    include: {
      headCoach: { select: { id: true, name: true, email: true } },
      _count: { select: { seasonTeams: true, scheduleEvents: true } },
    },
    orderBy: { name: "asc" },
  });

  const isAdmin = user.role === UserRole.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground mt-1">
            Manage your teams and rosters
          </p>
        </div>
        {isAdmin && (
          <TeamForm
            trigger={
              <Button className="rounded-xl shadow-md shadow-primary/15 active:scale-95 transition-all">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Team
              </Button>
            }
          />
        )}
      </div>

      {teams.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 mb-4">
              <Users className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold">No teams yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first team to get started.
            </p>
            {isAdmin && (
              <TeamForm
                trigger={
                  <Button className="mt-6 rounded-xl shadow-md shadow-primary/15">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Team
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/dashboard/teams/${team.id}`}
              className="block"
            >
            <Card
              className={`group rounded-2xl border-border/50 hover:shadow-lg hover:shadow-black/5 transition-all duration-200 hover:-translate-y-0.5 overflow-hidden cursor-pointer ${!team.active ? "opacity-50" : ""}`}
            >
              <div
                className="h-1"
                style={{ backgroundColor: team.active ? team.color : "var(--muted)" }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.icon || team.name
                        .split(/\s|-/)
                        .map((w: string) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CardTitle className="text-base">{team.name}</CardTitle>
                        {!team.active && (
                          <Badge variant="secondary" className="text-[10px] rounded-lg bg-muted text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      {team.ageGroup && (
                        <Badge
                          variant="secondary"
                          className="mt-1 text-[10px] rounded-lg"
                        >
                          {team.ageGroup}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <StopPropagation className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ToggleTeamActive teamId={team.id} active={team.active} />
                      <TeamForm
                        team={{
                          id: team.id,
                          name: team.name,
                          ageGroup: team.ageGroup,
                          color: team.color,
                          headCoachId: team.headCoachId,
                        }}
                        trigger={
                          <Button variant="ghost" size="icon-sm">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                      <DeleteTeamDialog
                        teamId={team.id}
                        teamName={team.name}
                        trigger={
                          <Button variant="ghost" size="icon-sm">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        }
                      />
                    </StopPropagation>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Coach</span>
                    <span className="font-medium text-foreground">
                      {team.headCoach?.name ?? "Unassigned"}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Seasons</span>
                    <span className="font-medium text-foreground">
                      {team._count.seasonTeams}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Events</span>
                    <span className="font-medium text-foreground">
                      {team._count.scheduleEvents}
                    </span>
                  </div>
                </div>

                <TeamStaffSection teamId={team.id} canManage={isAdmin} />
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
