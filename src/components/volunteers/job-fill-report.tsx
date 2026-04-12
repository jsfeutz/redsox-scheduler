"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";

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

type Row = {
  name: string;
  totalSlots: number;
  filledSlots: number;
  openSlots: number;
  fillRate: number;
};

type Payload = {
  overall: {
    totalSlots: number;
    filledSlots: number;
    openSlots: number;
    fillRate: number;
    mostUnfilled: Row | null;
  };
  rows: Row[];
};

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

function downloadCSV(rows: Row[]) {
  const headers = ["Job", "Total Slots", "Filled", "Open", "Fill Rate"];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        `"${r.name.replaceAll("\"", "\"\"")}"`,
        r.totalSlots,
        r.filledSlots,
        r.openSlots,
        (r.fillRate * 100).toFixed(1) + "%",
      ].join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "job-fill-rates.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function JobFillReport() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        const res = await fetch(`/api/volunteers/job-fill-rates?${params.toString()}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "Failed to load report");
        }
        setData(await res.json());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [startDate, endDate]);

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? [];
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [data, query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading job fill rates...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-sm text-muted-foreground py-10 text-center">
        No data available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Overall fill rate</p>
            <p className="text-2xl font-bold">{pct(data.overall.fillRate)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.overall.filledSlots}/{data.overall.totalSlots} filled
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open slots remaining</p>
            <p className="text-2xl font-bold text-orange-600">{data.overall.openSlots}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all jobs</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Most unfilled job</p>
            <p className="text-base font-semibold truncate">
              {data.overall.mostUnfilled?.name ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.overall.mostUnfilled ? `${data.overall.mostUnfilled.openSlots} open` : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-2 md:items-end md:justify-between">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">From</span>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">To</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="grid gap-1 flex-1">
            <span className="text-xs text-muted-foreground">Search</span>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jobs..." />
          </div>
        </div>
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => downloadCSV(filteredRows)}
          disabled={filteredRows.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="rounded-2xl border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Filled</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead className="text-right">Fill rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.totalSlots}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.filledSlots}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge variant={r.openSlots > 0 ? "secondary" : "default"} className="rounded-lg">
                      {r.openSlots}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{pct(r.fillRate)}</TableCell>
                </TableRow>
              ))}
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    No matching jobs.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

