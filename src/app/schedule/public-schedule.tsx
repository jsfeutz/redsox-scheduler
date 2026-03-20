"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  parseISO,
  isPast,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarDays,
  List,
  MapPin,
  Clock,
  Users,
  Loader2,
  Hand,
  ExternalLink,
  X,
  Search,
} from "lucide-react";
import Link from "next/link";
import { googleCalendarUrl } from "@/lib/calendar";
import { PublicJobSignup } from "@/components/jobs/public-job-signup";
import { CalendarSubscribeButton } from "@/components/schedules/calendar-subscribe-button";
import { PublicFooter } from "@/components/public-footer";

interface Team {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  headCoach?: { name: string } | null;
}

interface SubFacility {
  id: string;
  name: string;
}

interface Facility {
  id: string;
  name: string;
  subFacilities: SubFacility[];
}

interface Volunteer {
  name: string;
  playerName: string | null;
}

interface Job {
  id: string;
  name: string;
  slotsNeeded: number;
  filled: number;
  askComfortLevel?: boolean;
  volunteers: Volunteer[];
}

interface PublicEvent {
  id: string;
  title: string;
  type: string;
  gameVenue?: string | null;
  startTime: string;
  endTime: string;
  team: Team & { headCoach?: { name: string } | null };
  facility: string | null;
  facilityId: string | null;
  facilityUrl?: string | null;
  openJobs: number;
  jobs: Job[];
}

interface Props {
  teams: Team[];
  facilities: Facility[];
}

const EVENT_TYPES = [
  { value: "ALL", label: "All Types" },
  { value: "GAME", label: "Games" },
  { value: "PRACTICE", label: "Practices" },
  { value: "OTHER", label: "Other" },
  { value: "CLUB_EVENT", label: "Club Events" },
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function publicEventTypeLabel(event: PublicEvent) {
  if (event.type === "GAME")
    return event.gameVenue === "AWAY" ? "Away Game" : "Home Game";
  if (event.type === "PRACTICE") return "Practice";
  if (event.type === "CLUB_EVENT") return "Club Event";
  return "Other";
}

function publicEventSearchHaystack(event: PublicEvent): string {
  return [
    event.title,
    event.team.name,
    event.team.headCoach?.name ?? "",
    publicEventTypeLabel(event),
    event.facility ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function PublicSchedule({ teams, facilities }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "agenda">("month");
  const [filterTeamId, setFilterTeamId] = useState("");
  const [filterType, setFilterType] = useState("");
  /** Default on so guests see full schedule; turn off to hide away games only. */
  const [showAway, setShowAway] = useState(true);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);
  const [agendaSearch, setAgendaSearch] = useState("");

  const getDateRange = useCallback((): {
    start: Date | null;
    end: Date | null;
  } => {
    if (viewMode === "agenda") {
      return { start: null, end: null };
    }
    if (viewMode === "month") {
      const ms = startOfMonth(currentDate);
      return { start: startOfWeek(ms), end: endOfWeek(endOfMonth(currentDate)) };
    }
    return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
  }, [currentDate, viewMode]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const params = new URLSearchParams();
      if (start && end) {
        params.set("startDate", start.toISOString());
        params.set("endDate", end.toISOString());
      }
      if (filterTeamId) params.set("teamId", filterTeamId);
      if (filterType) params.set("type", filterType);
      params.set("showAway", showAway ? "true" : "false");

      const res = await fetch(`/api/schedule/public?${params}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as PublicEvent[];
        setEvents(Array.isArray(data) ? data : []);
      } else {
        console.error(
          "[PublicSchedule] /api/schedule/public failed",
          res.status,
          await res.text()
        );
        setEvents([]);
      }
    } finally {
      setLoading(false);
    }
  }, [getDateRange, filterTeamId, filterType, showAway]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  function navigatePrev() {
    if (viewMode === "agenda") return;
    setCurrentDate((p) => {
      if (viewMode === "month") return subMonths(p, 1);
      if (viewMode === "week") return subWeeks(p, 1);
      return p;
    });
  }
  function navigateNext() {
    if (viewMode === "agenda") return;
    setCurrentDate((p) => {
      if (viewMode === "month") return addMonths(p, 1);
      if (viewMode === "week") return addWeeks(p, 1);
      return p;
    });
  }

  const headerLabel = useMemo(() => {
    if (viewMode === "month") return format(currentDate, "MMMM yyyy");
    if (viewMode === "week") return `${format(startOfWeek(currentDate), "MMM d")} – ${format(endOfWeek(currentDate), "MMM d, yyyy")}`;
    return "Agenda";
  }, [viewMode, currentDate]);

  const { start: rangeStart, end: rangeEnd } = getDateRange();
  const days =
    (viewMode === "month" || viewMode === "week") && rangeStart && rangeEnd
      ? eachDayOfInterval({ start: rangeStart, end: rangeEnd })
      : [];

  const agendaDays = (() => {
    if (viewMode !== "agenda") return [];
    if (events.length === 0) return [];
    const sorted = [...events].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    const first = startOfDay(parseISO(sorted[0].startTime));
    const last = startOfDay(parseISO(sorted[sorted.length - 1].startTime));
    return eachDayOfInterval({ start: first, end: last });
  })();

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(parseISO(e.startTime), day));

  const agendaSearchWords = useMemo(
    () => agendaSearch.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [agendaSearch]
  );

  const publicEventMatchesAgendaSearch = useMemo(() => {
    return (event: PublicEvent) => {
      if (agendaSearchWords.length === 0) return true;
      const haystack = publicEventSearchHaystack(event);
      return agendaSearchWords.every((w) => haystack.includes(w));
    };
  }, [agendaSearchWords]);

  const agendaEventsForDay = (day: Date) =>
    getEventsForDay(day).filter(publicEventMatchesAgendaSearch);

  const agendaHasVisibleContent =
    viewMode === "agenda" &&
    agendaDays.some((d) => agendaEventsForDay(d).length > 0);

  const icalUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filterTeamId) params.set("teamId", filterTeamId);
    if (filterType) params.set("type", filterType);
    return `/api/schedule/public/ical?${params}`;
  }, [filterTeamId, filterType]);

  return (
    <div className="min-h-dvh bg-background">
      <div className="bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-12">
          {/* Header */}
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white font-black text-[10px] sm:text-xs shadow-lg shadow-primary/25">
                  RR
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Schedule
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Rubicon Redsox Baseball Club
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/help-wanted"
                className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent/50 transition-colors"
              >
                <Hand className="h-4 w-4" />
                Volunteer Signup
              </Link>
              <CalendarSubscribeButton
                icalPath={icalUrl}
                triggerClassName="rounded-xl h-auto py-2.5 px-4 border-border/50 bg-card"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {viewMode !== "agenda" && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={navigatePrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={navigateNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <h2 className="text-base sm:text-lg font-semibold min-w-0 truncate">
              {headerLabel}
            </h2>

            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <Select
                value={filterTeamId || "__all__"}
                onValueChange={(v) =>
                  setFilterTeamId(!v || v === "__all__" ? "" : v)
                }
                items={{
                  __all__: "All Teams",
                  ...Object.fromEntries(teams.map((t) => [t.id, t.headCoach ? `${t.name} - ${t.headCoach.name}` : t.name])),
                }}
              >
                <SelectTrigger className="w-[140px] sm:w-[200px]">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Teams</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full mr-1.5"
                        style={{ backgroundColor: t.color }}
                      />
                      {t.name}
                      {t.headCoach && <span className="text-muted-foreground"> - {t.headCoach.name}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterType || "ALL"}
                onValueChange={(v) =>
                  setFilterType(!v || v === "ALL" ? "" : v)
                }
                items={Object.fromEntries(
                  EVENT_TYPES.map((t) => [t.value, t.label])
                )}
              >
                <SelectTrigger className="w-[120px] sm:w-[140px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="show-away"
                  checked={showAway}
                  onCheckedChange={(checked) => setShowAway(!!checked)}
                />
                <Label htmlFor="show-away" className="text-xs font-normal text-muted-foreground whitespace-nowrap cursor-pointer">
                  Away Games
                </Label>
              </div>

              <Tabs
                value={viewMode}
                onValueChange={(v) => {
                  if (v) setViewMode(v as "month" | "week" | "agenda");
                }}
              >
                <TabsList>
                  <TabsTrigger value="month">
                    <CalendarIcon className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Month</span>
                  </TabsTrigger>
                  <TabsTrigger value="week">
                    <CalendarDays className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Week</span>
                  </TabsTrigger>
                  <TabsTrigger value="agenda">
                    <List className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Agenda</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Month / Week grid */}
          {(viewMode === "month" || viewMode === "week") && (
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="grid grid-cols-7 border-b bg-muted/50">
                {WEEK_DAYS.map((d) => (
                  <div
                    key={d}
                    className="px-2 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day, i) => {
                  const dayEvents = getEventsForDay(day);
                  const inMonth = isSameMonth(day, currentDate);
                  const today = isToday(day);
                  const maxVisible = viewMode === "month" ? 3 : 8;
                  const visible = dayEvents.slice(0, maxVisible);
                  const overflow = dayEvents.length - maxVisible;

                  return (
                    <div
                      key={i}
                      className={cn(
                        "relative border-b border-r p-1.5",
                        viewMode === "month" ? "min-h-[100px]" : "min-h-[200px]",
                        !inMonth && "bg-muted/20",
                        today && "bg-primary/5 ring-1 ring-inset ring-primary/20"
                      )}
                    >
                      <div className="flex items-center justify-between px-0.5 mb-1">
                        <span
                          className={cn(
                            "text-xs",
                            !inMonth && "text-muted-foreground/40",
                            inMonth && "text-muted-foreground",
                            today &&
                              "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {visible.map((event) => {
                          const typeLabel =
                            event.type === "GAME"
                              ? (event.gameVenue === "AWAY" ? "Away Game" : "Home Game")
                              : event.type === "PRACTICE"
                                ? "Practice"
                                : event.type === "CLUB_EVENT"
                                  ? "Club Event"
                                  : "Other";
                          return (
                            <button
                              key={event.id}
                              className="group/pill w-full truncate rounded-md px-1.5 py-[3px] text-left text-[11px] font-medium leading-tight text-white transition-all hover:opacity-90 hover:shadow-sm"
                              style={{ backgroundColor: event.team.color }}
                              onClick={() => setSelectedEvent(event)}
                              title={`${format(parseISO(event.startTime), "h:mm a")} – ${event.team.name} - ${typeLabel}`}
                            >
                              <span className="opacity-75">
                                {format(parseISO(event.startTime), "h:mma").toLowerCase()}
                              </span>{" "}
                              {event.team.name}
                              {event.team.headCoach && (
                                <span className="opacity-70">
                                  {" "}
                                  - {event.team.headCoach.name}
                                </span>
                              )}
                              {" - "}
                              {typeLabel}
                              {event.openJobs > 0 && (
                                <span className="ml-1 opacity-80">
                                  ({event.openJobs} needed)
                                </span>
                              )}
                            </button>
                          );
                        })}
                        {overflow > 0 && (
                          <p className="px-1 text-[10px] text-muted-foreground font-medium">
                            +{overflow} more
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agenda view */}
          {viewMode === "agenda" && (
            <div className="space-y-2">
              <div className="relative w-full">
                <Search
                  className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  aria-hidden
                />
                <Input
                  value={agendaSearch}
                  onChange={(e) => setAgendaSearch(e.target.value)}
                  placeholder="Search agenda (title, team, location, type…)"
                  className="h-9 pl-9 text-sm"
                  aria-label="Search agenda events"
                />
              </div>
            <div className="rounded-lg border bg-card overflow-hidden divide-y">
              {agendaDays.map((day) => {
                const dayEvts = agendaEventsForDay(day);
                if (dayEvts.length === 0) return null;
                const today = isToday(day);
                return (
                  <div key={day.toISOString()}>
                    <div className={cn(
                      "px-4 py-2 bg-muted/50 flex items-center gap-2",
                      today && "bg-primary/10"
                    )}>
                      <span className={cn(
                        "text-sm font-semibold",
                        today && "text-primary"
                      )}>
                        {format(day, "EEEE, MMM d")}
                      </span>
                      {today && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Today</Badge>
                      )}
                    </div>
                    <div className="divide-y divide-border/50">
                      {dayEvts.map((event) => {
                        const start = parseISO(event.startTime);
                        const end = parseISO(event.endTime);
                        const typeLabel = event.type === "GAME" ? (event.gameVenue === "AWAY" ? "Away Game" : "Home Game") : event.type === "PRACTICE" ? "Practice" : event.type === "CLUB_EVENT" ? "Club Event" : "Other";
                        return (
                          <button
                            key={event.id}
                            className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-accent/30 transition-colors"
                            onClick={() => setSelectedEvent(event)}
                          >
                            <span className="text-xs text-muted-foreground w-[100px] shrink-0">
                              {format(start, "h:mm a")} – {format(end, "h:mm a")}
                            </span>
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: event.team.color }}
                            />
                            <span className="text-sm font-medium truncate flex-1">
                              {event.title}
                            </span>
                            <span className="text-xs text-muted-foreground truncate hidden sm:block max-w-[150px]">
                              {event.team.name}
                            </span>
                            {event.facility && (
                              <span className="text-xs text-muted-foreground truncate hidden md:flex items-center gap-1 max-w-[180px]">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {event.facility}
                              </span>
                            )}
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {typeLabel}
                            </Badge>
                            {event.openJobs > 0 && (
                              <Badge className="bg-red-600 text-white text-[10px] shrink-0">
                                <Users className="h-3 w-3 mr-0.5" />
                                {event.openJobs}
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {!loading && !agendaHasVisibleContent && (
                <div className="py-12 text-center text-muted-foreground text-sm px-4">
                  {agendaSearchWords.length > 0
                    ? "No events match your search."
                    : "No events found for the current filters."}
                </div>
              )}
            </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading schedule...</span>
            </div>
          )}

          {!loading && events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 text-lg font-medium">No events</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                No events found for the selected filters and date range.
              </p>
            </div>
          )}

          {/* Event detail modal */}
          {selectedEvent && (
            <EventDetailModal
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
            />
          )}

          {/* Footer */}
          <div className="mt-10 flex items-center justify-center gap-4 text-sm">
            <Link
              href="/"
              className="text-primary hover:underline font-medium"
            >
              Home
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/help-wanted"
              className="text-primary hover:underline font-medium"
            >
              Volunteer Signup
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/my-signups"
              className="text-primary hover:underline font-medium"
            >
              My Signups
            </Link>
          </div>
          <PublicFooter />
        </div>
      </div>
    </div>
  );
}

function EventCard({
  event,
  onClick,
}: {
  event: PublicEvent;
  onClick: () => void;
}) {
  const typeLabel =
    event.type === "GAME"
      ? (event.gameVenue === "AWAY" ? "Away Game" : "Home Game")
      : event.type === "PRACTICE"
        ? "Practice"
        : event.type === "CLUB_EVENT"
          ? "Club Event"
          : "Other";
  const past = isPast(parseISO(event.endTime));

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow overflow-hidden",
        past && "opacity-60"
      )}
      onClick={onClick}
    >
      <div className="h-1" style={{ backgroundColor: event.team.color }} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{event.title}</span>
              <Badge
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: event.team.color,
                  color: event.team.color,
                }}
              >
                {event.team.icon && <span className="mr-1">{event.team.icon}</span>}
                {event.team.name}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {typeLabel}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {format(parseISO(event.startTime), "h:mm a")} –{" "}
                {format(parseISO(event.endTime), "h:mm a")}
              </span>
              {event.facility && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.facility}
                </span>
              )}
            </div>
          </div>
          {event.openJobs > 0 && (
            <Badge className="bg-red-600 text-white shrink-0">
              <Users className="h-3 w-3 mr-1" />
              {event.openJobs} needed
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EventDetailModal({
  event,
  onClose,
}: {
  event: PublicEvent;
  onClose: () => void;
}) {
  const [signedUpJobs, setSignedUpJobs] = useState<Set<string>>(new Set());

  const typeLabel =
    event.type === "GAME"
      ? (event.gameVenue === "AWAY" ? "Away Game" : "Home Game")
      : event.type === "PRACTICE"
        ? "Practice"
        : event.type === "CLUB_EVENT"
          ? "Club Event"
          : "Other";

  const gcalUrl = googleCalendarUrl({
    title: `${event.team.name} – ${event.title} (${typeLabel})`,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.facility || "",
    description: `${event.team.name} ${typeLabel.toLowerCase()}`,
  });

  const openJobs = event.jobs.filter(
    (j) => j.slotsNeeded - j.filled > 0 && !signedUpJobs.has(j.id)
  );

  function handleJobSignupSuccess(jobId: string) {
    setSignedUpJobs((prev) => new Set(prev).add(jobId));
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      <div className="fixed inset-x-4 top-[10%] bottom-[10%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg sm:top-[10%] sm:bottom-auto sm:max-h-[80vh] z-50 animate-in fade-in slide-in-from-bottom-4 duration-200 overflow-y-auto">
        <Card className="rounded-2xl shadow-2xl border-border/50 overflow-hidden">
          <div
            className="h-2"
            style={{ backgroundColor: event.team.color }}
          />
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold">{event.title}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: event.team.color,
                      color: event.team.color,
                    }}
                  >
                    {event.team.icon && (
                      <span className="mr-1">{event.team.icon}</span>
                    )}
                    {event.team.name}
                  </Badge>
                  <Badge variant="secondary">{typeLabel}</Badge>
                  {event.team.headCoach && (
                    <span className="text-xs text-muted-foreground">
                      Coach: {event.team.headCoach.name}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(parseISO(event.startTime), "EEEE, MMMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(parseISO(event.startTime), "h:mm a")} –{" "}
                  {format(parseISO(event.endTime), "h:mm a")}
                </span>
              </div>
              {event.facility && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{event.facility}</span>
                </div>
              )}
            </div>

            {/* Volunteer jobs with inline signup */}
            {event.jobs.length > 0 && (
              <div className="border-t pt-4 mb-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  Volunteer Jobs
                </h3>
                <div className="space-y-3">
                  {event.jobs.map((job) => {
                    const open = job.slotsNeeded - job.filled;
                    const alreadySignedUp = signedUpJobs.has(job.id);
                    return (
                      <div
                        key={job.id}
                        className="rounded-xl border bg-muted/30 p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">
                            {job.name}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-medium",
                              open > 0 && !alreadySignedUp
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                            )}
                          >
                            {alreadySignedUp
                              ? "Signed up!"
                              : open > 0
                                ? `${open} of ${job.slotsNeeded} needed`
                                : "Filled"}
                          </span>
                        </div>
                        {job.volunteers.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {job.volunteers.map((v, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="text-xs font-normal"
                              >
                                {v.name}
                                {v.playerName && (
                                  <span className="text-muted-foreground ml-1">
                                    for {v.playerName}
                                  </span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {open > 0 && !alreadySignedUp && (
                          <PublicJobSignup
                            jobId={job.id}
                            jobName={job.name}
                            eventTitle={event.title}
                            eventDate={format(parseISO(event.startTime), "EEE, MMM d")}
                            eventTime={`${format(parseISO(event.startTime), "h:mm a")} – ${format(parseISO(event.endTime), "h:mm a")}`}
                            askComfortLevel={job.askComfortLevel}
                            onSuccess={() => handleJobSignupSuccess(job.id)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {event.jobs.length === 0 && (
              <div className="border-t pt-4 mb-4">
                <p className="text-sm text-muted-foreground">
                  No volunteer jobs for this event.
                </p>
              </div>
            )}

            {/* Calendar export */}
            <div className="flex flex-wrap gap-2">
              <a
                href={gcalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent/50 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Google Calendar
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
