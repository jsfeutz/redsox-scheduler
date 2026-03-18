"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Plus, Users, Calendar, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TeamForm } from "@/components/teams/team-form";
import { DeleteTeamDialog } from "@/components/teams/delete-team-dialog";
import { StopPropagation } from "@/components/ui/stop-propagation";

interface TeamData {
  id: string;
  name: string;
  ageGroup: string | null;
  icon: string | null;
  color: string;
  active: boolean;
  headCoachId: string | null;
  headCoachName: string | null;
  eventCount: number;
  isMyTeam: boolean;
}

interface Props {
  teams: TeamData[];
  isAdmin: boolean;
}

export function TeamsView({ teams, isAdmin }: Props) {
  const [filter, setFilter] = useState("");
  const [showAll, setShowAll] = useState(false);

  const hasMyTeams = teams.some((t) => t.isMyTeam);

  const filtered = useMemo(() => {
    let result = teams;
    if (hasMyTeams && !showAll) {
      result = result.filter((t) => t.isMyTeam);
    }
    if (filter) {
      const q = filter.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.ageGroup && t.ageGroup.toLowerCase().includes(q)) ||
          (t.headCoachName && t.headCoachName.toLowerCase().includes(q))
      );
    }
    return result;
  }, [teams, filter, showAll, hasMyTeams]);

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center flex-1">
        <Users className="h-10 w-10 text-muted-foreground/40" />
        <h3 className="mt-3 text-base font-medium">No teams yet</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Create your first team to get started.
        </p>
        {isAdmin && (
          <TeamForm
            trigger={
              <Button className="mt-4 rounded-xl shadow-md shadow-primary/15">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Team
              </Button>
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 md:block md:space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 shrink-0 py-2 md:py-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        {hasMyTeams && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Switch
              id="show-all-teams"
              checked={showAll}
              onCheckedChange={setShowAll}
              className="scale-90"
            />
            <Label
              htmlFor="show-all-teams"
              className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap"
            >
              All teams
            </Label>
          </div>
        )}
        {isAdmin && (
          <TeamForm
            trigger={
              <Button size="icon" className="h-9 w-9 shrink-0 md:hidden rounded-xl">
                <Plus className="h-4 w-4" />
              </Button>
            }
          />
        )}
        {isAdmin && (
          <TeamForm
            trigger={
              <Button className="hidden md:flex rounded-xl shadow-md shadow-primary/15">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Team
              </Button>
            }
          />
        )}
      </div>

      {/* Scrollable team list */}
      <div className="flex-1 overflow-y-auto min-h-0 md:overflow-visible">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((team) => (
            <Link
              key={team.id}
              href={`/dashboard/teams/${team.id}`}
              className="block"
            >
              <Card
                className={cn(
                  "group rounded-xl overflow-hidden active:bg-accent/30 md:hover:shadow-lg md:hover:-translate-y-0.5 transition-all duration-200 cursor-pointer",
                  !team.active && "opacity-50"
                )}
              >
                <div
                  className="h-1"
                  style={{ backgroundColor: team.active ? team.color : "var(--muted)" }}
                />
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.icon || team.name.split(/\s|-/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold truncate">{team.name}</h3>
                        {!team.active && (
                          <Badge variant="secondary" className="text-[10px] rounded-lg px-1.5 py-0">
                            Inactive
                          </Badge>
                        )}
                        {team.ageGroup && (
                          <Badge variant="secondary" className="text-[10px] rounded-lg px-1.5 py-0 hidden sm:inline-flex">
                            {team.ageGroup}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] md:text-xs text-muted-foreground">
                        <span className="truncate">
                          {team.headCoachName ?? "No coach"}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="h-3 w-3" />
                          {team.eventCount}
                        </span>
                      </div>
                    </div>
                    {isAdmin && (
                      <StopPropagation className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && filter && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No teams match your search.
          </p>
        )}
      </div>
    </div>
  );
}
