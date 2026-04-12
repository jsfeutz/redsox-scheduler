"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  Clock,
  MapPin,
  Search,
  Users,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { JobSlotRow } from "@/components/jobs/job-slot-row";
import type { JobVolunteer } from "@/components/jobs/job-slot-row";
import { AddJobDialog } from "@/components/jobs/add-job-dialog";
import type { AddJobEventOption, AddJobPlayerOption, AddJobTeamOption } from "@/components/jobs/add-job-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Signup {
  name: string;
  playerName: string | null;
}

interface UnfilledJob {
  id: string;
  jobName: string;
  jobScope: string;
  slotsNeeded: number;
  slotsFilled: number;
  isPublic: boolean;
  disabled: boolean;
  isOrgJob?: boolean;
  volunteers: JobVolunteer[];
  signups: Signup[];
  event: {
    id: string;
    title: string;
    type: string;
    startTime: string;
    endTime: string;
    teamId: string | null;
    teamName: string;
    teamColor: string;
    coachName: string | null;
    /** Additional teams linked to the event (filter / search). */
    taggedTeamNames?: string[];
    facility: string | null;
  };
}

interface Props {
  jobs: UnfilledJob[];
  teams?: AddJobTeamOption[];
  events?: AddJobEventOption[];
  players?: AddJobPlayerOption[];
  canManage?: boolean;
  isAdmin?: boolean;
  userTeamIds?: string[];
}

export function VolunteerView({
  jobs,
  teams = [],
  events = [],
  players = [],
  canManage = false,
  isAdmin = false,
  userTeamIds = [],
}: Props) {
  const [filter, setFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const teamNames = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      set.add(j.event.teamName);
      for (const n of j.event.taggedTeamNames ?? []) set.add(n);
    }
    return Array.from(set).sort();
  }, [jobs]);

  const filtered = useMemo(() => {
    let result = jobs;
    if (teamFilter !== "ALL") {
      result = result.filter(
        (j) =>
          j.event.teamName === teamFilter ||
          (j.event.taggedTeamNames?.includes(teamFilter) ?? false)
      );
    }
    if (filter) {
      const q = filter.toLowerCase();
      result = result.filter(
        (j) =>
          j.jobName.toLowerCase().includes(q) ||
          j.event.title.toLowerCase().includes(q) ||
          j.event.teamName.toLowerCase().includes(q) ||
          (j.event.taggedTeamNames?.some((n) => n.toLowerCase().includes(q)) ??
            false) ||
          (j.event.coachName && j.event.coachName.toLowerCase().includes(q))
      );
    }
    return result;
  }, [jobs, filter, teamFilter]);

  const totalOpenSlots = filtered.reduce((s, j) => s + (j.slotsNeeded - j.slotsFilled), 0);

  const uniqueTeamCount = useMemo(() => {
    const set = new Set(filtered.map((j) => j.event.teamId ?? "__club__"));
    return set.size;
  }, [filtered]);

  function canManageJob(j: UnfilledJob): boolean {
    if (!canManage) return false;
    if (isAdmin) return true;
    if (!j.event.teamId) return false;
    return userTeamIds.includes(j.event.teamId);
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center flex-1">
        <Users className="h-10 w-10 text-muted-foreground/40" />
        <h3 className="mt-3 text-base font-medium">All jobs are filled!</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          No upcoming events with unfilled volunteer positions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 md:block md:space-y-4">
      {canManage && (
        <div className="flex items-center justify-end shrink-0">
          <AddJobDialog teams={teams} events={events} players={players}>
            <Button className="rounded-xl" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Job
            </Button>
          </AddJobDialog>
        </div>
      )}
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 shrink-0 py-2 md:py-0">
        <Card className="rounded-xl">
          <CardContent className="p-3 md:pt-4 md:pb-3 md:px-4">
            <p className="text-xl md:text-2xl font-bold">{uniqueTeamCount}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Teams</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-3 md:pt-4 md:pb-3 md:px-4">
            <p className="text-xl md:text-2xl font-bold">{filtered.length}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Open Jobs</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-3 md:pt-4 md:pb-3 md:px-4">
            <p className="text-xl md:text-2xl font-bold text-orange-600">{totalOpenSlots}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Open Slots</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters - shared across tabs */}
      <div className="flex gap-2 shrink-0 pb-1 md:pb-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={teamFilter} onValueChange={(v) => { if (v) setTeamFilter(v); }}>
          <SelectTrigger className="w-[130px] md:w-[160px] h-9 text-xs md:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Teams</SelectItem>
            {teamNames.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* All Jobs */}
      <div className="flex-1 overflow-y-auto min-h-0 mt-2 md:mt-4 space-y-2">
        {filtered.map((j) => {
          const isExpanded = expandedId === j.id;
          const openCount = j.slotsNeeded - j.slotsFilled;
          const isOrg = !!j.isOrgJob;
          return (
            <Card key={j.id} className="rounded-xl overflow-hidden">
              <button
                type="button"
                className="w-full text-left p-3 md:p-4 active:bg-accent/30 md:hover:bg-accent/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : j.id)}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 mt-1.5"
                    style={{ backgroundColor: isOrg ? "#94a3b8" : j.event.teamColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold truncate">{j.jobName}</span>
                      {isOrg && (
                        <span className="text-[10px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground shrink-0">
                          Organization
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {isOrg
                        ? "Standalone job (not tied to an event)"
                        : `${j.event.title} · ${j.event.teamName}`}
                    </p>
                    {!isOrg && (
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(j.event.startTime), "MMM d, h:mm a")}
                        </span>
                        {j.event.facility && (
                          <span className="flex items-center gap-1 truncate hidden sm:flex">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {j.event.facility}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <AlertCircle className={cn("h-3.5 w-3.5", j.slotsFilled === 0 ? "text-red-500" : "text-orange-500")} />
                        <span className="text-sm font-bold">{j.slotsFilled}/{j.slotsNeeded}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{openCount} open</p>
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180"
                    )} />
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t bg-muted/20 px-3 md:px-4 py-2.5">
                  <JobSlotRow
                    job={{
                      id: j.id,
                      name: j.jobName,
                      slotsNeeded: j.slotsNeeded,
                      filled: j.slotsFilled,
                      isPublic: j.isPublic,
                      disabled: j.disabled,
                      scope: j.jobScope,
                      volunteers: j.volunteers,
                    }}
                    canManage={canManageJob(j)}
                  />
                </div>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (filter || teamFilter !== "ALL") && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No jobs match your filters.
          </p>
        )}
      </div>
    </div>
  );
}
