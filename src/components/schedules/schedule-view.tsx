"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parseISO,
  differenceInMinutes,
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
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Calendar as CalendarIcon,
  List,
  Clock,
  MapPin,
  Loader2,
  Ban,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { EventForm } from "./event-form";
import { EventDetail } from "./event-detail";
import { TimeSlotRequests, TimeSlotRequestsBadge } from "./time-slot-requests";

interface Team {
  id: string;
  name: string;
  color: string;
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

interface Season {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
}

interface JobAssignmentData {
  id: string;
  name: string | null;
  playerName: string | null;
}

interface GameJobData {
  id: string;
  slotsNeeded: number;
  isPublic: boolean;
  jobTemplate: { name: string; scope: string };
  assignments: JobAssignmentData[];
}

interface ScheduleEventData {
  id: string;
  title: string;
  type: string;
  priority: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  recurrenceGroupId: string | null;
  teamId: string | null;
  subFacilityId: string | null;
  seasonId: string | null;
  customLocation?: string | null;
  customLocationUrl?: string | null;
  gameVenue?: string | null;
  cancelledByBumpId?: string | null;
  team?: { id: string; name: string; color: string; headCoach?: { name: string } | null } | null;
  subFacility?: {
    id: string;
    name: string;
    facility: { id: string; name: string; googleMapsUrl?: string | null };
  } | null;
  gameJobs?: GameJobData[];
}

interface ScheduleViewProps {
  teams: Team[];
  facilities: Facility[];
  seasons: Season[];
  canManage: boolean;
  canBump: boolean;
  isAdmin?: boolean;
  userTeams?: Team[];
}

interface BlackoutData {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  scope: string;
  eventTypes: string;
  facility?: { id: string; name: string } | null;
}

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getTypeLabel(type: string, gameVenue?: string | null) {
  if (type === "GAME") return gameVenue === "AWAY" ? "Away Game" : "Home Game";
  if (type === "PRACTICE") return "Practice";
  if (type === "CLUB_EVENT") return "Club Event";
  return "Other";
}

export function ScheduleView({
  teams,
  facilities,
  seasons,
  canManage,
  canBump,
  isAdmin = false,
  userTeams = [],
}: ScheduleViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day" | "agenda">("month");
  const [filterTeamId, setFilterTeamId] = useState("");
  const [filterSubFacilityId, setFilterSubFacilityId] = useState("");
  const [events, setEvents] = useState<ScheduleEventData[]>([]);
  const [blackouts, setBlackouts] = useState<BlackoutData[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] =
    useState<ScheduleEventData | null>(null);
  const [editEvent, setEditEvent] = useState<ScheduleEventData | null>(null);
  const [showRequests, setShowRequests] = useState(false);
  const [selectedBlackout, setSelectedBlackout] = useState<BlackoutData | null>(null);

  const getDateRange = useCallback(() => {
    if (viewMode === "agenda") {
      return { start: startOfDay(currentDate), end: endOfDay(addDays(currentDate, 13)) };
    }
    if (viewMode === "day") {
      return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
    }
    if (viewMode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return {
        start: startOfWeek(monthStart),
        end: endOfWeek(monthEnd),
      };
    }
    return {
      start: startOfWeek(currentDate),
      end: endOfWeek(currentDate),
    };
  }, [currentDate, viewMode]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const params = new URLSearchParams();
      params.set("startDate", start.toISOString());
      params.set("endDate", end.toISOString());
      if (filterTeamId) params.set("teamId", filterTeamId);
      if (filterSubFacilityId)
        params.set("subFacilityId", filterSubFacilityId);

      const [eventsRes, blackoutsRes] = await Promise.all([
        fetch(`/api/schedules?${params.toString()}`),
        fetch("/api/blackout-dates"),
      ]);
      if (eventsRes.ok) {
        setEvents(await eventsRes.json());
      }
      if (blackoutsRes.ok) {
        setBlackouts(await blackoutsRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, [getDateRange, filterTeamId, filterSubFacilityId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  function navigatePrev() {
    setCurrentDate((prev) => {
      if (viewMode === "month") return subMonths(prev, 1);
      if (viewMode === "week") return subWeeks(prev, 1);
      if (viewMode === "day") return subDays(prev, 1);
      return subDays(prev, 14);
    });
  }

  function navigateNext() {
    setCurrentDate((prev) => {
      if (viewMode === "month") return addMonths(prev, 1);
      if (viewMode === "week") return addWeeks(prev, 1);
      if (viewMode === "day") return addDays(prev, 1);
      return addDays(prev, 14);
    });
  }

  function handleDayClick(day: Date) {
    if (!canManage) return;
    setCreateDate(day);
    setShowCreateForm(true);
  }

  function handleEventClick(event: ScheduleEventData, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedEvent(event);
  }

  function handleEdit(event: ScheduleEventData) {
    setSelectedEvent(null);
    setEditEvent(event);
  }

  function handleFormClose() {
    setShowCreateForm(false);
    setCreateDate(null);
    setEditEvent(null);
  }

  function handleSaved() {
    handleFormClose();
    fetchEvents();
  }

  function handleDeleted() {
    setSelectedEvent(null);
    fetchEvents();
  }

  const { start: rangeStart, end: rangeEnd } = getDateRange();
  const days = viewMode === "month" || viewMode === "week"
    ? eachDayOfInterval({ start: rangeStart, end: rangeEnd })
    : [];

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(parseISO(e.startTime), day));

  const getBlackoutsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return blackouts.filter((b) => {
      const bStartStr = b.startDate.slice(0, 10);
      const bEndStr = b.endDate.slice(0, 10);
      return dayStr >= bStartStr && dayStr <= bEndStr;
    });
  };

  const headerLabel = (() => {
    if (viewMode === "month") return format(currentDate, "MMMM yyyy");
    if (viewMode === "week") return `${format(startOfWeek(currentDate), "MMM d")} – ${format(endOfWeek(currentDate), "MMM d, yyyy")}`;
    if (viewMode === "day") return format(currentDate, "EEEE, MMMM d, yyyy");
    return `${format(currentDate, "MMM d")} – ${format(addDays(currentDate, 13), "MMM d, yyyy")}`;
  })();

  const agendaDays = viewMode === "agenda"
    ? eachDayOfInterval({ start: rangeStart, end: rangeEnd })
    : [];

  const DAY_START_HOUR = 6;
  const DAY_END_HOUR = 22;
  const dayHours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
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

        <h2 className="text-base sm:text-lg font-semibold min-w-0 truncate">{headerLabel}</h2>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <Select
            value={filterTeamId || "__all__"}
            onValueChange={(v) => setFilterTeamId(!v || v === "__all__" ? "" : v)}
            items={{ __all__: "All Teams", ...Object.fromEntries(teams.map((t) => [t.id, t.headCoach ? `${t.name} - ${t.headCoach.name}` : t.name])) }}
          >
            <SelectTrigger>
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
            value={filterSubFacilityId || "__all__"}
            onValueChange={(v) =>
              setFilterSubFacilityId(!v || v === "__all__" ? "" : v)
            }
            items={{ __all__: "All Facilities", ...Object.fromEntries(facilities.flatMap((f) => f.subFacilities.map((sf) => [sf.id, `${f.name} – ${sf.name}`]))) }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Facilities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Facilities</SelectItem>
              {facilities.map((f) =>
                f.subFacilities.map((sf) => (
                  <SelectItem key={sf.id} value={sf.id} label={`${f.name} – ${sf.name}`}>
                    {f.name} – {sf.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Tabs
            value={viewMode}
            onValueChange={(v) => { if (v) setViewMode(v as "month" | "week" | "day" | "agenda"); }}
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
              <TabsTrigger value="day">
                <Clock className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Day</span>
              </TabsTrigger>
              <TabsTrigger value="agenda">
                <List className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Agenda</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <TimeSlotRequestsBadge onClick={() => setShowRequests(true)} />

          {canManage && (
            <Button
              onClick={() => {
                setCreateDate(new Date());
                setShowCreateForm(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              New Event
            </Button>
          )}
        </div>
      </div>

      {/* Month / Week grid */}
      {(viewMode === "month" || viewMode === "week") && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {WEEK_DAYS.map((day) => (
              <div
                key={day}
                className="px-2 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              const dayBlackouts = getBlackoutsForDay(day);
              const inMonth = isSameMonth(day, currentDate);
              const today = isToday(day);
              const isBlackedOut = dayBlackouts.length > 0;
              const maxVisible = viewMode === "month" ? 3 : 8;
              const visible = dayEvents.slice(0, maxVisible);
              const overflow = dayEvents.length - maxVisible;

              return (
                <div
                  key={i}
                  className={cn(
                    "relative border-b border-r p-1.5 transition-colors",
                    viewMode === "month" ? "min-h-[110px]" : "min-h-[220px]",
                    !inMonth && "bg-muted/20",
                    today && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                    isBlackedOut && "bg-red-50 dark:bg-red-950/20",
                    canManage && "cursor-pointer hover:bg-accent/30"
                  )}
                  onClick={() => handleDayClick(day)}
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
                    {isBlackedOut && (
                      <span className="flex items-center gap-0.5 text-[10px] font-medium text-red-600 dark:text-red-400" title={dayBlackouts.map(b => b.title).join(", ")}>
                        <Ban className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  {isBlackedOut && (
                    <div className="mb-0.5">
                      {dayBlackouts.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          className="w-full truncate rounded-md px-1.5 py-[2px] text-[10px] font-medium leading-tight bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800/50 mb-0.5 text-left hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors cursor-pointer"
                          title={`Blackout - ${b.title} (${b.eventTypes === "ALL" ? "All events" : b.eventTypes})`}
                          onClick={(e) => { e.stopPropagation(); setSelectedBlackout(b); }}
                        >
                          <Ban className="inline h-2.5 w-2.5 mr-0.5 -mt-0.5" />
                          Blackout - {b.title}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-0.5">
                    {visible.map((event) => {
                      const coachName = event.team?.headCoach?.name;
                      const typeLabel = getTypeLabel(event.type, event.gameVenue);
                      const bgColor = event.team?.color ?? "#6b7280";
                      const teamName = event.team?.name ?? "Club Event";
                      return (
                        <button
                          key={event.id}
                          className="group/pill w-full truncate rounded-md px-1.5 py-[3px] text-left text-[11px] font-medium leading-tight text-white transition-all hover:opacity-90 hover:shadow-sm"
                          style={{ backgroundColor: bgColor }}
                          onClick={(e) => handleEventClick(event, e)}
                          title={`${format(parseISO(event.startTime), "h:mm a")} – ${teamName}${coachName ? ` - ${coachName}` : ""} - ${typeLabel}: ${event.title}`}
                        >
                          <span className="opacity-75">
                            {format(parseISO(event.startTime), "h:mma").toLowerCase()}
                          </span>{" "}
                          {teamName}{coachName ? <span className="opacity-70"> - {coachName}</span> : null} - {typeLabel}
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

      {/* Day view */}
      {viewMode === "day" && (
        <div className="rounded-lg border bg-card overflow-hidden">
          {getBlackoutsForDay(currentDate).length > 0 && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800/50 flex items-center gap-2 flex-wrap">
              <Ban className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              {getBlackoutsForDay(currentDate).map((b) => (
                <Badge
                  key={b.id}
                  variant="destructive"
                  className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedBlackout(b)}
                >
                  Blackout - {b.title} ({b.eventTypes === "ALL" ? "All events" : b.eventTypes})
                </Badge>
              ))}
            </div>
          )}
          <div className="relative" style={{ minHeight: `${(DAY_END_HOUR - DAY_START_HOUR) * 64}px` }}>
            {dayHours.map((hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-b border-border/40"
                style={{ top: `${(hour - DAY_START_HOUR) * 64}px`, height: 64 }}
              >
                <span className="absolute -top-2.5 left-2 text-[11px] text-muted-foreground bg-card px-1">
                  {format(new Date(2000, 0, 1, hour), "h a")}
                </span>
              </div>
            ))}
            <div className="ml-16 mr-2 relative">
              {events
                .filter((e) => isSameDay(parseISO(e.startTime), currentDate))
                .map((event) => {
                  const start = parseISO(event.startTime);
                  const end = parseISO(event.endTime);
                  const startMin = start.getHours() * 60 + start.getMinutes();
                  const durationMin = Math.max(differenceInMinutes(end, start), 30);
                  const top = ((startMin - DAY_START_HOUR * 60) / 60) * 64;
                  const height = (durationMin / 60) * 64;
                  const coachName = event.team?.headCoach?.name;
                  const typeLabel = getTypeLabel(event.type, event.gameVenue);
                  const bgColor = event.team?.color ?? "#6b7280";
                  const teamName = event.team?.name ?? "Club Event";

                  return (
                    <button
                      key={event.id}
                      className="absolute left-0 right-0 rounded-lg px-3 py-1.5 text-left text-white text-sm font-medium overflow-hidden hover:opacity-90 transition-opacity shadow-sm"
                      style={{ top: Math.max(top, 0), height: Math.max(height, 28), backgroundColor: bgColor }}
                      onClick={(e) => handleEventClick(event, e)}
                    >
                      <div className="truncate font-semibold text-xs">
                        {format(start, "h:mm a")} – {format(end, "h:mm a")}
                      </div>
                      <div className="truncate text-xs opacity-90">
                        {teamName}{coachName ? ` - ${coachName}` : ""} · {typeLabel}: {event.title}
                      </div>
                      {event.subFacility && height > 50 && (
                        <div className="truncate text-[11px] opacity-75">
                          {event.subFacility.facility.name} – {event.subFacility.name}
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Agenda view */}
      {viewMode === "agenda" && (
        <div className="rounded-lg border bg-card overflow-hidden divide-y">
          {agendaDays.map((day) => {
            const dayEvents = getEventsForDay(day);
            const dayBlackouts = getBlackoutsForDay(day);
            if (dayEvents.length === 0 && dayBlackouts.length === 0) return null;
            const today = isToday(day);
            return (
              <div key={day.toISOString()}>
                <div className={cn(
                  "px-4 py-2 bg-muted/50 flex items-center gap-2",
                  today && "bg-primary/10",
                  dayBlackouts.length > 0 && "bg-red-50 dark:bg-red-950/20"
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
                  {dayBlackouts.map((b) => (
                    <Badge
                      key={b.id}
                      variant="destructive"
                      className="text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedBlackout(b)}
                    >
                      <Ban className="h-3 w-3 mr-1" />
                      Blackout - {b.title}
                    </Badge>
                  ))}
                </div>
                <div className="divide-y divide-border/50">
                  {dayEvents.map((event) => {
                    const start = parseISO(event.startTime);
                    const end = parseISO(event.endTime);
                    const coachName = event.team?.headCoach?.name;
                    const typeLabel = getTypeLabel(event.type, event.gameVenue);
                    const bgColor = event.team?.color ?? "#6b7280";
                    const teamName = event.team?.name ?? "Club Event";
                    const locationLabel = event.subFacility
                      ? `${event.subFacility.facility.name} – ${event.subFacility.name}`
                      : event.customLocation ?? "";
                    return (
                      <button
                        key={event.id}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-accent/30 transition-colors"
                        onClick={(e) => handleEventClick(event, e)}
                      >
                        <span className="text-xs text-muted-foreground w-[100px] shrink-0">
                          {format(start, "h:mm a")} – {format(end, "h:mm a")}
                        </span>
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: bgColor }}
                        />
                        <span className="text-sm font-medium truncate flex-1">
                          {event.title}
                        </span>
                        <span className="text-xs text-muted-foreground truncate hidden sm:block max-w-[150px]">
                          {teamName}{coachName ? ` - ${coachName}` : ""}
                        </span>
                        {locationLabel && (
                          <span className="text-xs text-muted-foreground truncate hidden md:flex items-center gap-1 max-w-[180px]">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {locationLabel}
                          </span>
                        )}
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {typeLabel}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!loading && agendaDays.every((d) => getEventsForDay(d).length === 0 && getBlackoutsForDay(d).length === 0) && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No events in this 2-week period.
            </div>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading events...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium">No events scheduled</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {canManage
              ? "Click on a day or use the New Event button to schedule your first event."
              : "No events found for the selected filters and date range."}
          </p>
          {canManage && (
            <Button
              className="mt-4"
              onClick={() => {
                setCreateDate(new Date());
                setShowCreateForm(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              New Event
            </Button>
          )}
        </div>
      )}

      {/* Event form dialog */}
      {(showCreateForm || editEvent) && (
        <EventForm
          open={showCreateForm || !!editEvent}
          onClose={handleFormClose}
          onSaved={handleSaved}
          teams={teams}
          facilities={facilities}
          seasons={seasons}
          canBump={canBump}
          isAdmin={isAdmin}
          event={editEvent || undefined}
          defaultDate={createDate || undefined}
        />
      )}

      {/* Event detail sheet */}
      {selectedEvent && (
        <EventDetail
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          event={selectedEvent}
          canManage={canManage}
          onEdit={() => handleEdit(selectedEvent)}
          onDeleted={handleDeleted}
          userTeams={userTeams}
        />
      )}

      {/* Time Slot Requests panel */}
      <TimeSlotRequests
        open={showRequests}
        onClose={() => setShowRequests(false)}
      />

      {/* Blackout detail dialog */}
      {selectedBlackout && (
        <BlackoutDetailDialog
          blackout={selectedBlackout}
          isAdmin={isAdmin}
          facilities={facilities}
          onClose={() => setSelectedBlackout(null)}
          onUpdated={() => {
            setSelectedBlackout(null);
            fetchEvents();
          }}
        />
      )}
    </div>
  );
}

function extractDateStr(isoString: string): string {
  return isoString.slice(0, 10);
}

function BlackoutDetailDialog({
  blackout,
  isAdmin,
  facilities,
  onClose,
  onUpdated,
}: {
  blackout: BlackoutData;
  isAdmin: boolean;
  facilities: Facility[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(blackout.title);
  const [startDate, setStartDate] = useState(extractDateStr(blackout.startDate));
  const [endDate, setEndDate] = useState(extractDateStr(blackout.endDate));
  const [scope, setScope] = useState(blackout.scope);
  const [facilityId, setFacilityId] = useState(blackout.facility?.id ?? "");
  const [eventTypes, setEventTypes] = useState(blackout.eventTypes);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/blackout-dates/${blackout.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Blackout date removed");
      onUpdated();
    } catch {
      toast.error("Failed to delete blackout");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/blackout-dates/${blackout.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          startDate: startDate + "T00:00:00",
          endDate: endDate + "T23:59:59",
          scope,
          facilityId: scope === "FACILITY" ? facilityId || null : null,
          eventTypes,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update");
      }
      toast.success("Blackout date updated");
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <Ban className="h-5 w-5" />
            Blackout - {blackout.title}
          </DialogTitle>
          <DialogDescription>
            Edit the blackout details below or remove it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Blackout title"
              disabled={!isAdmin}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Start Date</Label>
              <DatePicker
                value={startDate}
                onChange={(v) => setStartDate(v)}
                placeholder="Start"
                disabled={!isAdmin}
              />
            </div>
            <div className="grid gap-2">
              <Label>End Date</Label>
              <DatePicker
                value={endDate}
                onChange={(v) => setEndDate(v)}
                placeholder="End"
                disabled={!isAdmin}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Scope</Label>
            <Select
              value={scope}
              onValueChange={(v) => { if (v) setScope(v); }}
              disabled={!isAdmin}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ORG_WIDE">Organization-wide</SelectItem>
                <SelectItem value="FACILITY">Specific Facility</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {scope === "FACILITY" && (
            <div className="grid gap-2">
              <Label>Facility</Label>
              <Select
                value={facilityId || "__none__"}
                onValueChange={(v) => setFacilityId(!v || v === "__none__" ? "" : v)}
                disabled={!isAdmin}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select facility</SelectItem>
                  {facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <Label>Affected Event Types</Label>
            <Select
              value={eventTypes}
              onValueChange={(v) => { if (v) setEventTypes(v); }}
              disabled={!isAdmin}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Events</SelectItem>
                <SelectItem value="GAME">Games Only</SelectItem>
                <SelectItem value="PRACTICE">Practices Only</SelectItem>
                <SelectItem value="GAME,PRACTICE">Games & Practices</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isAdmin && (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                {deleting ? "Removing..." : "Remove Blackout"}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || deleting}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            {isAdmin ? "Cancel" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
