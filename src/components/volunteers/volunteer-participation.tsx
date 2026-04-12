"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  Download,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VolunteerInfo {
  name: string;
  email: string | null;
  hours: number;
}

interface ParticipationRow {
  playerId: string;
  playerName: string;
  playerNumber: string | null;
  teamId: string;
  teamName: string;
  teamColor: string;
  totalHours: number;
  requiredHours: number;
  status: "fulfilled" | "in_progress" | "not_started" | "contributed" | "none";
  volunteers: VolunteerInfo[];
}

const STATUS_CONFIG = {
  fulfilled: { label: "Completed", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
  not_started: { label: "Not Started", icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
  contributed: { label: "Contributing", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  none: { label: "No Hours Yet", icon: AlertCircle, color: "text-muted-foreground", bg: "bg-muted" },
};

export function VolunteerParticipation() {
  const [data, setData] = useState<ParticipationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/volunteers/participation");
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const teams = useMemo(
    () => [...new Set(data.map((d) => d.teamName))].sort(),
    [data]
  );

  const filtered = useMemo(() => {
    return data.filter((row) => {
      if (teamFilter !== "ALL" && row.teamName !== teamFilter) return false;
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
      if (filter) {
        const q = filter.toLowerCase();
        const matchesPlayer = row.playerName.toLowerCase().includes(q);
        const matchesVolunteer = row.volunteers.some(
          (v) => v.name.toLowerCase().includes(q) || v.email?.toLowerCase().includes(q)
        );
        if (!matchesPlayer && !matchesVolunteer) return false;
      }
      return true;
    });
  }, [data, filter, teamFilter, statusFilter]);

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aRemaining = Math.max(0, a.requiredHours - a.totalHours);
      const bRemaining = Math.max(0, b.requiredHours - b.totalHours);
      return bRemaining - aRemaining;
    });
  }, [filtered]);

  const summary = useMemo(() => {
    const total = data.length;
    const fulfilled = data.filter((d) => d.status === "fulfilled" || d.status === "contributed").length;
    const inProgress = data.filter((d) => d.status === "in_progress").length;
    const notStarted = data.filter((d) => d.status === "not_started" || d.status === "none").length;
    return { total, fulfilled, inProgress, notStarted };
  }, [data]);

  function exportCsv() {
    const header = "Player,Number,Team,Total Hours,Required Hours,Status,Volunteers\n";
    const rows = sortedFiltered.map((r) => {
      const vols = r.volunteers.map((v) => `${v.name} (${v.hours}h)`).join("; ");
      return `"${r.playerName}","${r.playerNumber || ""}","${r.teamName}",${r.totalHours},${r.requiredHours},"${STATUS_CONFIG[r.status].label}","${vols}"`;
    });
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "volunteer-participation.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="rounded-2xl border-border/50">
        <CardContent className="flex flex-col items-center py-16">
          <AlertCircle className="h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No players on any roster yet. Add players to team rosters to track participation.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasRequirement = data.some((d) => d.requiredHours > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold">{summary.total}</p>
            <p className="text-xs text-muted-foreground">Total Families</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold text-emerald-600">{summary.fulfilled}</p>
            <p className="text-xs text-muted-foreground">{hasRequirement ? "Fulfilled" : "Contributed"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold text-amber-600">{summary.inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold text-red-500">{summary.notStarted}</p>
            <p className="text-xs text-muted-foreground">Not Started</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by player or volunteer..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={teamFilter} onValueChange={(v) => { if (v) setTeamFilter(v); }}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {hasRequirement ? (
              <>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="contributed">Contributed</SelectItem>
                <SelectItem value="none">No Hours</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCsv} className="rounded-xl">
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Player</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Volunteers</TableHead>
              <TableHead className="text-center">Hours</TableHead>
              {hasRequirement && <TableHead className="text-center">Progress</TableHead>}
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFiltered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hasRequirement ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  No families match your filters.
                </TableCell>
              </TableRow>
            ) : (
              sortedFiltered.map((row) => {
                const isExpanded = expandedId === row.playerId;
                const baseCfg = STATUS_CONFIG[row.status];
                const ratio =
                  row.requiredHours > 0 ? row.totalHours / row.requiredHours : 0;
                const cfg =
                  row.status === "in_progress" && row.requiredHours > 0
                    ? ratio >= 0.5
                      ? { ...baseCfg, label: "On Track", color: "text-blue-600", bg: "bg-blue-500/10" }
                      : { ...baseCfg, label: "Needs Attention", color: "text-amber-600", bg: "bg-amber-500/10" }
                    : baseCfg;
                const StatusIcon = cfg.icon;
                return (
                  <>
                    <TableRow
                      key={row.playerId}
                      className={cn("cursor-pointer", isExpanded && "bg-muted/30")}
                      onClick={() => setExpandedId(isExpanded ? null : row.playerId)}
                    >
                      <TableCell className="px-2">
                        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{row.playerName}</span>
                          {row.playerNumber && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              #{row.playerNumber}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{ borderLeft: `3px solid ${row.teamColor}` }}
                        >
                          {row.teamName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {row.volunteers.length}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-sm">
                          {row.totalHours}
                          {hasRequirement && <span className="text-muted-foreground"> / {row.requiredHours}</span>}
                        </span>
                      </TableCell>
                      {hasRequirement && (
                        <TableCell>
                          <div className="w-20 mx-auto h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                row.totalHours >= row.requiredHours
                                  ? "bg-emerald-500"
                                  : row.totalHours > 0
                                    ? "bg-amber-500"
                                    : "bg-red-400"
                              )}
                              style={{ width: `${Math.min((row.totalHours / row.requiredHours) * 100, 100)}%` }}
                            />
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("text-[10px] gap-1", cfg.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${row.playerId}-detail`} className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={hasRequirement ? 7 : 6} className="px-6 py-3">
                          {row.volunteers.length > 0 ? (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Volunteers
                              </p>
                              {row.volunteers.map((v, i) => (
                                <div key={i} className="flex items-center justify-between text-sm rounded-lg bg-background/60 px-3 py-1.5">
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium">{v.name}</span>
                                    {v.email && (
                                      <span className="text-xs text-muted-foreground">{v.email}</span>
                                    )}
                                  </div>
                                  <span className={cn(
                                    "text-xs font-semibold",
                                    v.hours > 0 ? "text-emerald-600" : "text-muted-foreground"
                                  )}>
                                    {v.hours} hrs
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No volunteers linked to this player.</p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
