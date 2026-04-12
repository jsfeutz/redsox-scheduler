"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format, parseISO, getDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ConflictDialog, type ConflictData } from "./conflict-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Plus, Minus, X, ChevronDown, ChevronsUpDown } from "lucide-react";

/** Default new/edit times: 6:00 PM start, 1h 45m duration (7:45 PM end). */
const DEFAULT_EVENT_START = "18:00";
const DEFAULT_DURATION_MINUTES = 105; // 1 hr 45 min

const DURATION_PRESETS = [
  { key: "45", label: "45 min", minutes: 45 },
  { key: "60", label: "1 hr", minutes: 60 },
  { key: "90", label: "1:30", minutes: 90 },
  { key: "105", label: "1:45", minutes: 105 },
  { key: "120", label: "2:00", minutes: 120 },
] as const;

type DurationPresetKey = (typeof DURATION_PRESETS)[number]["key"];

function addMinutesToTimeString(hhmm: string, minutesToAdd: number): string {
  const parts = hhmm.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  let total = h * 60 + m + minutesToAdd;
  total = Math.min(total, 23 * 60 + 59);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function detectDurationPreset(
  start: string,
  end: string
): DurationPresetKey | null {
  const [sh, sm] = start.split(":").map((x) => parseInt(x, 10));
  const [eh, em] = end.split(":").map((x) => parseInt(x, 10));
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  const diff = eh * 60 + em - (sh * 60 + sm);
  if (diff <= 0) return null;
  for (const p of DURATION_PRESETS) {
    if (p.minutes === diff) return p.key;
  }
  return null;
}

interface JobTemplateOption {
  id: string;
  name: string;
  maxSlots: number;
}

const DAYS_OF_WEEK = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
] as const;

const eventObjectSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["GAME", "PRACTICE", "OTHER", "CLUB_EVENT", "BLACKOUT"]),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  allDay: z.boolean().optional(),
  teamId: z.string().optional(),
  subFacilityId: z.string().optional(),
  seasonId: z.string().optional(),
  notes: z.string().optional(),
  customLocation: z.string().optional(),
  customLocationUrl: z.string().optional(),
  useCustomLocation: z.boolean().optional(),
  gameVenue: z.enum(["HOME", "AWAY"]).optional(),
  blackoutScope: z.enum(["ORG_WIDE", "FACILITY"]).optional(),
  blackoutEventTypes: z.string().optional(),
  blackoutEndDate: z.string().optional(),
  noJobs: z.boolean().optional(),
  isRecurring: z.boolean(),
  recurrenceFrequency: z.enum(["WEEKLY", "BIWEEKLY"]).optional(),
  recurrenceDays: z.array(z.number()).optional(),
  recurrenceUntil: z.string().optional(),
});

function createEventSchema(fixedTeamId?: string) {
  return eventObjectSchema
    .refine(
      (data) => {
        if (data.type === "BLACKOUT" || data.type === "CLUB_EVENT") return true;
        const tid =
          (data.teamId && data.teamId.trim()) ||
          (fixedTeamId && fixedTeamId.trim()) ||
          "";
        return !!tid;
      },
      { message: "Team is required", path: ["teamId"] }
    )
    .refine(
      (data) => {
        if (data.type === "BLACKOUT" || data.type === "CLUB_EVENT") return true;
        if (data.type === "GAME" && data.gameVenue === "AWAY") return true;
        if (data.useCustomLocation) return true;
        return !!data.subFacilityId;
      },
      { message: "Please select a facility for this home game", path: ["subFacilityId"] }
    )
    .refine(
      (data) => {
        if (data.allDay) return true;
        return !!data.startTime && !!data.endTime;
      },
      { message: "Start and end time are required", path: ["startTime"] }
    );
}

type EventFormValues = z.infer<typeof eventObjectSchema>;

interface Team {
  id: string;
  name: string;
  color: string;
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

interface EventData {
  id: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  teamId: string | null;
  subFacilityId: string | null;
  seasonId: string | null;
  customLocation?: string | null;
  customLocationUrl?: string | null;
  gameVenue?: string | null;
  noJobs?: boolean;
  taggedTeams?: { team: { id: string; name: string; color: string } }[];
}

interface EventFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  teams: Team[];
  facilities: Facility[];
  seasons: Season[];
  canBump: boolean;
  isAdmin?: boolean;
  event?: EventData;
  defaultDate?: Date;
  fixedTeamId?: string;
  userTeams?: Team[];
}

export function EventForm({
  open,
  onClose,
  onSaved,
  teams,
  facilities,
  seasons,
  canBump,
  isAdmin = false,
  event,
  defaultDate,
  fixedTeamId,
  userTeams = [],
}: EventFormProps) {
  const eventSchemaResolved = useMemo(
    () => createEventSchema(fixedTeamId),
    [fixedTeamId]
  );
  const [loading, setLoading] = useState(false);
  const [conflict, setConflict] = useState<ConflictData | null>(null);
  const [forceLoading, setForceLoading] = useState(false);

  const currentSeasonId = useMemo(() => {
    if (event?.seasonId) return event.seasonId;
    const now = new Date();
    const current = seasons.find(
      (s) => new Date(s.startDate) <= now && new Date(s.endDate) >= now
    );
    return current?.id ?? seasons[0]?.id ?? "";
  }, [seasons, event?.seasonId]);

  const [selectedTeamId, setSelectedTeamId] = useState(fixedTeamId || event?.teamId || "");
  const [selectedSubFacilityId, setSelectedSubFacilityId] = useState(
    event?.subFacilityId ?? ""
  );
  const isTeamContext = !!fixedTeamId;
  const hasTeams = isAdmin || userTeams.length > 0 || teams.length > 0;
  const defaultType = isTeamContext
    ? (event?.type ?? "GAME")
    : (event?.type ?? (hasTeams ? "GAME" : "CLUB_EVENT"));
  const [selectedType, setSelectedType] = useState(defaultType);
  const [useCustomLocation, setUseCustomLocation] = useState(
    !!(event?.type === "CLUB_EVENT" && event?.customLocation && !event?.subFacilityId)
  );
  const [gameVenue, setGameVenue] = useState<"HOME" | "AWAY">(
    (event?.gameVenue as "HOME" | "AWAY") || "HOME"
  );
  const [allDay, setAllDay] = useState(false);
  const [noJobs, setNoJobs] = useState(event?.noJobs ?? false);
  const [isRecurring, setIsRecurring] = useState(event?.isRecurring ?? false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<"WEEKLY" | "BIWEEKLY">("WEEKLY");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceUntil, setRecurrenceUntil] = useState("");

  const [jobTemplates, setJobTemplates] = useState<JobTemplateOption[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Map<string, number>>(new Map());
  const [jobsLoading, setJobsLoading] = useState(false);
  const [taggedTeamIds, setTaggedTeamIds] = useState<string[]>([]);
  const [durationPreset, setDurationPreset] = useState<DurationPresetKey | null>(
    "105"
  );

  const showJobPicker = !event && selectedType === "CLUB_EVENT" && !noJobs;

  useEffect(() => {
    if (!showJobPicker) return;
    if (jobTemplates.length > 0) return;
    setJobsLoading(true);
    fetch("/api/jobs/templates")
      .then((r) => r.json())
      .then((data: { id: string; name: string; scope: string; maxSlots: number; active: boolean }[]) => {
        const facility = data.filter((t) => t.active && t.scope === "FACILITY");
        setJobTemplates(facility);
      })
      .catch(() => {})
      .finally(() => setJobsLoading(false));
  }, [showJobPicker, jobTemplates.length]);

  const defaultDateStr = defaultDate
    ? format(defaultDate, "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchemaResolved),
    defaultValues: {
      title: event?.title ?? "",
      type: (event?.type as "GAME" | "PRACTICE" | "OTHER" | "CLUB_EVENT" | "BLACKOUT") ?? defaultType,
      date: event
        ? format(parseISO(event.startTime), "yyyy-MM-dd")
        : defaultDateStr,
      startTime: event
        ? format(parseISO(event.startTime), "HH:mm")
        : DEFAULT_EVENT_START,
      endTime: event
        ? format(parseISO(event.endTime), "HH:mm")
        : addMinutesToTimeString(DEFAULT_EVENT_START, DEFAULT_DURATION_MINUTES),
      allDay: false,
      teamId: fixedTeamId || event?.teamId || "",
      subFacilityId: event?.subFacilityId ?? "",
      seasonId: currentSeasonId,
      notes: event?.notes ?? "",
      customLocation: event?.customLocation ?? "",
      customLocationUrl: event?.customLocationUrl ?? "",
      useCustomLocation: !!(event?.type === "CLUB_EVENT" && event?.customLocation && !event?.subFacilityId),
      gameVenue: (event?.gameVenue as "HOME" | "AWAY") || "HOME",
      noJobs: event?.noJobs ?? false,
      blackoutScope: "ORG_WIDE",
      blackoutEventTypes: "ALL",
      blackoutEndDate: "",
      isRecurring: event?.isRecurring ?? false,
      recurrenceFrequency: "WEEKLY",
      recurrenceDays: [],
      recurrenceUntil: "",
    },
  });

  useEffect(() => {
    if (open) {
      const dateStr = event
        ? format(parseISO(event.startTime), "yyyy-MM-dd")
        : defaultDateStr;

      const dayOfWeek = getDay(dateStr ? new Date(dateStr + "T12:00:00") : new Date());
      const startStr = event
        ? format(parseISO(event.startTime), "HH:mm")
        : DEFAULT_EVENT_START;
      const endStr = event
        ? format(parseISO(event.endTime), "HH:mm")
        : addMinutesToTimeString(startStr, DEFAULT_DURATION_MINUTES);

      setDurationPreset(event ? detectDurationPreset(startStr, endStr) : "105");

      reset({
        title: event?.title ?? "",
        type: (event?.type as "GAME" | "PRACTICE" | "OTHER" | "CLUB_EVENT" | "BLACKOUT") ?? defaultType,
        date: dateStr,
        startTime: startStr,
        endTime: endStr,
        allDay: false,
        teamId: fixedTeamId || event?.teamId || "",
        subFacilityId: event?.subFacilityId ?? "",
        seasonId: currentSeasonId,
        notes: event?.notes ?? "",
        customLocation: event?.customLocation ?? "",
        customLocationUrl: event?.customLocationUrl ?? "",
        useCustomLocation: !!(event?.type === "CLUB_EVENT" && event?.customLocation && !event?.subFacilityId),
        gameVenue: (event?.gameVenue as "HOME" | "AWAY") || "HOME",
        noJobs: event?.noJobs ?? false,
        blackoutScope: "ORG_WIDE",
        blackoutEventTypes: "ALL",
        blackoutEndDate: "",
        isRecurring: event?.isRecurring ?? false,
        recurrenceFrequency: "WEEKLY",
        recurrenceDays: [dayOfWeek],
        recurrenceUntil: "",
      });
      setSelectedTeamId(fixedTeamId || event?.teamId || "");
      setSelectedSubFacilityId(event?.subFacilityId ?? "");
      setSelectedType(event?.type ?? defaultType);
      setUseCustomLocation(!!(event?.type === "CLUB_EVENT" && event?.customLocation && !event?.subFacilityId));
      setGameVenue((event?.gameVenue as "HOME" | "AWAY") || "HOME");
      setAllDay(false);
      setNoJobs(event?.noJobs ?? false);
      setIsRecurring(event?.isRecurring ?? false);
      setRecurrenceFrequency("WEEKLY");
      setRecurrenceDays([dayOfWeek]);
      setRecurrenceUntil("");
      setSelectedJobs(new Map());
      setTaggedTeamIds(
        event?.taggedTeams?.map((l) => l.team.id).filter(Boolean) ?? []
      );
      setConflict(null);
    }
  }, [open, event, defaultDateStr, reset, currentSeasonId, fixedTeamId, defaultType]);

  const primaryForTagDedupe = (fixedTeamId?.trim() || selectedTeamId?.trim()) ?? "";
  useEffect(() => {
    if (!primaryForTagDedupe) return;
    setTaggedTeamIds((prev) => prev.filter((id) => id !== primaryForTagDedupe));
  }, [primaryForTagDedupe]);

  function applyDurationPreset(preset: DurationPresetKey) {
    setAllDay(false);
    setValue("allDay", false);
    setDurationPreset(preset);
    const def = DURATION_PRESETS.find((p) => p.key === preset);
    if (!def) return;
    const start = getValues("startTime") || DEFAULT_EVENT_START;
    setValue("endTime", addMinutesToTimeString(start, def.minutes));
  }

  function applyAllDayNonBlackout() {
    setAllDay(true);
    setValue("allDay", true);
    setDurationPreset(null);
  }

  async function submitEvent(data: EventFormValues, force = false) {
    if (data.type === "BLACKOUT") {
      const startDate = data.allDay
        ? data.date
        : `${data.date}T${data.startTime || "00:00"}:00`;
      const endDateStr = data.blackoutEndDate || data.date;
      const endDate = data.allDay
        ? endDateStr
        : `${endDateStr}T${data.endTime || "23:59"}:00`;

      const res = await fetch("/api/blackout-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          startDate,
          endDate,
          scope: data.blackoutScope || "ORG_WIDE",
          facilityId: data.blackoutScope === "FACILITY" ? data.subFacilityId || null : null,
          eventTypes: data.blackoutEventTypes || "ALL",
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to create blackout");
      }
      return true;
    }

    const startDateTime = data.allDay
      ? new Date(`${data.date}T00:00:00`)
      : new Date(`${data.date}T${data.startTime}:00`);
    const endDateTime = data.allDay
      ? new Date(`${data.date}T23:59:59`)
      : new Date(`${data.date}T${data.endTime}:00`);

    const isClubEvent = data.type === "CLUB_EVENT";
    const isAwayGame = data.type === "GAME" && data.gameVenue === "AWAY";
    const wantsCustomLocation = (isClubEvent && data.useCustomLocation) || isAwayGame;
    const effectiveTeamId =
      isClubEvent
        ? null
        : (fixedTeamId?.trim() || data.teamId?.trim() || null);
    const payload: Record<string, unknown> = {
      title: data.title,
      type: data.type,
      priority: "NORMAL",
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      notes: data.notes || null,
      isRecurring: data.isRecurring,
      teamId: effectiveTeamId,
      subFacilityId: wantsCustomLocation ? null : (data.subFacilityId || null),
      seasonId: currentSeasonId || null,
      customLocation: wantsCustomLocation ? data.customLocation || null : null,
      customLocationUrl: wantsCustomLocation ? data.customLocationUrl || null : null,
      gameVenue: data.type === "GAME" ? (data.gameVenue || "HOME") : null,
      noJobs: data.noJobs || false,
      force,
    };

    if (!isClubEvent) {
      const primary = effectiveTeamId ?? "";
      payload.taggedTeamIds = taggedTeamIds.filter((id) => id && id !== primary);
    } else {
      payload.taggedTeamIds = [];
    }

    if (selectedJobs.size > 0 && !payload.noJobs) {
      payload.manualJobs = Array.from(selectedJobs.entries()).map(([templateId, slots]) => ({
        jobTemplateId: templateId,
        slotsNeeded: slots,
      }));
    }

    if (data.isRecurring) {
      payload.recurrenceFrequency = recurrenceFrequency;
      payload.recurrenceDays = recurrenceDays;
      payload.recurrenceUntil = recurrenceUntil || null;
    }

    const url = event ? `/api/schedules/${event.id}` : "/api/schedules";
    const method = event ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 409) {
      const body = await res.json();
      setConflict(body.conflict);
      return false;
    }

    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error || "Something went wrong");
    }

    return true;
  }

  async function onSubmit(data: EventFormValues) {
    setLoading(true);
    try {
      const success = await submitEvent(data);
      if (success) {
        if (data.type === "BLACKOUT") {
          toast.success("Blackout date created");
        } else if (data.isRecurring && !event) {
          toast.success("Recurring events created");
        } else {
          toast.success(event ? "Event updated" : "Event created");
        }
        onSaved();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleForceOverride() {
    setForceLoading(true);
    try {
      const data = getValues();
      const success = await submitEvent(data, true);
      if (success) {
        toast.success(
          event
            ? "Event updated (conflict overridden)"
            : "Event created (conflict overridden)"
        );
        setConflict(null);
        onSaved();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to override");
    } finally {
      setForceLoading(false);
    }
  }

  return (
    <>
      <Dialog open={open && !conflict} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{event ? "Edit Event" : "New Event"}</DialogTitle>
            <DialogDescription>
              {event
                ? "Update the event details below."
                : "Fill in the details to schedule a new event."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                placeholder="e.g. Thunder vs. Lightning"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={selectedType}
                onValueChange={(v) => {
                  if (!v) return;
                  setSelectedType(v);
                  setValue("type", v as "GAME" | "PRACTICE" | "OTHER" | "CLUB_EVENT" | "BLACKOUT");
                  if (v === "CLUB_EVENT") {
                    setValue("teamId", "");
                    setSelectedTeamId("");
                  }
                  if (v === "BLACKOUT") {
                    setValue("teamId", "");
                    setSelectedTeamId("");
                    setValue("subFacilityId", "");
                    setSelectedSubFacilityId("");
                    setAllDay(true);
                    setValue("allDay", true);
                    setDurationPreset(null);
                  } else {
                    setAllDay(false);
                    setValue("allDay", false);
                    const st = getValues("startTime") || DEFAULT_EVENT_START;
                    const en =
                      getValues("endTime") ||
                      addMinutesToTimeString(st, DEFAULT_DURATION_MINUTES);
                    setDurationPreset(detectDurationPreset(st, en) ?? "105");
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isTeamContext ? (
                    <>
                      <SelectItem value="GAME">Game</SelectItem>
                      <SelectItem value="PRACTICE">Practice</SelectItem>
                    </>
                  ) : (
                    <>
                      {hasTeams && <SelectItem value="GAME">Game</SelectItem>}
                      {hasTeams && <SelectItem value="PRACTICE">Practice</SelectItem>}
                      {isAdmin && <SelectItem value="CLUB_EVENT">Club Event</SelectItem>}
                      {isAdmin && <SelectItem value="BLACKOUT">Blackout Date</SelectItem>}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedType === "GAME" && (
              <div className="grid gap-2">
                <Label>Venue</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      gameVenue === "HOME"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:bg-accent/50"
                    )}
                    onClick={() => {
                      setGameVenue("HOME");
                      setValue("gameVenue", "HOME");
                      setValue("customLocation", "");
                      setValue("customLocationUrl", "");
                    }}
                  >
                    Home Game
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      gameVenue === "AWAY"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:bg-accent/50"
                    )}
                    onClick={() => {
                      setGameVenue("AWAY");
                      setValue("gameVenue", "AWAY");
                      setSelectedSubFacilityId("");
                      setValue("subFacilityId", "");
                    }}
                  >
                    Away Game
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Date</Label>
              <DatePicker
                value={watch("date")}
                onChange={(v) => setValue("date", v)}
                placeholder="Pick a date"
              />
              {errors.date && (
                <p className="text-xs text-destructive">
                  {errors.date.message}
                </p>
              )}
            </div>

            {selectedType === "BLACKOUT" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="event-allday"
                  checked={allDay}
                  onCheckedChange={(checked) => {
                    const val = !!checked;
                    setAllDay(val);
                    setValue("allDay", val);
                    if (val) setDurationPreset(null);
                  }}
                />
                <Label htmlFor="event-allday" className="text-sm font-normal">
                  All day
                </Label>
              </div>
            )}

            {selectedType !== "BLACKOUT" && allDay && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5">
                <span className="text-sm font-medium">All day</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setAllDay(false);
                    setValue("allDay", false);
                    const start = getValues("startTime") || DEFAULT_EVENT_START;
                    const end = getValues("endTime") || addMinutesToTimeString(start, DEFAULT_DURATION_MINUTES);
                    setDurationPreset(detectDurationPreset(start, end) ?? "105");
                  }}
                >
                  Use start &amp; end times
                </Button>
              </div>
            )}

            {!allDay && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Start Time</Label>
                    <TimePicker
                      value={watch("startTime") ?? ""}
                      onChange={(v) => {
                        setValue("startTime", v);
                        if (durationPreset) {
                          const def = DURATION_PRESETS.find(
                            (p) => p.key === durationPreset
                          );
                          if (def) {
                            setValue(
                              "endTime",
                              addMinutesToTimeString(v, def.minutes)
                            );
                          }
                        }
                      }}
                      placeholder="Start time"
                    />
                    {errors.startTime && (
                      <p className="text-xs text-destructive">
                        {errors.startTime.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label>End Time</Label>
                    <TimePicker
                      value={watch("endTime") ?? ""}
                      onChange={(v) => {
                        setValue("endTime", v);
                        const start =
                          getValues("startTime") || DEFAULT_EVENT_START;
                        setDurationPreset(detectDurationPreset(start, v));
                      }}
                      placeholder="End time"
                    />
                    {errors.endTime && (
                      <p className="text-xs text-destructive">
                        {errors.endTime.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground font-normal">
                    Event length
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DURATION_PRESETS.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => applyDurationPreset(p.key)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                          durationPreset === p.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                    {selectedType !== "BLACKOUT" && (
                      <button
                        type="button"
                        onClick={applyAllDayNonBlackout}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                          "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        All day
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedType === "BLACKOUT" ? (
              <div className="rounded-xl border border-border/50 p-4 space-y-4 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Blackout Settings
                </p>
                <div className="grid gap-2">
                  <Label>End Date</Label>
                  <DatePicker
                    value={watch("blackoutEndDate") ?? ""}
                    onChange={(v) => setValue("blackoutEndDate", v)}
                    placeholder="Same as start date if blank"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Leave blank for a single-day blackout.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Scope</Label>
                  <Select
                    value={watch("blackoutScope") ?? "ORG_WIDE"}
                    onValueChange={(v) => setValue("blackoutScope", (v ?? "ORG_WIDE") as "ORG_WIDE" | "FACILITY")}
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
                {watch("blackoutScope") === "FACILITY" && (
                  <div className="grid gap-2">
                    <Label>Facility</Label>
                    <Select
                      value={selectedSubFacilityId || "__none__"}
                      onValueChange={(v) => {
                        const val = !v || v === "__none__" ? "" : v;
                        setSelectedSubFacilityId(val);
                        setValue("subFacilityId", val);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        {(() => {
                          for (const f of facilities) {
                            const sf = f.subFacilities.find((s) => s.id === selectedSubFacilityId);
                            if (sf) return <span>{f.name} &ndash; {sf.name}</span>;
                          }
                          return <span className="text-muted-foreground">Select facility</span>;
                        })()}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Select facility</SelectItem>
                        {facilities.map((f) => (
                          <SelectGroup key={f.id}>
                            <SelectLabel>{f.name}</SelectLabel>
                            {f.subFacilities.map((sf) => (
                              <SelectItem key={sf.id} value={sf.id}>
                                {sf.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label>Affected Event Types</Label>
                  <Select
                    value={watch("blackoutEventTypes") ?? "ALL"}
                    onValueChange={(v) => setValue("blackoutEventTypes", v ?? "ALL")}
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
            ) : (
              <>
                {selectedType !== "CLUB_EVENT" && !fixedTeamId && (
                  <TeamSearchableSelect
                    teams={teams}
                    value={selectedTeamId}
                    onChange={(id) => {
                      setSelectedTeamId(id);
                      setValue("teamId", id);
                    }}
                    error={errors.teamId?.message}
                  />
                )}

                {selectedType !== "CLUB_EVENT" &&
                  selectedType !== "BLACKOUT" &&
                  (fixedTeamId || selectedTeamId) &&
                  teams.filter((t) => t.id !== (fixedTeamId || selectedTeamId)).length >
                    0 && (
                    <TaggedTeamsMultiPicker
                      teams={teams.filter(
                        (t) => t.id !== (fixedTeamId || selectedTeamId)
                      )}
                      selectedIds={taggedTeamIds}
                      onChange={setTaggedTeamIds}
                    />
                  )}

                {selectedType === "CLUB_EVENT" && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="use-custom-location"
                      checked={useCustomLocation}
                      onCheckedChange={(checked) => {
                        const val = !!checked;
                        setUseCustomLocation(val);
                        setValue("useCustomLocation", val);
                        if (val) {
                          setSelectedSubFacilityId("");
                          setValue("subFacilityId", "");
                        } else {
                          setValue("customLocation", "");
                          setValue("customLocationUrl", "");
                        }
                      }}
                    />
                    <Label htmlFor="use-custom-location" className="text-sm font-normal">
                      Use custom location instead of facility
                    </Label>
                  </div>
                )}

                {(selectedType === "CLUB_EVENT" && useCustomLocation) || (selectedType === "GAME" && gameVenue === "AWAY") ? (
                  <div className="rounded-xl border border-border/50 p-4 space-y-4 bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {selectedType === "GAME" ? "Away Game Location" : "Custom Location"}
                    </p>
                    <div className="grid gap-2">
                      <Label htmlFor="custom-location">Location Name / Address</Label>
                      <Input
                        id="custom-location"
                        placeholder="e.g. City Hall, 123 Main St"
                        {...register("customLocation")}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="custom-location-url">Google Maps Link</Label>
                      <Input
                        id="custom-location-url"
                        placeholder="https://maps.google.com/..."
                        type="url"
                        {...register("customLocationUrl")}
                      />
                    </div>
                  </div>
                ) : selectedType !== "BLACKOUT" && (
                  <div className="grid gap-2">
                    <Label>Facility</Label>
                    <Select
                      value={selectedSubFacilityId || ""}
                      onValueChange={(v) => {
                        if (!v) return;
                        setSelectedSubFacilityId(v);
                        setValue("subFacilityId", v);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        {(() => {
                          for (const f of facilities) {
                            const sf = f.subFacilities.find((s) => s.id === selectedSubFacilityId);
                            if (sf) return <span>{f.name} &ndash; {sf.name}</span>;
                          }
                          return <span className="text-muted-foreground">Select a facility</span>;
                        })()}
                      </SelectTrigger>
                      <SelectContent>
                        {facilities.map((f) => (
                          <SelectGroup key={f.id}>
                            <SelectLabel>{f.name}</SelectLabel>
                            {f.subFacilities.map((sf) => (
                              <SelectItem key={sf.id} value={sf.id}>
                                {sf.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.subFacilityId && (
                      <p className="text-xs text-destructive">
                        {errors.subFacilityId.message}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Season is auto-selected to current season */}

            {selectedType !== "BLACKOUT" && !(selectedType === "GAME" && gameVenue === "AWAY") && (
              <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                <div>
                  <Label htmlFor="noJobs" className="text-sm font-medium">
                    No volunteers needed
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Skip volunteer job creation for this event
                  </p>
                </div>
                <Switch
                  id="noJobs"
                  checked={noJobs}
                  onCheckedChange={(checked) => {
                    setNoJobs(!!checked);
                    setValue("noJobs", !!checked);
                  }}
                />
              </div>
            )}

            {showJobPicker && (
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Volunteer Jobs</Label>
                <JobPicker
                  templates={jobTemplates}
                  loading={jobsLoading}
                  selectedJobs={selectedJobs}
                  onToggle={(id, maxSlots) => {
                    setSelectedJobs((prev) => {
                      const next = new Map(prev);
                      if (next.has(id)) next.delete(id);
                      else next.set(id, maxSlots);
                      return next;
                    });
                  }}
                  onSlotsChange={(id, slots) => {
                    setSelectedJobs((prev) => {
                      const next = new Map(prev);
                      next.set(id, slots);
                      return next;
                    });
                  }}
                />
              </div>
            )}

            {selectedType !== "BLACKOUT" && (
              <div className="grid gap-2">
                <Label htmlFor="event-notes">Notes</Label>
                <Textarea
                  id="event-notes"
                  placeholder="Optional notes..."
                  {...register("notes")}
                />
              </div>
            )}

            {selectedType !== "BLACKOUT" && (
            <>
            <div className="flex items-center gap-2">
              <Checkbox
                id="event-recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => {
                  const val = !!checked;
                  setIsRecurring(val);
                  setValue("isRecurring", val);
                  if (val && recurrenceDays.length === 0) {
                    const dateVal = getValues("date");
                    if (dateVal) {
                      const dow = getDay(new Date(dateVal + "T12:00:00"));
                      setRecurrenceDays([dow]);
                    }
                  }
                }}
              />
              <Label htmlFor="event-recurring" className="text-sm font-normal">
                Recurring event
              </Label>
            </div>

            {isRecurring && (
              <div className="rounded-xl border border-border/50 p-4 space-y-4 bg-muted/30">
                <div className="grid gap-2">
                  <Label>Frequency</Label>
                  <Select
                    value={recurrenceFrequency}
                    onValueChange={(v) => {
                      if (!v) return;
                      setRecurrenceFrequency(v as "WEEKLY" | "BIWEEKLY");
                    }}
                    items={{ WEEKLY: "Weekly", BIWEEKLY: "Every 2 weeks" }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="BIWEEKLY">Every 2 weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map((d) => {
                      const active = recurrenceDays.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => {
                            setRecurrenceDays((prev) =>
                              active
                                ? prev.filter((v) => v !== d.value)
                                : [...prev, d.value]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Repeat until</Label>
                  <DatePicker
                    value={recurrenceUntil}
                    onChange={(v) => setRecurrenceUntil(v)}
                    placeholder="End date (optional)"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Leave empty to default to 6 months from now.
                  </p>
                </div>

                {recurrenceDays.length > 0 && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                    {recurrenceFrequency === "WEEKLY" ? "Every" : "Every other"}{" "}
                    {recurrenceDays
                      .sort((a, b) => a - b)
                      .map((d) => DAYS_OF_WEEK.find((dw) => dw.value === d)?.label)
                      .join(", ")}
                    {recurrenceUntil
                      ? ` until ${format(new Date(recurrenceUntil + "T12:00:00"), "MMM d, yyyy")}`
                      : " (until season end)"}
                  </p>
                )}
              </div>
            )}
            </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : selectedType === "BLACKOUT"
                    ? "Create Blackout"
                    : event
                      ? "Save Changes"
                      : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {conflict && (
        <ConflictDialog
          open={!!conflict}
          onClose={() => setConflict(null)}
          conflict={conflict}
          onForceOverride={handleForceOverride}
          canBump={canBump}
          loading={forceLoading}
        />
      )}
    </>
  );
}

function TeamSearchableSelect({
  teams,
  value,
  onChange,
  error,
}: {
  teams: Team[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuKey, setMenuKey] = useState(0);

  const selected = teams.find((t) => t.id === value);

  const options = useMemo(
    () => [
      {
        id: "__none__",
        name: "Select a team",
        color: "",
        keywords: "none clear select team",
      },
      ...teams.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        keywords: t.name.toLowerCase(),
      })),
    ],
    [teams]
  );

  return (
    <div className="grid gap-2">
      <Label>Team</Label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setMenuKey((k) => k + 1);
        }}
      >
        <PopoverTrigger
          className={cn(
            "flex w-full min-h-11 items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm",
            "hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "dark:bg-input/30 dark:hover:bg-input/50"
          )}
          aria-expanded={open}
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-1.5 text-left font-normal">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: selected.color }}
              />
              <span className="truncate" title={selected.name}>
                {selected.name}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select a team</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="p-0 w-[min(100vw-1rem,28rem)]"
          sideOffset={4}
        >
          <Command key={menuKey}>
            <CommandInput placeholder="Search teams…" className="h-9" />
            <CommandList>
              <CommandEmpty>No matches.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={`${o.name} ${o.keywords}`}
                    onSelect={() => {
                      onChange(o.id === "__none__" ? "" : o.id);
                      setOpen(false);
                    }}
                    className="items-center gap-2 py-2"
                  >
                    {o.color ? (
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: o.color }}
                      />
                    ) : (
                      <span className="h-2.5 w-2.5 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-left">
                      {o.name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function TaggedTeamsMultiPicker({
  teams,
  selectedIds,
  onChange,
}: {
  teams: Team[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return teams;
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  }, [teams, q]);

  const selectedTeams = useMemo(
    () =>
      selectedIds
        .map((id) => teams.find((t) => t.id === id))
        .filter((t): t is Team => !!t),
    [selectedIds, teams]
  );

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <div className="grid gap-2">
      <Label>Also show for teams</Label>
      <p className="text-xs text-muted-foreground">
        Jobs and volunteer signup lists include this event when filtering by these teams
        (same club). Search and pick teams; the form stays compact.
      </p>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
      >
        <PopoverTrigger
          className={cn(
            "flex w-full min-h-11 items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors",
            "hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            selectedIds.length === 0 && "text-muted-foreground"
          )}
        >
          <span className="truncate text-left">
            {selectedIds.length === 0
              ? "Add teams…"
              : `${selectedIds.length} team${selectedIds.length !== 1 ? "s" : ""} tagged`}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(100vw-1rem,28rem)] p-0"
          sideOffset={4}
        >
          <div className="border-b border-border/50 px-2 py-1.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                {teams.length === 0 ? "No other teams" : "No matches"}
              </p>
            )}
            {filtered.map((t) => {
              const isSelected = selectedIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    isSelected ? "bg-primary/10 text-foreground" : "hover:bg-muted"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    className="pointer-events-none shrink-0"
                  />
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {selectedTeams.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTeams.map((t) => (
            <span
              key={t.id}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/20 bg-primary/5 py-0.5 pl-2 pr-1 text-xs"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: t.color }}
              />
              <span className="truncate font-medium" title={t.name}>
                {t.name}
              </span>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remove ${t.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function JobPicker({
  templates,
  loading,
  selectedJobs,
  onToggle,
  onSlotsChange,
}: {
  templates: JobTemplateOption[];
  loading: boolean;
  selectedJobs: Map<string, number>;
  onToggle: (id: string, maxSlots: number) => void;
  onSlotsChange: (id: string, slots: number) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedCount = selectedJobs.size;

  const filtered = search.trim()
    ? templates.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()))
    : templates;

  return (
    <div className="space-y-2">
      <Popover
        open={popoverOpen}
        onOpenChange={(open) => {
          setPopoverOpen(open);
          if (!open) setSearch("");
        }}
      >
        <PopoverTrigger
          className={cn(
            "flex w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors",
            "hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            selectedCount === 0 && "text-muted-foreground"
          )}
        >
          <span>
            {loading
              ? "Loading..."
              : selectedCount === 0
                ? "Select jobs..."
                : `${selectedCount} job${selectedCount !== 1 ? "s" : ""} selected`}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", popoverOpen && "rotate-180")} />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) p-0">
          <div className="border-b border-border/50 px-2 py-1.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                {templates.length === 0 ? "No job templates available" : "No matches"}
              </p>
            )}
            {filtered.map((t) => {
              const isSelected = selectedJobs.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onToggle(t.id, t.maxSlots)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors text-left",
                    isSelected ? "bg-primary/10 text-foreground" : "hover:bg-muted"
                  )}
                >
                  <Checkbox checked={isSelected} className="pointer-events-none shrink-0" />
                  <span className="truncate">{t.name}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {selectedCount > 0 && (
        <div className="space-y-1.5">
          {Array.from(selectedJobs.entries()).map(([id, slots]) => {
            const t = templates.find((t) => t.id === id);
            if (!t) return null;
            return (
              <div
                key={id}
                className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{t.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => { if (slots > 1) onSlotsChange(id, slots - 1); }}
                    disabled={slots <= 1}
                    className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-medium tabular-nums w-4 text-center">{slots}</span>
                  <button
                    type="button"
                    onClick={() => onSlotsChange(id, slots + 1)}
                    className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggle(id, t.maxSlots)}
                    className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
