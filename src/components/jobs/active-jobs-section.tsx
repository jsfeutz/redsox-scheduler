"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { JobTemplate } from "@prisma/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  UserPlus,
  X,
  Calendar,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Clock,
  Globe,
} from "lucide-react";
import { AssignJobForm } from "./assign-job-form";
import { AddEventJobs } from "./add-event-jobs";
import { GameJobEditForm } from "./game-job-edit-form";

interface Assignment {
  id: string;
  userId: string | null;
  name: string | null;
  email: string | null;
  user: { id: string; name: string; email: string } | null;
}

interface GameJobWithDetails {
  id: string;
  slotsNeeded: number;
  isPublic: boolean;
  overrideName: string | null;
  overrideDescription: string | null;
  overrideHoursPerGame: number | null;
  jobTemplate: {
    id: string;
    name: string;
    description: string | null;
    hoursPerGame: number;
  };
  assignments: Assignment[];
}

interface EventWithJobs {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  teamId: string;
  team: { id: string; name: string; color: string };
  taggedTeamIds?: string[];
  gameJobs: GameJobWithDetails[];
  seasonId?: string | null;
}

interface TeamOption {
  id: string;
  name: string;
  color: string;
}

interface SeasonOption {
  id: string;
  name: string;
}

interface OrgUser {
  id: string;
  name: string;
  email: string;
}

interface ActiveJobsSectionProps {
  events: EventWithJobs[];
  templates: JobTemplate[];
  teams: TeamOption[];
  seasons: SeasonOption[];
  orgUsers: OrgUser[];
  canManage: boolean;
}

export function ActiveJobsSection({
  events,
  templates,
  teams,
  seasons,
  orgUsers,
  canManage,
}: ActiveJobsSectionProps) {
  const [teamFilter, setTeamFilter] = useState("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const router = useRouter();

  const filteredEvents = events.filter((event) => {
    if (teamFilter !== "all") {
      const tagMatch = event.taggedTeamIds?.includes(teamFilter);
      if (event.teamId !== teamFilter && !tagMatch) return false;
    }
    if (seasonFilter !== "all" && event.seasonId !== seasonFilter) return false;
    return true;
  });

  async function removeAssignment(gameJobId: string, assignmentId: string) {
    setRemovingId(assignmentId);
    try {
      const res = await fetch(`/api/jobs/${gameJobId}/assignments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove assignment");
      }
      toast.success("Assignment removed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setRemovingId(null);
    }
  }

  async function removeJob(jobId: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove job");
      }
      toast.success("Job removed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v ?? "all")} items={{ all: "All Teams", ...Object.fromEntries(teams.map((t) => [t.id, t.name])) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id} label={team.name}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={seasonFilter} onValueChange={(v) => setSeasonFilter(v ?? "all")} items={{ all: "All Seasons", ...Object.fromEntries(seasons.map((s) => [s.id, s.name])) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Seasons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            {seasons.map((season) => (
              <SelectItem key={season.id} value={season.id} label={season.name}>
                {season.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/50" />
            <CardTitle className="mt-4">No upcoming events</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              {events.length === 0
                ? "There are no upcoming events with jobs to display."
                : "No events match the selected filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEvents.map((event) => {
            const totalJobs = event.gameJobs.length;
            const filledJobs = event.gameJobs.filter(
              (j) => j.assignments.length > 0
            ).length;
            const allFilled = totalJobs > 0 && filledJobs === totalJobs;

            return (
              <Card key={event.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">
                          {event.title}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: event.team.color,
                            color: event.team.color,
                          }}
                        >
                          {event.team.name}
                        </Badge>
                        {allFilled ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            All Filled
                          </Badge>
                        ) : totalJobs > 0 ? (
                          <Badge variant="secondary">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            {filledJobs}/{totalJobs} Filled
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDate(event.startTime)} &middot;{" "}
                        {formatTime(event.startTime)} &ndash;{" "}
                        {formatTime(event.endTime)}
                      </p>
                    </div>
                    {canManage && templates.length > 0 && (
                      <AddEventJobs
                        scheduleEventId={event.id}
                        templates={templates}
                        existingTemplateIds={event.gameJobs.map(
                          (j) => j.jobTemplate.id
                        )}
                      >
                        <Button variant="outline" size="sm">
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Add Job
                        </Button>
                      </AddEventJobs>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {event.gameJobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No jobs assigned to this event yet.
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      {event.gameJobs.map((job) => {
                        const displayName = job.overrideName || job.jobTemplate.name;
                        const effectiveHours = job.overrideHoursPerGame ?? job.jobTemplate.hoursPerGame;
                        const hasOverride = job.overrideName || job.overrideDescription || job.overrideHoursPerGame !== null;

                        return (
                          <div
                            key={job.id}
                            className="flex items-start justify-between gap-3 rounded-lg border p-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium">
                                  {displayName}
                                </span>
                                <Badge variant="secondary" className="rounded-lg text-[10px] gap-0.5 px-1.5 py-0">
                                  <Clock className="h-2.5 w-2.5" />
                                  {effectiveHours}h
                                </Badge>
                                {job.isPublic && (
                                  <Badge variant="outline" className="rounded-lg text-[10px] gap-0.5 px-1.5 py-0 text-emerald-500 border-emerald-500/30">
                                    <Globe className="h-2.5 w-2.5" />
                                    Public
                                  </Badge>
                                )}
                                {hasOverride && (
                                  <Badge variant="outline" className="rounded-lg text-[10px] px-1.5 py-0 text-amber-500 border-amber-500/30">
                                    Override
                                  </Badge>
                                )}
                              </div>
                              {job.assignments.length > 0 ? (
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {job.assignments.map((a) => (
                                    <Badge
                                      key={a.id}
                                      variant="secondary"
                                      className="gap-1 pr-1"
                                    >
                                      {a.user?.name || a.name || "Unknown"}
                                      {canManage && (
                                        <button
                                          type="button"
                                          className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors disabled:opacity-50"
                                          onClick={() =>
                                            removeAssignment(job.id, a.id)
                                          }
                                          disabled={removingId === a.id}
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Not yet assigned &middot; {job.slotsNeeded} slot{job.slotsNeeded !== 1 ? "s" : ""} needed
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {canManage && (
                                <>
                                  <GameJobEditForm
                                    job={{
                                      id: job.id,
                                      slotsNeeded: job.slotsNeeded,
                                      isPublic: job.isPublic,
                                      overrideName: job.overrideName,
                                      overrideDescription: job.overrideDescription,
                                      overrideHoursPerGame: job.overrideHoursPerGame,
                                      templateName: job.jobTemplate.name,
                                      templateDescription: job.jobTemplate.description,
                                      templateHoursPerGame: job.jobTemplate.hoursPerGame,
                                    }}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </GameJobEditForm>
                                  <AssignJobForm
                                    gameJobId={job.id}
                                    orgUsers={orgUsers}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                    >
                                      <UserPlus className="h-3.5 w-3.5" />
                                    </Button>
                                  </AssignJobForm>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => removeJob(job.id)}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Showing {filteredEvents.length} upcoming{" "}
        {filteredEvents.length === 1 ? "event" : "events"} &middot;{" "}
        {filteredEvents.reduce((sum, e) => sum + e.gameJobs.length, 0)} total{" "}
        jobs
      </p>
    </div>
  );
}
