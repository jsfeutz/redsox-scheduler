"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Download,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import { SCHEDULE_EVENT_AUDIT_RETENTION_DAYS } from "@/lib/schedule-event-audit-constants";

type AuditEntry = {
  id: string;
  createdAt: string;
  organizationId: string;
  scheduleEventId: string | null;
  recurrenceGroupId: string | null;
  action: string;
  actorUserId: string | null;
  actorLabel: string;
  summary: string | null;
  before: unknown;
  after: unknown;
  meta: unknown;
};

function defaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return format(d, "yyyy-MM-dd");
}

function entryMatchesQuery(row: AuditEntry, q: string): boolean {
  if (!q.trim()) return true;
  const needle = q.trim().toLowerCase();
  const hay = [
    row.action,
    row.summary,
    row.actorLabel,
    row.actorUserId,
    row.scheduleEventId,
    row.recurrenceGroupId,
    row.before != null ? JSON.stringify(row.before) : "",
    row.after != null ? JSON.stringify(row.after) : "",
    row.meta != null ? JSON.stringify(row.meta) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export function EventAuditReport() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ startDate, endDate, limit: "500" });
      const res = await fetch(`/api/reports/event-audit?${qs}`);
      if (!res.ok) {
        if (res.status === 403) throw new Error("You do not have access to this report.");
        throw new Error("Failed to load");
      }
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load audit log");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleRow(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function downloadCsv() {
    const qs = new URLSearchParams({
      startDate,
      endDate,
      limit: "2000",
      format: "csv",
    });
    window.open(`/api/reports/event-audit?${qs}`, "_blank");
  }

  const actionVariant = (a: string) => {
    if (a === "CREATE") return "default" as const;
    if (a === "UPDATE" || a === "TEAM_TRANSFER") return "secondary" as const;
    if (a === "REMOVE" || a === "SERIES_CANCEL" || a === "BUMP_PENDING")
      return "outline" as const;
    return "destructive" as const;
  };

  const filtered = entries.filter((row) => entryMatchesQuery(row, search));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">From</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[11rem]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">To</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[11rem]"
          />
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply range"}
        </Button>
        <Button variant="outline" onClick={downloadCsv}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search summary, actor, event ID, action, or JSON details…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Filter audit log"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-1 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span>
                Schedule changes (creates, edits, cancellations, deletes, slot transfers). Most
                recent first. Entries older than {SCHEDULE_EVENT_AUDIT_RETENTION_DAYS} days are
                removed automatically.
              </span>
            </div>
            <p className="text-xs pl-6">
              <Link
                href="/dashboard/reports?tab=event-audit"
                className="text-primary underline underline-offset-2 hover:text-primary/90"
              >
                Bookmark this link
              </Link>{" "}
              to open Event audit directly.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No audit entries in this range.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No entries match “{search.trim()}”. Try another search or widen the date range.
            </p>
          ) : (
            <div className="space-y-2">
              {search.trim() ? (
                <p className="text-xs text-muted-foreground">
                  Showing {filtered.length} of {entries.length} loaded in this date range.
                </p>
              ) : null}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Event ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const open = expanded.has(row.id);
                    const hasDetail =
                      row.before != null || row.after != null || row.meta != null;
                    return (
                      <Fragment key={row.id}>
                        <TableRow className="align-top">
                          <TableCell className="py-2">
                            {hasDetail ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toggleRow(row.id)}
                                aria-expanded={open}
                              >
                                {open ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            ) : null}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {format(new Date(row.createdAt), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={actionVariant(row.action)}>{row.action}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[280px] text-sm">
                            {row.summary ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {row.actorLabel}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[120px] truncate">
                            {row.scheduleEventId ?? "—"}
                          </TableCell>
                        </TableRow>
                        {open && hasDetail ? (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/40 p-3">
                              <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">
                                {JSON.stringify(
                                  { before: row.before, after: row.after, meta: row.meta },
                                  null,
                                  2
                                )}
                              </pre>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
