"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Download,
  Users,
  ArrowUpDown,
  ChevronsUpDown,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface JobDetail {
  assignmentId: string;
  jobName: string;
  eventTitle: string;
  teamName: string;
  playerName: string | null;
  date: string;
  hours: number;
}

interface ReportEntry {
  name: string;
  email: string;
  totalHours: number;
  signupCount: number;
  eventCount: number;
  jobs: JobDetail[];
}

type SortField = "name" | "totalHours" | "signupCount" | "eventCount";

function PlayerAssignPick({
  currentPlayerName,
  disabled,
  players,
  onPick,
  onClear,
}: {
  currentPlayerName: string | null;
  disabled: boolean;
  players: { id: string; name: string; teamName: string; number: string | null }[];
  onPick: (playerId: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "h-8 inline-flex items-center gap-2 rounded-md border bg-background px-2 text-xs",
          disabled && "opacity-50 cursor-not-allowed",
          currentPlayerName ? "border-primary/40" : "border-border"
        )}
        title="Assign or change the player for these hours"
      >
        <span className="max-w-[220px] truncate">
          {currentPlayerName ? `Player: ${currentPlayerName}` : "Assign to player…"}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search player…" />
          <CommandList>
            <CommandEmpty>No players found.</CommandEmpty>
            {currentPlayerName && (
              <CommandGroup heading="Actions">
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onClear();
                    setOpen(false);
                  }}
                >
                  Clear assignment
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Players">
              {players.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.number ?? ""} ${p.teamName}`.toLowerCase()}
                  onSelect={() => {
                    onPick(p.id);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-sm">
                      {p.number ? `${p.name} (#${p.number})` : p.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{p.teamName}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function downloadCSV(data: ReportEntry[]) {
  const headers = [
    "Name",
    "Email",
    "Total Hours",
    "Signups",
    "Events",
    "Jobs Signed Up For",
  ];
  const rows = data.map((r) => [
    r.name,
    r.email,
    r.totalHours.toFixed(1),
    r.signupCount.toString(),
    r.eventCount.toString(),
    r.jobs.map((j) => `${j.jobName} (${j.eventTitle})`).join("; "),
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `volunteer-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function VolunteerReport() {
  const [report, setReport] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [players, setPlayers] = useState<
    { id: string; name: string; teamName: string; number: string | null }[]
  >([]);
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchReport();
    fetchPlayers();
  }, []);

  async function fetchReport() {
    try {
      const res = await fetch("/api/volunteers/reports");
      if (!res.ok) throw new Error("Failed to load report");
      const data = await res.json();
      setReport(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function fetchPlayers() {
    try {
      const res = await fetch("/api/volunteers/players");
      if (!res.ok) return;
      setPlayers(await res.json());
    } catch {
      // optional enhancement; ignore
    }
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  function toggleExpanded(email: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let data = [...report];

    if (filter) {
      const q = filter.toLowerCase();
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.jobs.some(
            (j) =>
              j.jobName.toLowerCase().includes(q) ||
              (j.playerName && j.playerName.toLowerCase().includes(q))
          )
      );
    }

    data.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "totalHours":
          cmp = a.totalHours - b.totalHours;
          break;
        case "signupCount":
          cmp = a.signupCount - b.signupCount;
          break;
        case "eventCount":
          cmp = a.eventCount - b.eventCount;
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return data;
  }, [report, filter, sortField, sortAsc]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading report...
      </div>
    );
  }

  function SortButton({ field, label }: { field: SortField; label: string }) {
    return (
      <button
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => toggleSort(field)}
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Filter by name, job, or player..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadCSV(filtered)}
          disabled={filtered.length === 0}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {report.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">No volunteer data</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Volunteer signups will appear here once people sign up for jobs.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>
                  <SortButton field="name" label="Name" />
                </TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">
                  <SortButton field="totalHours" label="Hours" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="signupCount" label="Signups" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="eventCount" label="Events" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <>
                  <TableRow
                    key={entry.email}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpanded(entry.email)}
                  >
                    <TableCell className="w-8 px-2">
                      {expanded.has(entry.email) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.email}</TableCell>
                    <TableCell className="text-right font-medium">
                      {entry.totalHours.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.signupCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.eventCount}
                    </TableCell>
                  </TableRow>
                  {expanded.has(entry.email) && (
                    <TableRow key={`${entry.email}-detail`}>
                      <TableCell colSpan={6} className="p-0">
                        <div className="bg-muted/30 px-6 py-3 space-y-1.5">
                          {entry.jobs.map((job, i) => (
                            <div
                              key={i}
                              className="flex flex-wrap items-center gap-2 text-sm"
                            >
                              <Badge variant="outline" className="text-xs">
                                {job.jobName}
                              </Badge>
                              <span className="text-muted-foreground">
                                {job.eventTitle}
                              </span>
                              {job.teamName && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {job.teamName}
                                </Badge>
                              )}
                              {job.playerName && (
                                <span className="text-xs text-primary font-medium">
                                  for {job.playerName}
                                </span>
                              )}
                              {players.length > 0 && (
                                <PlayerAssignPick
                                  currentPlayerName={job.playerName}
                                  disabled={assigning[`${entry.email}::${job.assignmentId}`]}
                                  players={players}
                                  onPick={async (playerId) => {
                                    const key = `${entry.email}::${job.assignmentId}`;
                                    setAssigning((p) => ({ ...p, [key]: true }));
                                    try {
                                      const res = await fetch("/api/job-assignments/assign-player", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ assignmentId: job.assignmentId, playerId }),
                                      });
                                      if (!res.ok) throw new Error("Failed");
                                      await fetchReport();
                                    } catch {
                                      toast.error("Failed to assign to player");
                                    } finally {
                                      setAssigning((p) => ({ ...p, [key]: false }));
                                    }
                                  }}
                                  onClear={async () => {
                                    const key = `${entry.email}::${job.assignmentId}`;
                                    setAssigning((p) => ({ ...p, [key]: true }));
                                    try {
                                      const res = await fetch("/api/job-assignments/assign-player", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ assignmentId: job.assignmentId, playerId: null }),
                                      });
                                      if (!res.ok) throw new Error("Failed");
                                      await fetchReport();
                                    } catch {
                                      toast.error("Failed to clear player");
                                    } finally {
                                      setAssigning((p) => ({ ...p, [key]: false }));
                                    }
                                  }}
                                />
                              )}
                              <span className="text-xs text-muted-foreground ml-auto">
                                {format(new Date(job.date), "MMM d, yyyy")} · {job.hours.toFixed(1)}h
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
