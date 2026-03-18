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
import { cn } from "@/lib/utils";
import { ConflictDialog, type ConflictData } from "./conflict-dialog";

const DAYS_OF_WEEK = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
] as const;

const eventSchema = z.object({
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
  isRecurring: z.boolean(),
  recurrenceFrequency: z.enum(["WEEKLY", "BIWEEKLY"]).optional(),
  recurrenceDays: z.array(z.number()).optional(),
  recurrenceUntil: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === "BLACKOUT" || data.type === "CLUB_EVENT") return true;
    if (data.type === "GAME" && data.gameVenue === "AWAY") return !!data.teamId;
    return !!data.teamId && !!data.subFacilityId;
  },
  { message: "Team and facility are required", path: ["teamId"] }
).refine(
  (data) => {
    if (data.allDay) return true;
    return !!data.startTime && !!data.endTime;
  },
  { message: "Start and end time are required", path: ["startTime"] }
);

type EventFormValues = z.infer<typeof eventSchema>;

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
}: EventFormProps) {
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
  const defaultType = isTeamContext ? (event?.type ?? "GAME") : (event?.type ?? "CLUB_EVENT");
  const [selectedType, setSelectedType] = useState(defaultType);
  const [useCustomLocation, setUseCustomLocation] = useState(
    !!(event?.type === "CLUB_EVENT" && event?.customLocation && !event?.subFacilityId)
  );
  const [gameVenue, setGameVenue] = useState<"HOME" | "AWAY">(
    (event?.gameVenue as "HOME" | "AWAY") || "HOME"
  );
  const [allDay, setAllDay] = useState(false);
  const [isRecurring, setIsRecurring] = useState(event?.isRecurring ?? false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<"WEEKLY" | "BIWEEKLY">("WEEKLY");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceUntil, setRecurrenceUntil] = useState("");

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
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event?.title ?? "",
      type: (event?.type as "GAME" | "PRACTICE" | "OTHER" | "CLUB_EVENT" | "BLACKOUT") ?? defaultType,
      date: event
        ? format(parseISO(event.startTime), "yyyy-MM-dd")
        : defaultDateStr,
      startTime: event ? format(parseISO(event.startTime), "HH:mm") : "09:00",
      endTime: event ? format(parseISO(event.endTime), "HH:mm") : "10:00",
      allDay: false,
      teamId: fixedTeamId || event?.teamId || "",
      subFacilityId: event?.subFacilityId ?? "",
      seasonId: currentSeasonId,
      notes: event?.notes ?? "",
      customLocation: event?.customLocation ?? "",
      customLocationUrl: event?.customLocationUrl ?? "",
      useCustomLocation: !!(event?.type === "CLUB_EVENT" && event?.customLocation && !event?.subFacilityId),
      gameVenue: (event?.gameVenue as "HOME" | "AWAY") || "HOME",
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
      reset({
        title: event?.title ?? "",
        type: (event?.type as "GAME" | "PRACTICE" | "OTHER" | "CLUB_EVENT" | "BLACKOUT") ?? defaultType,
        date: dateStr,
        startTime: event
          ? format(parseISO(event.startTime), "HH:mm")
          : "09:00",
        endTime: event ? format(parseISO(event.endTime), "HH:mm") : "10:00",
        allDay: false,
        teamId: fixedTeamId || event?.teamId || "",
        subFacilityId: event?.subFacilityId ?? "",
        seasonId: currentSeasonId,
        notes: event?.notes ?? "",
        customLocation: event?.customLocation ?? "",
        customLocationUrl: event?.customLocationUrl ?? "",
        useCustomLocation: !!(event?.type === "CLUB_EVENT" && event?.customLocation && !event?.subFacilityId),
        gameVenue: (event?.gameVenue as "HOME" | "AWAY") || "HOME",
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
      setIsRecurring(event?.isRecurring ?? false);
      setRecurrenceFrequency("WEEKLY");
      setRecurrenceDays([dayOfWeek]);
      setRecurrenceUntil("");
      setConflict(null);
    }
  }, [open, event, defaultDateStr, reset]);

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
    const payload: Record<string, unknown> = {
      title: data.title,
      type: data.type,
      priority: "NORMAL",
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      notes: data.notes || null,
      isRecurring: data.isRecurring,
      teamId: isClubEvent ? null : data.teamId,
      subFacilityId: wantsCustomLocation ? null : (data.subFacilityId || null),
      seasonId: currentSeasonId || null,
      customLocation: wantsCustomLocation ? data.customLocation || null : null,
      customLocationUrl: wantsCustomLocation ? data.customLocationUrl || null : null,
      gameVenue: data.type === "GAME" ? (data.gameVenue || "HOME") : null,
      force,
    };

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
                  } else {
                    setAllDay(false);
                    setValue("allDay", false);
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
                  }}
                />
                <Label htmlFor="event-allday" className="text-sm font-normal">
                  All day
                </Label>
              </div>
            )}

            {!allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Start Time</Label>
                  <TimePicker
                    value={watch("startTime") ?? ""}
                    onChange={(v) => setValue("startTime", v)}
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
                    onChange={(v) => setValue("endTime", v)}
                    placeholder="End time"
                  />
                  {errors.endTime && (
                    <p className="text-xs text-destructive">
                      {errors.endTime.message}
                    </p>
                  )}
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
                  <div className="grid gap-2">
                    <Label>Team</Label>
                    <Select
                      value={selectedTeamId || "__none__"}
                      onValueChange={(v) => {
                        const val = !v || v === "__none__" ? "" : v;
                        setSelectedTeamId(val);
                        setValue("teamId", val);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        {(() => {
                          const team = teams.find((t) => t.id === selectedTeamId);
                          return team ? (
                            <span className="flex items-center gap-1.5">
                              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: team.color }} />
                              {team.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Select a team</span>
                          );
                        })()}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Select a team</SelectItem>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full mr-1.5"
                              style={{ backgroundColor: t.color }}
                            />
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.teamId && (
                      <p className="text-xs text-destructive">
                        {errors.teamId.message}
                      </p>
                    )}
                  </div>
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
