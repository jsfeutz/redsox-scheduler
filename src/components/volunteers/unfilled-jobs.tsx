"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertCircle,
  Calendar,
  MapPin,
  Search,
  Users,
  Filter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    teamName: string;
    teamColor: string;
    coachName: string | null;
    facility: string | null;
  };
}

interface Props {
  jobs: UnfilledJob[];
}

export function UnfilledJobs({ jobs }: Props) {
  const [filter, setFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [scopeFilter, setScopeFilter] = useState<"FACILITY" | "TEAM" | "ALL">("FACILITY");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const teams = useMemo(() => {
    const set = new Set(jobs.map((j) => j.event.teamName));
    return Array.from(set).sort();
  }, [jobs]);

  const filtered = useMemo(() => {
    let result = jobs;
    if (scopeFilter !== "ALL") {
      result = result.filter((j) => j.jobScope === scopeFilter);
    }
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
  }, [jobs, filter, teamFilter, scopeFilter]);

  const totalOpenSlots = filtered.reduce(
    (sum, j) => sum + (j.slotsNeeded - j.slotsFilled),
    0
  );

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
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">All jobs are filled!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            There are no upcoming events with unfilled volunteer positions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Unfilled Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold text-orange-600">{totalOpenSlots}</p>
            <p className="text-xs text-muted-foreground">Open Slots</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold">{teams.length}</p>
            <p className="text-xs text-muted-foreground">Teams Need Help</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by job, event, team, or coach..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={scopeFilter} onValueChange={(v) => { if (v) setScopeFilter(v as "FACILITY" | "TEAM" | "ALL"); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FACILITY">Facility Jobs</SelectItem>
            <SelectItem value="TEAM">Team Jobs</SelectItem>
            <SelectItem value="ALL">All Jobs</SelectItem>
          </SelectContent>
        </Select>
        <Select value={teamFilter} onValueChange={(v) => { if (v) setTeamFilter(v); }}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Job</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Coach</TableHead>
              <TableHead className="text-center">Filled / Needed</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((j) => {
              const isExpanded = expandedId === j.id;
              return (
                <>
                  <TableRow
                    key={j.id}
                    className={cn("cursor-pointer", isExpanded && "bg-muted/30")}
                    onClick={() => setExpandedId(isExpanded ? null : j.id)}
                  >
                    <TableCell className="px-2">
                      <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm">{j.jobName}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {j.jobScope}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{j.event.title}</p>
                        {j.event.facility && (
                          <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {j.event.facility}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {j.event.teamName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {j.event.coachName ? (
                        <span className="text-sm">{j.event.coachName}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {j.slotsFilled === 0 ? (
                          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                        )}
                        <span className="font-medium">
                          {j.slotsFilled} / {j.slotsNeeded}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {format(new Date(j.event.startTime), "MMM d, h:mm a")}
                      </div>
                    </TableCell>
                    <TableCell className="px-2">
                      {j.isPublic && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyShareLink(j);
                          }}
                          title="Copy public signup link"
                        >
                          {copiedId === j.id ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Share2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${j.id}-detail`}>
                      <TableCell colSpan={8} className="bg-muted/20 px-6 py-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Signups ({j.slotsFilled} of {j.slotsNeeded})
                            </p>
                            {j.isPublic && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1.5"
                                onClick={() => copyShareLink(j)}
                              >
                                {copiedId === j.id ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                                Copy Public Signup Link
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
                            <p className="text-xs text-muted-foreground">No one has signed up yet.</p>
                          )}
                          {!j.isPublic && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              This job is not public — no share link available.
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filtered.length === 0 && (filter || teamFilter !== "ALL" || scopeFilter !== "ALL") && (
        <p className="text-center text-sm text-muted-foreground py-6">
          No unfilled jobs match your filters.
        </p>
      )}
    </div>
  );
}
