"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useIsMobile } from "@/hooks/use-is-mobile";
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
  Filter,
  Download,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CalendarSubscribeButton } from "./calendar-subscribe-button";
import { FacilityFilterCombobox } from "./facility-filter-combobox";


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
  comfortLevel?: string | null;
}

interface GameJobData {
  id: string;
  jobTemplateId?: string;
  slotsNeeded: number;
  isPublic: boolean;
  disabled?: boolean;
  jobTemplate: { name: string; scope: string; askComfortLevel?: boolean };
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
  noJobs?: boolean;
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
  /** When set, calendar is scoped to this team (hides team picker, optional home/away game filter). */
  lockedTeamId?: string;
  /** SessionStorage key for view mode (default `schedule-viewMode`). Use per-team keys on team pages. */
  viewModeStorageKey?: string;
  /** Called after create/edit/delete so parent RSC data (e.g. team overview) can refresh. */
  onScheduleChanged?: () => void;
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

/** Lowercase haystack from schedule event fields for agenda search. */
function scheduleEventSearchHaystack(event: ScheduleEventData): string {
  const typeLabel = getTypeLabel(event.type, event.gameVenue);
  const teamName = event.team?.name ?? "Club Event";
  const coach = event.team?.headCoach?.name ?? "";
  const locationLabel = event.subFacility
    ? `${event.subFacility.facility.name} ${event.subFacility.name}`
    : event.customLocation ?? "";
  return [
    event.title,
    teamName,
    coach,
    typeLabel,
    locationLabel,
    event.notes ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function ScheduleView({
  teams,
  facilities,
  seasons,
  canManage,
  canBump,
  isAdmin = false,
  userTeams = [],
  lockedTeamId,
  viewModeStorageKey,
  onScheduleChanged,
}: ScheduleViewProps) {
  const isMobile = useIsMobile();
  const storageKey = viewModeStorageKey ?? "schedule-viewMode";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "agenda">(() => {
    if (typeof window === "undefined") return "agenda";
    const saved = sessionStorage.getItem(storageKey);
    if (saved === "day") return "agenda";
    if (saved && ["month", "week", "agenda"].includes(saved)) {
      return saved as "month" | "week" | "agenda";
    }
    return window.matchMedia("(max-width: 767px)").matches ? "agenda" : "month";
  });
  const [filterTeamId, setFilterTeamId] = useState(lockedTeamId ?? "");
  const [filterSubFacilityId, setFilterSubFacilityId] = useState("");
  const [events, setEvents] = useState<ScheduleEventData[]>([]);
  const [blackouts, setBlackouts] = useState<BlackoutData[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [showAwayGames, setShowAwayGames] = useState(false);
  const [gameVenueFilter, setGameVenueFilter] = useState<"all" | "home" | "away">("all");
  const [agendaSearch, setAgendaSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] =
    useState<ScheduleEventData | null>(null);
  const [editEvent, setEditEvent] = useState<ScheduleEventData | null>(null);
  const [showRequests, setShowRequests] = useState(false);
  const [selectedBlackout, setSelectedBlackout] = useState<BlackoutData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem(storageKey, viewMode);
  }, [viewMode, storageKey]);

  useEffect(() => {
    if (lockedTeamId) setFilterTeamId(lockedTeamId);
  }, [lockedTeamId]);

  const filteredEvents = lockedTeamId
    ? events.filter((e) => {
        if (gameVenueFilter === "all") return true;
        if (gameVenueFilter === "home")
          return !(e.type === "GAME" && e.gameVenue === "AWAY");
        return e.type === "GAME" && e.gameVenue === "AWAY";
      })
    : showAwayGames
      ? events
      : events.filter((e) => e.gameVenue !== "AWAY");

  const venueFilterActive = lockedTeamId
    ? gameVenueFilter !== "all"
    : showAwayGames;
  const hasActiveFilters =
    !!filterSubFacilityId ||
    venueFilterActive ||
    (!lockedTeamId && !!filterTeamId);

  /** Public iCal: full org, or one team (locked tab or selected team filter). */
  const scheduleIcalPath = useMemo(() => {
    const base = "/api/schedule/public/ical";
    const tid = lockedTeamId ?? filterTeamId;
    if (tid) return `${base}?teamId=${encodeURIComponent(tid)}`;
    return base;
  }, [lockedTeamId, filterTeamId]);

  const getDateRange = useCallback(() => {
    if (viewMode === "agenda") {
      return { start: null, end: null };
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
      if (start) params.set("startDate", start.toISOString());
      if (end) params.set("endDate", end.toISOString());
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
    if (viewMode === "agenda") return;
    setCurrentDate((prev) => {
      if (viewMode === "month") return subMonths(prev, 1);
      if (viewMode === "week") return subWeeks(prev, 1);
      return prev;
    });
  }

  function navigateNext() {
    if (viewMode === "agenda") return;
    setCurrentDate((prev) => {
      if (viewMode === "month") return addMonths(prev, 1);
      if (viewMode === "week") return addWeeks(prev, 1);
      return prev;
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
    onScheduleChanged?.();
  }

  function handleDeleted() {
    setSelectedEvent(null);
    fetchEvents();
    onScheduleChanged?.();
  }

  const { start: rangeStart, end: rangeEnd } = getDateRange();
  const days = (viewMode === "month" || viewMode === "week") && rangeStart && rangeEnd
    ? eachDayOfInterval({ start: rangeStart, end: rangeEnd })
    : [];

  const getEventsForDay = (day: Date) =>
    filteredEvents.filter((e) => isSameDay(parseISO(e.startTime), day));

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
    return "Agenda";
  })();

  const agendaDays = (() => {
    if (viewMode !== "agenda") return [];
    if (filteredEvents.length === 0) return [];
    const sorted = [...filteredEvents].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    const first = startOfDay(parseISO(sorted[0].startTime));
    const last = startOfDay(parseISO(sorted[sorted.length - 1].startTime));
    return eachDayOfInterval({ start: first, end: last });
  })();

  const agendaSearchWords = useMemo(
    () => agendaSearch.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [agendaSearch]
  );

  const scheduleEventMatchesAgendaSearch = useMemo(() => {
    return (event: ScheduleEventData) => {
      if (agendaSearchWords.length === 0) return true;
      const haystack = scheduleEventSearchHaystack(event);
      return agendaSearchWords.every((w) => haystack.includes(w));
    };
  }, [agendaSearchWords]);

  const agendaEventsForDay = (day: Date) =>
    getEventsForDay(day).filter(scheduleEventMatchesAgendaSearch);

  const agendaHasVisibleContent = agendaDays.some(
    (d) =>
      agendaEventsForDay(d).length > 0 || getBlackoutsForDay(d).length > 0
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 md:block md:space-y-4 md:h-auto">
      {/* ===== MOBILE TOOLBAR ===== */}
      <div className="md:hidden flex flex-col gap-1.5 shrink-0 pb-2">
        {/* Row 1: date navigation (month/week only — agenda lists all events, no range) */}
        {viewMode !== "agenda" && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={navigatePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button
              type="button"
              className="text-sm font-semibold truncate flex-1 min-w-0 text-center px-1 py-1.5 rounded-md active:opacity-70 active:bg-muted/50"
              onClick={() => setCurrentDate(new Date())}
            >
              {headerLabel}
            </button>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Row 2: view mode */}
        <Tabs
          value={viewMode}
          onValueChange={(v) => { if (v) setViewMode(v as "month" | "week" | "agenda"); }}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-3 h-9">
            <TabsTrigger value="agenda" className="text-[11px] h-8 px-0">
              <List className="h-3.5 w-3.5 mr-0.5 shrink-0" />Agenda
            </TabsTrigger>
            <TabsTrigger value="week" className="text-[11px] h-8 px-0">
              <CalendarDays className="h-3.5 w-3.5 mr-0.5 shrink-0" />Week
            </TabsTrigger>
            <TabsTrigger value="month" className="text-[11px] h-8 px-0">
              <CalendarIcon className="h-3.5 w-3.5 mr-0.5 shrink-0" />Month
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Row 3: all teams (main schedule) or home/away (team tab) */}
        {!lockedTeamId && teams.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5 -mx-1 px-1 touch-pan-x">
            <span className="text-[10px] text-muted-foreground shrink-0 font-medium uppercase tracking-wide">
              Teams
            </span>
            <button
              type="button"
              onClick={() => setFilterTeamId("")}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 transition-colors",
                !filterTeamId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              All
            </button>
            {teams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterTeamId(t.id)}
                className={cn(
                  "max-w-[140px] px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5",
                  filterTeamId === t.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: filterTeamId === t.id ? "currentColor" : t.color }}
                />
                <span className="truncate">{t.name}</span>
              </button>
            ))}
          </div>
        )}
        {lockedTeamId && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5 -mx-1 px-1 touch-pan-x">
            <span className="text-[10px] text-muted-foreground shrink-0 font-medium uppercase tracking-wide">
              Games
            </span>
            {(["all", "home", "away"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setGameVenueFilter(k)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 transition-colors",
                  gameVenueFilter === k
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {k === "all" ? "All" : k === "home" ? "Home" : "Away"}
              </button>
            ))}
          </div>
        )}

        {/* Row 4: filters + live feed + new event */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className={cn(
              "flex items-center gap-1.5 h-9 min-w-0 flex-1 px-2.5 rounded-md border text-xs font-medium transition-colors",
              mobileFiltersOpen
                ? "bg-primary/10 text-primary border-primary/25"
                : "border-border bg-background text-muted-foreground hover:bg-muted/40"
            )}
          >
            <Filter className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Filters</span>
            {hasActiveFilters && (
              <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-hidden />
            )}
          </button>
          <CalendarSubscribeButton icalPath={scheduleIcalPath} variant="compact" />
          {canManage && (
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => { setCreateDate(new Date()); setShowCreateForm(true); }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Collapsible filters (facility, away games, etc.) — team picker is chips above */}
        {mobileFiltersOpen && (
          <div className="flex flex-col gap-2 p-2 rounded-lg border bg-card animate-in slide-in-from-top-2 fade-in duration-150">
            <FacilityFilterCombobox
              facilities={facilities}
              value={filterSubFacilityId}
              onValueChange={setFilterSubFacilityId}
              size="sm"
            />
            {lockedTeamId ? (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Games</Label>
                <div className="flex flex-wrap gap-1">
                  {(["all", "home", "away"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setGameVenueFilter(k)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                        gameVenueFilter === k
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {k === "all" ? "All" : k === "home" ? "Home" : "Away"}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
            <div className="flex items-center gap-1.5">
              <Checkbox id="show-away-m" checked={showAwayGames} onCheckedChange={(c) => setShowAwayGames(!!c)} />
              <Label htmlFor="show-away-m" className="text-xs text-muted-foreground cursor-pointer">Show away games</Label>
            </div>
            )}
          </div>
        )}
      </div>

      {/* ===== DESKTOP TOOLBAR ===== */}
      <div className="hidden md:flex flex-wrap items-center gap-3">
        {viewMode !== "agenda" && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={navigatePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <h2 className="text-lg font-semibold min-w-0 truncate">{headerLabel}</h2>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {!lockedTeamId && (
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
                  <span className="inline-block h-2.5 w-2.5 rounded-full mr-1.5" style={{ backgroundColor: t.color }} />
                  {t.name}
                  {t.headCoach && <span className="text-muted-foreground"> - {t.headCoach.name}</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}

          <FacilityFilterCombobox
            facilities={facilities}
            value={filterSubFacilityId}
            onValueChange={setFilterSubFacilityId}
          />

          <Tabs
            value={viewMode}
            onValueChange={(v) => { if (v) setViewMode(v as "month" | "week" | "agenda"); }}
          >
            <TabsList>
              <TabsTrigger value="month">
                <CalendarIcon className="h-4 w-4 mr-1" />Month
              </TabsTrigger>
              <TabsTrigger value="week">
                <CalendarDays className="h-4 w-4 mr-1" />Week
              </TabsTrigger>
              <TabsTrigger value="agenda">
                <List className="h-4 w-4 mr-1" />Agenda
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {lockedTeamId ? (
            <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-muted/20 p-0.5">
              {(["all", "home", "away"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setGameVenueFilter(k)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    gameVenueFilter === k
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {k === "all" ? "All games" : k === "home" ? "Home" : "Away"}
                </button>
              ))}
            </div>
          ) : (
          <div className="flex items-center gap-1.5">
            <Checkbox id="show-away-games" checked={showAwayGames} onCheckedChange={(checked) => setShowAwayGames(!!checked)} />
            <Label htmlFor="show-away-games" className="text-xs font-normal text-muted-foreground whitespace-nowrap cursor-pointer">
              Away games
            </Label>
          </div>
          )}

          <CalendarSubscribeButton icalPath={scheduleIcalPath} />

          <TimeSlotRequestsBadge onClick={() => setShowRequests(true)} />

          {canManage && (
            <Button onClick={() => { setCreateDate(new Date()); setShowCreateForm(true); }}>
              <Plus className="mr-1 h-4 w-4" />
              New Event
            </Button>
          )}
        </div>
      </div>

      {/* ===== SCROLLABLE CONTENT AREA ===== */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto md:overflow-visible min-h-0">
        {/* Month / Week grid */}
        {(viewMode === "month" || viewMode === "week") && (
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="grid grid-cols-7 border-b bg-muted/50">
              {WEEK_DAYS.map((day) => (
                <div
                  key={day}
                  className="px-1 md:px-2 py-1.5 md:py-2.5 text-center text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  {isMobile ? day[0] : day}
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
                const maxVisible = isMobile ? 2 : viewMode === "month" ? 3 : 8;
                const visible = dayEvents.slice(0, maxVisible);
                const overflow = dayEvents.length - maxVisible;

                return (
                  <div
                    key={i}
                    className={cn(
                      "relative border-b border-r p-0.5 md:p-1.5 transition-colors",
                      viewMode === "month" ? "min-h-[60px] md:min-h-[110px]" : "min-h-[100px] md:min-h-[220px]",
                      !inMonth && "bg-muted/20",
                      today && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                      isBlackedOut && "bg-red-50 dark:bg-red-950/20",
                      canManage && "cursor-pointer hover:bg-accent/30"
                    )}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className="flex items-center justify-between px-0.5 mb-0.5">
                      <span
                        className={cn(
                          "text-[10px] md:text-xs",
                          !inMonth && "text-muted-foreground/40",
                          inMonth && "text-muted-foreground",
                          today &&
                            "flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {isBlackedOut && (
                        <Ban className="h-2.5 w-2.5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    {isBlackedOut && !isMobile && (
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
                        const bgColor = event.team?.color ?? "#6b7280";
                        return (
                          <button
                            key={event.id}
                            className="group/pill w-full truncate rounded px-1 md:px-1.5 py-[2px] md:py-[3px] text-left text-[9px] md:text-[11px] font-medium leading-tight text-white transition-all hover:opacity-90"
                            style={{ backgroundColor: bgColor }}
                            onClick={(e) => handleEventClick(event, e)}
                          >
                            <span className="opacity-75">
                              {format(parseISO(event.startTime), "h:mma").toLowerCase()}
                            </span>
                            <span className="hidden md:inline">
                              {" "}{event.team?.name ?? "Club"} - {getTypeLabel(event.type, event.gameVenue)}
                            </span>
                          </button>
                        );
                      })}
                      {overflow > 0 && (
                        <p className="px-0.5 text-[9px] md:text-[10px] text-muted-foreground font-medium">
                          +{overflow}
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
          <div>
            <div className="flex flex-col gap-2 mb-2">
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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 gap-1 w-full sm:w-auto"
                onClick={() => {
                  const rows: string[] = [];
                  for (const day of agendaDays) {
                    const dayEvts = agendaEventsForDay(day);
                    const dayBo = getBlackoutsForDay(day);
                    if (dayEvts.length === 0 && dayBo.length === 0) continue;
                    const todayTag = isToday(day) ? ' <span style="background:#e0e7ff;color:#4338ca;padding:1px 6px;border-radius:8px;font-size:10px;margin-left:4px">Today</span>' : "";
                    rows.push(`<tr><td colspan="5" style="background:#f5f5f5;padding:8px 12px;font-weight:600;font-size:13px;border-top:2px solid #e5e5e5">${format(day, "EEEE, MMM d, yyyy")}${todayTag}</td></tr>`);
                    for (const evt of dayEvts) {
                      const s = parseISO(evt.startTime);
                      const e = parseISO(evt.endTime);
                      const tl = getTypeLabel(evt.type, evt.gameVenue);
                      const team = evt.team?.name ?? "Club Event";
                      const loc = evt.subFacility ? `${evt.subFacility.facility.name} – ${evt.subFacility.name}` : evt.customLocation ?? "";
                      const color = evt.team?.color ?? "#6b7280";
                      rows.push(`<tr>
                        <td style="padding:6px 8px 6px 12px;width:12px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color}"></span></td>
                        <td style="padding:6px 4px;font-weight:500">${evt.title}</td>
                        <td style="padding:6px 4px;color:#666;white-space:nowrap">${format(s, "h:mm a")} – ${format(e, "h:mm a")}</td>
                        <td style="padding:6px 4px;color:#666">${team}${loc ? ` · ${loc}` : ""}</td>
                        <td style="padding:6px 8px"><span style="background:#f0f0f0;padding:2px 8px;border-radius:10px;font-size:11px;white-space:nowrap">${tl}</span></td>
                      </tr>`);
                    }
                  }
                  const pw = window.open("", "_blank");
                  if (!pw) return;
                  pw.document.write(`<!DOCTYPE html><html><head><title>Schedule</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:32px;color:#111}
h1{font-size:20px;font-weight:700;margin-bottom:4px}
.sub{font-size:13px;color:#666;margin-bottom:20px}
table{width:100%;border-collapse:collapse;font-size:13px}
tr:hover td{background:#fafafa}
@media print{body{padding:16px}h1{font-size:18px}}
</style></head><body>
<h1>Schedule</h1>
<p class="sub">${headerLabel}${filterTeamId ? ` · ${teams.find(t=>t.id===filterTeamId)?.name ?? ""}` : ""}</p>
<table>${rows.join("")}</table>
</body></html>`);
                  pw.document.close();
                  pw.onload = () => { pw.print(); };
                }}
              >
                <Download className="h-3 w-3" />
                Export PDF
              </Button>
              </div>
            </div>
            <div className="rounded-lg md:border bg-card overflow-hidden divide-y">
            {agendaDays.map((day) => {
              const dayEvents = agendaEventsForDay(day);
              const dayBlackouts = getBlackoutsForDay(day);
              if (dayEvents.length === 0 && dayBlackouts.length === 0) return null;
              const today = isToday(day);
              return (
                <div key={day.toISOString()}>
                  <div className={cn(
                    "px-3 md:px-4 py-1.5 md:py-2 bg-muted/50 flex items-center gap-2 sticky top-0 z-10",
                    today && "bg-primary/10",
                    dayBlackouts.length > 0 && "bg-red-50 dark:bg-red-950/20"
                  )}>
                    <span className={cn(
                      "text-xs md:text-sm font-semibold",
                      today && "text-primary"
                    )}>
                      {format(day, "EEE, MMM d")}
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
                        <Ban className="h-2.5 w-2.5 mr-0.5" />
                        {b.title}
                      </Badge>
                    ))}
                  </div>
                  <div className="divide-y divide-border/50">
                    {dayEvents.map((event) => {
                      const start = parseISO(event.startTime);
                      const end = parseISO(event.endTime);
                      const typeLabel = getTypeLabel(event.type, event.gameVenue);
                      const bgColor = event.team?.color ?? "#6b7280";
                      const teamName = event.team?.name ?? "Club Event";
                      const locationLabel = event.subFacility
                        ? `${event.subFacility.facility.name} – ${event.subFacility.name}`
                        : event.customLocation ?? "";
                      return (
                        <button
                          key={event.id}
                          className="w-full px-3 md:px-4 py-2 md:py-2.5 text-left active:bg-accent/40 md:hover:bg-accent/30 transition-colors"
                          onClick={(e) => handleEventClick(event, e)}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: bgColor }}
                            />
                            <span className="text-sm font-medium truncate flex-1">
                              {event.title}
                            </span>
                            <Badge variant="secondary" className="text-[10px] shrink-0 px-1.5 py-0">
                              {typeLabel}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 ml-[18px] text-[11px] md:text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 shrink-0" />
                              {format(start, "h:mm a")} – {format(end, "h:mm a")}
                            </span>
                            <span className="truncate">{teamName}</span>
                            {locationLabel && (
                              <span className="truncate hidden sm:flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {locationLabel}
                              </span>
                            )}
                          </div>
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

        {/* Loading overlay */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center">
            <CalendarDays className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground/40" />
            <h3 className="mt-3 text-base md:text-lg font-medium">No events scheduled</h3>
            <p className="mt-1 text-xs md:text-sm text-muted-foreground max-w-sm">
              {canManage
                ? "Tap + to schedule your first event."
                : "No events found for the selected filters."}
            </p>
            {canManage && (
              <Button
                size="sm"
                className="mt-3"
                onClick={() => { setCreateDate(new Date()); setShowCreateForm(true); }}
              >
                <Plus className="mr-1 h-4 w-4" />
                New Event
              </Button>
            )}
          </div>
        )}
      </div>

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
          userTeams={userTeams}
          fixedTeamId={lockedTeamId}
        />
      )}

      {/* Event detail modal */}
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
