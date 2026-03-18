"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  Search,
  Users,
  Share2,
  Copy,
  Check,
  ChevronDown,
  Globe,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
    facility: string | null;
  };
}

interface TeamSummary {
  teamId: string | null;
  teamName: string;
  teamColor: string;
  coachName: string | null;
  openSlots: number;
  totalJobs: number;
  nextEvent: string;
  nextEventTitle: string;
}

interface Props {
  jobs: UnfilledJob[];
}

export function VolunteerView({ jobs }: Props) {
  const [filter, setFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("teams");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const teamSummaries = useMemo(() => {
    const map = new Map<string, TeamSummary>();
    for (const j of jobs) {
      const key = j.event.teamId ?? "__club__";
      const existing = map.get(key);
      if (existing) {
        existing.openSlots += j.slotsNeeded - j.slotsFilled;
        existing.totalJobs += 1;
        if (j.event.startTime < existing.nextEvent) {
          existing.nextEvent = j.event.startTime;
          existing.nextEventTitle = j.event.title;
        }
      } else {
        map.set(key, {
          teamId: j.event.teamId,
          teamName: j.event.teamName,
          teamColor: j.event.teamColor,
          coachName: j.event.coachName,
          openSlots: j.slotsNeeded - j.slotsFilled,
          totalJobs: 1,
          nextEvent: j.event.startTime,
          nextEventTitle: j.event.title,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.openSlots - a.openSlots);
  }, [jobs]);

  const teamNames = useMemo(() => {
    const set = new Set(jobs.map((j) => j.event.teamName));
    return Array.from(set).sort();
  }, [jobs]);

  const filtered = useMemo(() => {
    let result = jobs;
    if (teamFilter !== "ALL") {
      result = result.filter((j) => j.event.teamName === teamFilter);
    }
    if (filter) {
      const q = filter.toLowerCase();
      result = result.filter(
        (j) =>
          j.jobName.toLowerCase().includes(q) ||
          j.event.title.toLowerCase().includes(q) ||
          j.event.teamName.toLowerCase().includes(q) ||
          (j.event.coachName && j.event.coachName.toLowerCase().includes(q))
      );
    }
    return result;
  }, [jobs, filter, teamFilter]);

  const totalOpenSlots = filtered.reduce((s, j) => s + (j.slotsNeeded - j.slotsFilled), 0);

  const filteredTeamSummaries = useMemo(() => {
    const map = new Map<string, TeamSummary>();
    for (const j of filtered) {
      const key = j.event.teamId ?? "__club__";
      const existing = map.get(key);
      if (existing) {
        existing.openSlots += j.slotsNeeded - j.slotsFilled;
        existing.totalJobs += 1;
        if (j.event.startTime < existing.nextEvent) {
          existing.nextEvent = j.event.startTime;
          existing.nextEventTitle = j.event.title;
        }
      } else {
        map.set(key, {
          teamId: j.event.teamId,
          teamName: j.event.teamName,
          teamColor: j.event.teamColor,
          coachName: j.event.coachName,
          openSlots: j.slotsNeeded - j.slotsFilled,
          totalJobs: 1,
          nextEvent: j.event.startTime,
          nextEventTitle: j.event.title,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.openSlots - a.openSlots);
  }, [filtered]);

  function copyShareLink(job: UnfilledJob) {
    const url = `${window.location.origin}/help-wanted?job=${job.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(job.id);
      toast.success("Public signup link copied!");
      setTimeout(() => setCopiedId(null), 2000);
    });
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
      {/* Summary stats - compact on mobile */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 shrink-0 py-2 md:py-0">
        <Card className="rounded-xl">
          <CardContent className="p-3 md:pt-4 md:pb-3 md:px-4">
            <p className="text-xl md:text-2xl font-bold">{filteredTeamSummaries.length}</p>
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

      {/* Tab bar */}
      <div className="grid grid-cols-2 h-9 md:h-10 shrink-0 rounded-xl bg-muted p-[3px] gap-0.5">
        <button
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg text-xs md:text-sm font-medium transition-all",
            activeTab === "teams"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => { setActiveTab("teams"); setTeamFilter("ALL"); setFilter(""); }}
        >
          <Users className="h-3.5 w-3.5" />
          Teams Need Help
        </button>
        <button
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg text-xs md:text-sm font-medium transition-all",
            activeTab === "jobs"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("jobs")}
        >
          <AlertCircle className="h-3.5 w-3.5" />
          Unfilled Jobs
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0 mt-2 md:mt-4">
        {/* Teams Need Help */}
        {activeTab === "teams" && (
          <div className="space-y-2 md:space-y-3">
            {filteredTeamSummaries.map((team) => (
              <Card
                key={team.teamId ?? "__club__"}
                className="rounded-xl overflow-hidden cursor-pointer active:bg-accent/30 md:hover:bg-accent/30 transition-colors"
                onClick={() => { setTeamFilter(team.teamName); setActiveTab("jobs"); setFilter(""); }}
              >
                <div className="h-1" style={{ backgroundColor: team.teamColor }} />
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                      style={{ backgroundColor: team.teamColor }}
                    >
                      {team.teamName.split(/\s|-/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold truncate">{team.teamName}</h3>
                        {team.coachName && (
                          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                            {team.coachName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] md:text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Next: {format(new Date(team.nextEvent), "MMM d")}
                        </span>
                        <span>{team.totalJobs} unfilled job{team.totalJobs !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg md:text-xl font-bold text-orange-600">{team.openSlots}</p>
                      <p className="text-[10px] text-muted-foreground">open</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Unfilled Jobs */}
        {activeTab === "jobs" && (
          <div className="space-y-2">
            {filtered.map((j) => {
              const isExpanded = expandedId === j.id;
              const openCount = j.slotsNeeded - j.slotsFilled;
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
                        style={{ backgroundColor: j.event.teamColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold truncate">{j.jobName}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {j.event.title} · {j.event.teamName}
                        </p>
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
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            {j.slotsFilled === 0 ? (
                              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                            )}
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
                    <div className="border-t bg-muted/20 px-3 md:px-4 py-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Signups ({j.slotsFilled} of {j.slotsNeeded})
                        </p>
                        {j.isPublic && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={(e) => { e.stopPropagation(); copyShareLink(j); }}
                          >
                            {copiedId === j.id ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            Copy Link
                          </Button>
                        )}
                      </div>
                      {j.signups.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {j.signups.map((s, i) => (
                            <Badge key={i} variant="secondary" className="text-xs font-normal">
                              {s.name}
                              {s.playerName && (
                                <span className="text-muted-foreground ml-1">for {s.playerName}</span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No signups yet.</p>
                      )}
                      {!j.isPublic && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Not public — no share link available.
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}

            {filtered.length === 0 && (filter || teamFilter !== "ALL") && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No unfilled jobs match your filters.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
