"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Users, Calendar, MapPin, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Assignment {
  id: string;
  name: string;
  email: string;
  playerName: string | null;
  hoursEarned: number;
  createdAt: string;
  jobName: string;
  jobScope: string;
  event: {
    id: string;
    title: string;
    type: string;
    startTime: string;
    endTime: string;
    teamName: string;
    teamColor: string;
    facility: string | null;
  } | null;
}

interface Props {
  assignments: Assignment[];
  canManage: boolean;
}

export function VolunteerSignups({ assignments }: Props) {
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter) return assignments;
    const q = filter.toLowerCase();
    return assignments.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.playerName && a.playerName.toLowerCase().includes(q)) ||
        a.jobName.toLowerCase().includes(q) ||
        (a.event?.teamName && a.event.teamName.toLowerCase().includes(q))
    );
  }, [assignments, filter]);

  const upcomingCount = assignments.filter(
    (a) => a.event && new Date(a.event.startTime) >= new Date()
  ).length;

  const uniqueVolunteers = new Set(
    assignments.map((a) => a.email.toLowerCase())
  ).size;

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No signups yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Volunteer signups will appear here once people sign up for jobs.
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
            <p className="text-2xl font-bold">{assignments.length}</p>
            <p className="text-xs text-muted-foreground">Total Signups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold">{uniqueVolunteers}</p>
            <p className="text-xs text-muted-foreground">Unique Volunteers</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold">{upcomingCount}</p>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, player, job, or team..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Volunteer</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Event</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead>Signed Up</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{a.name}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {a.playerName ? (
                    <span className="text-sm">{a.playerName}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{a.jobName}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {a.jobScope}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {a.event ? (
                    <div className="text-sm">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {a.event.teamName}
                        </Badge>
                        <span className="font-medium">{a.event.title}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(a.event.startTime), "MMM d, h:mm a")}
                        </span>
                        {a.event.facility && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {a.event.facility}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Team-level
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {a.hoursEarned.toFixed(1)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(a.createdAt), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filtered.length === 0 && filter && (
        <p className="text-center text-sm text-muted-foreground py-6">
          No signups match &quot;{filter}&quot;
        </p>
      )}
    </div>
  );
}
