"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  Briefcase,
  Users,
  Clock,
  MapPin,
  Globe,
  Lock,
  Info,
  Settings,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  UserPlus,
  X,
  ChevronDown,
  Loader2,
  Save,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { TemplateForm } from "@/components/jobs/template-form";
import { EventForm } from "@/components/schedules/event-form";
import { TeamMembers } from "@/components/teams/team-members";
import { TeamRoster } from "@/components/teams/team-roster";

interface TeamMember {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface Season {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
}

interface TeamInfo {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  ageGroup: string | null;
  active: boolean;
  headCoach: { id: string; name: string; email: string } | null;
  members: TeamMember[];
  seasons: Season[];
}

interface GameJobSummary {
  id: string;
  name: string;
  slotsNeeded: number;
  filled: number;
  isPublic: boolean;
  scope?: string;
  volunteerNames: string[];
}

interface ConflictInfo {
  teamName: string;
  teamColor: string;
  title: string;
  startTime: string;
  endTime: string;
}

interface EventSummary {
  id: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  recurrenceGroupId: string | null;
  facility: string;
  subFacilityId: string | null;
  seasonId: string | null;
  notes: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  conflicts: ConflictInfo[];
  gameJobs: GameJobSummary[];
}

interface SchedulingData {
  teams: { id: string; name: string; color: string }[];
  facilities: { id: string; name: string; subFacilities: { id: string; name: string }[] }[];
  seasons: { id: string; name: string; startDate: string | Date; endDate: string | Date }[];
  canSchedule: boolean;
  canBump: boolean;
}

interface JobTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  hoursPerGame: number;
  forEventType: string;
  active: boolean;
}

interface TeamSpecificTemplate {
  id: string;
  name: string;
  description: string | null;
  hoursPerGame: number;
  forEventType: string;
  active: boolean;
  _count: { gameJobs: number };
}

interface TeamRoleAssignment {
  id: string;
  name: string | null;
  email: string | null;
}

interface TeamRole {
  templateId: string;
  name: string;
  description: string | null;
  hoursPerGame: number;
  forEventType: string;
  maxSlots: number;
  assignments: TeamRoleAssignment[];
}

interface TeamDetailTabsProps {
  team: TeamInfo;
  events: EventSummary[];
  teamRoles: TeamRole[];
  jobTemplates: JobTemplateSummary[];
  teamSpecificTemplates: TeamSpecificTemplate[];
  signupStats?: { totalSlots: number; filledSlots: number };
  canManage: boolean;
  scheduling: SchedulingData;
}

const roleBadge: Record<string, string> = {
  HEAD_COACH: "Head Coach",
  ASSISTANT_COACH: "Assistant",
  TEAM_MANAGER: "Manager",
};

export function TeamDetailTabs({
  team,
  events,
  teamRoles,
  jobTemplates,
  teamSpecificTemplates,
  canManage,
  scheduling,
}: TeamDetailTabsProps) {
  const games = events.filter((e) => e.type === "GAME");
  const practices = events.filter((e) => e.type === "PRACTICE");
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventSummary | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [allEvents, setAllEvents] = useState<EventSummary[]>([]);
  const [allEventsLoading, setAllEventsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!showAllEvents) { setAllEvents([]); return; }
    let cancelled = false;
    async function fetchAll() {
      setAllEventsLoading(true);
      try {
        const now = new Date().toISOString();
        const res = await fetch(`/api/schedules?startDate=${now}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setAllEvents(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.map((e: any) => ({
            id: e.id,
            title: e.title,
            type: e.type,
            startTime: e.startTime,
            endTime: e.endTime,
            recurrenceGroupId: e.recurrenceGroupId,
            facility: e.subFacility ? `${e.subFacility.facility.name} - ${e.subFacility.name}` : e.customLocation ?? "TBD",
            subFacilityId: e.subFacilityId,
            seasonId: e.seasonId,
            notes: e.notes,
            isRecurring: e.isRecurring,
            recurrenceRule: e.recurrenceRule,
            gameVenue: e.gameVenue,
            teamName: e.team?.name,
            teamColor: e.team?.color,
            conflicts: [],
            gameJobs: (e.gameJobs ?? []).map((gj: any) => ({
              id: gj.id,
              name: gj.overrideName ?? gj.jobTemplate?.name ?? "Job",
              slotsNeeded: gj.slotsNeeded,
              filled: gj.assignments?.length ?? 0,
              isPublic: gj.isPublic,
              scope: gj.jobTemplate?.scope ?? "FACILITY",
              volunteerNames: gj.assignments?.map((a: any) => a.name).filter(Boolean) ?? [],
            })),
          }))
        );
      } finally {
        if (!cancelled) setAllEventsLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [showAllEvents]);

  const displayedEvents = showAllEvents
    ? [...events, ...allEvents.filter((e) => e.id && !events.some((te) => te.id === e.id))].sort((a, b) => a.startTime.localeCompare(b.startTime))
    : events;

  function handleEventSaved() {
    setEventFormOpen(false);
    setEditingEvent(null);
    router.refresh();
  }

  function openEdit(evt: EventSummary) {
    setEditingEvent(evt);
    setEventFormOpen(true);
  }

  function openCreate() {
    setEditingEvent(null);
    setEventFormOpen(true);
  }

  async function handleDelete() {
    if (!deletingEvent) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/schedules/${deletingEvent.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Event deleted");
      setDeletingEvent(null);
      router.refresh();
    } catch {
      toast.error("Failed to delete event");
    } finally {
      setDeleteLoading(false);
    }
  }

  const [activeTab, setActiveTab] = useState<string | number | null>("overview");
  const [scheduleFilter, setScheduleFilter] = useState<"all" | "games" | "practices" | "jobs" | "open-jobs">("all");

  const allFacilityJobs = events.flatMap((e) => e.gameJobs.filter((j) => j.scope === "FACILITY"));
  const openJobs = allFacilityJobs.filter((j) => j.filled < j.slotsNeeded);

  function goToSchedule(filter: "all" | "games" | "practices" | "jobs" | "open-jobs") {
    setScheduleFilter(filter);
    setActiveTab("schedule");
  }

  const tabs = [
    { value: "overview", label: "Overview", icon: Info },
    { value: "schedule", label: "Schedule", icon: Calendar },
    { value: "staff", label: "Staff", icon: Users },
    { value: "roster", label: "Roster", icon: Users },
    ...(canManage ? [{ value: "settings", label: "Settings", icon: Settings }] : []),
  ];

  return (
    <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v !== "schedule") setScheduleFilter("all"); }} className="flex-1 min-h-0 flex flex-col md:block gap-0">
      <div className="flex shrink-0 border-b border-border/50 overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 scrollbar-none">
        {tabs.map((tab) => {
          const active = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => { setActiveTab(tab.value); if (tab.value !== "schedule") setScheduleFilter("all"); }}
              className={cn(
                "flex items-center gap-1 md:gap-1.5 px-3 md:px-4 py-2.5 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <TabsContent value="overview" className="overflow-y-auto min-h-0">
        <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-6">
          <button type="button" className="text-left" onClick={() => goToSchedule("games")}>
            <StatCard label="Upcoming Games" value={games.length} clickable />
          </button>
          <button type="button" className="text-left" onClick={() => goToSchedule("practices")}>
            <StatCard label="Practices" value={practices.length} clickable />
          </button>
          <button type="button" className="text-left" onClick={() => goToSchedule("jobs")}>
            <StatCard label="Facility Jobs" value={allFacilityJobs.length} clickable />
          </button>
          <button type="button" className="text-left" onClick={() => goToSchedule("open-jobs")}>
            <StatCard label="Open Jobs" value={openJobs.length} clickable highlight={openJobs.length > 0} />
          </button>
        </div>

        {/* Quick upcoming events preview */}
        {events.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Next Up</h3>
            {events.slice(0, 3).map((evt) => (
              <button
                key={evt.id}
                type="button"
                className="w-full text-left rounded-xl border border-border/50 p-3 hover:bg-accent/30 transition-colors"
                onClick={() => setActiveTab("schedule")}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{evt.title}</span>
                      <Badge variant={evt.type === "GAME" ? "default" : "secondary"} className="rounded text-[10px] shrink-0">
                        {evt.type === "GAME" ? "Game" : "Practice"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(evt.startTime), "EEE, MMM d · h:mm a")}
                      </span>
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {evt.facility}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {events.length > 3 && (
              <button
                type="button"
                className="text-xs text-primary hover:underline font-medium"
                onClick={() => setActiveTab("schedule")}
              >
                View all {events.length} events →
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No upcoming events.</p>
        )}
      </TabsContent>

      <TabsContent value="schedule" className="overflow-y-auto min-h-0">
        <div className="space-y-3 md:space-y-4">
          {/* Filter chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
            {([
              { key: "all", label: "All" },
              { key: "games", label: "Games" },
              { key: "practices", label: "Practices" },
              { key: "jobs", label: "Jobs" },
              { key: "open-jobs", label: "Open Jobs" },
            ] as const).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setScheduleFilter(f.key)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                  scheduleFilter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Switch
                id="show-all-events"
                checked={showAllEvents}
                onCheckedChange={setShowAllEvents}
                className="scale-90"
              />
              <Label htmlFor="show-all-events" className="text-xs font-normal text-muted-foreground cursor-pointer">
                Show all events
              </Label>
              {allEventsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
            {scheduling.canSchedule && (
              <Button
                size="sm"
                className="rounded-xl shadow-md shadow-primary/15 active:scale-95 transition-all"
                onClick={openCreate}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Schedule Event
              </Button>
            )}
          </div>

          {(() => {
            let filtered = displayedEvents;
            if (scheduleFilter === "games") filtered = filtered.filter((e) => e.type === "GAME");
            else if (scheduleFilter === "practices") filtered = filtered.filter((e) => e.type === "PRACTICE");
            else if (scheduleFilter === "jobs") filtered = filtered.filter((e) => e.gameJobs.some((j) => j.scope === "FACILITY"));
            else if (scheduleFilter === "open-jobs") filtered = filtered.filter((e) => e.gameJobs.some((j) => j.scope === "FACILITY" && j.filled < j.slotsNeeded));

            return filtered.length === 0 ? (
            <Card className="rounded-xl border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {scheduleFilter === "all" ? "No upcoming events for this team." :
                   scheduleFilter === "games" ? "No upcoming games." :
                   scheduleFilter === "practices" ? "No upcoming practices." :
                   scheduleFilter === "jobs" ? "No events with facility jobs." :
                   "No open jobs right now."}
                </p>
                {scheduleFilter !== "all" && (
                  <button type="button" className="text-xs text-primary hover:underline font-medium mt-2" onClick={() => setScheduleFilter("all")}>
                    Show all events
                  </button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((evt) => {
                const isOtherTeam = showAllEvents && !events.some((e) => e.id === evt.id);
                const facilityJobs = evt.gameJobs.filter((j) => j.scope === "FACILITY");
                const isExpanded = expandedEventId === evt.id;
                const totalFilled = facilityJobs.reduce((s, j) => s + j.filled, 0);
                const totalSlots = facilityJobs.reduce((s, j) => s + j.slotsNeeded, 0);
                const barColor = isOtherTeam
                  ? ((evt as any).teamColor ?? "var(--muted)")
                  : (evt.type === "GAME" ? team.color : "var(--muted)");
                return (
                  <Card key={evt.id} className={cn("rounded-2xl border-border/50 overflow-hidden", isOtherTeam && "opacity-70")}>
                    <div className="h-0.5" style={{ backgroundColor: barColor }} />
                    <CardContent className="py-0">
                      <button
                        type="button"
                        className="w-full py-4 text-left"
                        onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-sm font-semibold truncate">{evt.title}</h3>
                              <span className="text-xs text-muted-foreground">-</span>
                              <Badge variant={evt.type === "GAME" ? "default" : "secondary"} className="rounded-lg text-[10px] shrink-0">
                                {evt.type === "GAME" ? "Game" : evt.type === "PRACTICE" ? "Practice" : evt.type === "CLUB_EVENT" ? "Club Event" : "Other"}
                              </Badge>
                              {isOtherTeam && (evt as any).teamName && (
                                <Badge variant="outline" className="rounded-lg text-[10px] shrink-0" style={{ borderColor: (evt as any).teamColor }}>
                                  {(evt as any).teamName}
                                </Badge>
                              )}
                              {evt.recurrenceGroupId && <Badge variant="outline" className="rounded-lg text-[10px] shrink-0">Recurring</Badge>}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(parseISO(evt.startTime), "EEE, MMM d - h:mm a")} - {format(parseISO(evt.endTime), "h:mm a")}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {evt.facility}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {facilityJobs.length > 0 && (
                              <div className="text-right mr-1">
                                <p className="text-xs text-muted-foreground">Jobs</p>
                                <p className="text-sm font-semibold">
                                  {totalFilled}/{totalSlots}
                                </p>
                              </div>
                            )}
                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="pb-4 space-y-3">
                          {evt.conflicts.length > 0 && (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                              <div className="flex items-center gap-1.5 mb-1">
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                <span className="text-[11px] font-semibold text-amber-600">Facility conflict</span>
                              </div>
                              {evt.conflicts.map((c, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.teamColor }} />
                                  <span>{c.teamName} — {c.title}</span>
                                  <span className="text-[10px]">
                                    ({format(parseISO(c.startTime), "h:mm a")} - {format(parseISO(c.endTime), "h:mm a")})
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {evt.notes && (
                            <div className="rounded-lg bg-muted/30 px-3 py-2">
                              <p className="text-xs text-muted-foreground">{evt.notes}</p>
                            </div>
                          )}

                          {facilityJobs.length > 0 ? (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Volunteer Jobs</h4>
                              {facilityJobs.map((job) => (
                                <div key={job.id} className="rounded-lg border border-border/50 px-3 py-2.5">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <Briefcase className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-sm font-medium">{job.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {job.isPublic ? (
                                        <Globe className="h-3 w-3 text-emerald-500" />
                                      ) : (
                                        <Lock className="h-3 w-3 text-muted-foreground" />
                                      )}
                                      <Badge variant={job.filled >= job.slotsNeeded ? "default" : "outline"} className="rounded-lg text-[10px]">
                                        {job.filled}/{job.slotsNeeded}
                                      </Badge>
                                    </div>
                                  </div>
                                  {job.volunteerNames.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                      {job.volunteerNames.map((name, i) => (
                                        <Badge key={i} variant="secondary" className="rounded-lg text-[10px] font-normal">
                                          {name}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-muted-foreground mt-0.5">No volunteers yet</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No facility volunteer jobs for this event.</p>
                          )}

                          {scheduling.canSchedule && (
                            <div className="flex items-center gap-2 pt-1">
                              <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => openEdit(evt)}>
                                <Pencil className="mr-1.5 h-3 w-3" />
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" className="rounded-xl text-xs text-destructive hover:text-destructive" onClick={() => setDeletingEvent(evt)}>
                                <Trash2 className="mr-1.5 h-3 w-3" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
          })()}
        </div>

        <EventForm
          open={eventFormOpen}
          onClose={() => { setEventFormOpen(false); setEditingEvent(null); }}
          onSaved={handleEventSaved}
          teams={scheduling.teams}
          facilities={scheduling.facilities}
          seasons={scheduling.seasons}
          canBump={scheduling.canBump}
          fixedTeamId={team.id}
          event={editingEvent ? {
            id: editingEvent.id,
            title: editingEvent.title,
            type: editingEvent.type,
            startTime: editingEvent.startTime,
            endTime: editingEvent.endTime,
            notes: editingEvent.notes,
            isRecurring: editingEvent.isRecurring,
            recurrenceRule: editingEvent.recurrenceRule,
            teamId: team.id,
            subFacilityId: editingEvent.subFacilityId,
            seasonId: editingEvent.seasonId,
          } : undefined}
        />

        <Dialog open={!!deletingEvent} onOpenChange={(o) => !o && setDeletingEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Event
              </DialogTitle>
              <DialogDescription>
                Delete <strong>{deletingEvent?.title}</strong> on{" "}
                {deletingEvent && format(parseISO(deletingEvent.startTime), "EEE, MMM d 'at' h:mm a")}? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingEvent(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>

      <TabsContent value="staff" className="overflow-y-auto min-h-0">
        <div className="space-y-6">
          <Card className="rounded-2xl border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Coaching Staff</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {team.headCoach && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{team.headCoach.name}</p>
                    <p className="text-xs text-muted-foreground">{team.headCoach.email}</p>
                  </div>
                  <Badge variant="secondary" className="rounded-lg text-[10px]">Head Coach</Badge>
                </div>
              )}
              {team.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                  <Badge variant="secondary" className="rounded-lg text-[10px]">{roleBadge[m.role] ?? m.role}</Badge>
                </div>
              ))}
              {!team.headCoach && team.members.length === 0 && (
                <p className="text-sm text-muted-foreground">No staff assigned yet.</p>
              )}
              <TeamMembers teamId={team.id} canManage={canManage} />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3 mb-2">
            <StatCard
              label="Team Jobs"
              value={teamRoles.length}
            />
            <StatCard
              label="Assigned"
              value={teamRoles.reduce((s, r) => s + r.assignments.length, 0)}
            />
            <StatCard
              label="Open Slots"
              value={teamRoles.reduce((s, r) => s + Math.max(0, r.maxSlots - r.assignments.length), 0)}
            />
          </div>

          {teamRoles.length === 0 ? (
            <Card className="rounded-2xl border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Briefcase className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No team-level volunteer jobs configured.</p>
                {canManage && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Enable team jobs in the Settings tab.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {teamRoles.map((role) => (
                <TeamRoleCard key={role.templateId} role={role} teamId={team.id} canManage={canManage} />
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="roster" className="overflow-y-auto min-h-0">
        <TeamRoster teamId={team.id} canManage={canManage} />
      </TabsContent>

      {canManage && (
        <TabsContent value="settings" className="overflow-y-auto min-h-0">
          <div className="space-y-8">
            <TeamProfileSettings team={team} canManage={canManage} />
            <TeamJobSettings teamId={team.id} orgTemplates={jobTemplates} teamTemplates={teamSpecificTemplates} />
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
}

/* ========== Event Job Card with Assignment ========== */

function EventJobCard({
  event,
  teamColor,
  canManage,
}: {
  event: EventSummary;
  teamColor: string;
  canManage: boolean;
}) {
  return (
    <Card className="rounded-2xl border-border/50 overflow-hidden">
      <div className="h-0.5" style={{ backgroundColor: event.type === "GAME" ? teamColor : "var(--muted)" }} />
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">{event.title}</h4>
            <Badge variant={event.type === "GAME" ? "default" : "secondary"} className="rounded-lg text-[10px]">{event.type}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {format(parseISO(event.startTime), "EEE, MMM d - h:mm a")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <MapPin className="h-3 w-3" />
          {event.facility}
        </div>
        {event.gameJobs.length > 0 && (
          <div className="space-y-3 mt-3 pt-3 border-t border-border/30">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Volunteer Jobs</p>
            {event.gameJobs.map((gj) => (
              <JobSlotRow key={gj.id} job={gj} canManage={canManage} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JobSlotRow({
  job,
  canManage,
}: {
  job: GameJobSummary;
  canManage: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const hasOpen = job.filled < job.slotsNeeded;

  async function handleAssign() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign");
      }
      toast.success(`${name.trim()} assigned`);
      setName("");
      setEmail("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/30 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{job.name}</span>
          {job.isPublic ? (
            <Globe className="h-3 w-3 text-emerald-500" />
          ) : (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        <Badge
          variant={job.filled >= job.slotsNeeded ? "default" : "secondary"}
          className="rounded-lg text-[10px]"
        >
          {job.filled}/{job.slotsNeeded}
        </Badge>
      </div>

      {job.volunteerNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {job.volunteerNames.map((vn, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-md bg-emerald-500/10 text-emerald-700 px-2 py-0.5 text-[11px] font-medium"
            >
              {vn}
            </span>
          ))}
        </div>
      )}

      {canManage && hasOpen && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium mt-0.5"
        >
          <UserPlus className="h-3 w-3" />
          Assign volunteer
        </button>
      )}

      {showForm && (
        <div className="mt-2 flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-xs rounded-lg flex-1"
          />
          <Input
            placeholder="Email (optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-8 text-xs rounded-lg flex-1"
          />
          <div className="flex gap-1.5 shrink-0">
            <Button
              size="sm"
              className="h-8 rounded-lg text-xs px-3"
              onClick={handleAssign}
              disabled={saving || !name.trim()}
            >
              {saving ? "..." : "Assign"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 rounded-lg p-0"
              onClick={() => { setShowForm(false); setName(""); setEmail(""); }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== Team Role Card ========== */

function TeamRoleCard({
  role,
  teamId,
  canManage,
}: {
  role: TeamRole;
  teamId: string;
  canManage: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const router = useRouter();
  const isFull = role.assignments.length >= role.maxSlots;

  async function handleAssign() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/team-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTemplateId: role.templateId,
          name: name.trim(),
          email: email.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign");
      }
      toast.success(`${name.trim()} assigned to ${role.name}`);
      setName("");
      setEmail("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(assignmentId: string) {
    setRemoving(assignmentId);
    try {
      const res = await fetch(`/api/teams/${teamId}/team-jobs`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      if (!res.ok) throw new Error("Failed to remove");
      toast.success("Volunteer removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove volunteer");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Card className="rounded-2xl border-border/50">
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">{role.name}</h4>
          </div>
          <div className="flex items-center gap-1.5">
            {role.forEventType !== "ALL" && (
              <Badge variant="outline" className="rounded-lg text-[10px] capitalize">
                {role.forEventType.toLowerCase()}s only
              </Badge>
            )}
            <Badge variant="secondary" className="rounded-lg text-[10px]">{role.hoursPerGame}h/game</Badge>
            <Badge variant={isFull ? "default" : "outline"} className="rounded-lg text-[10px]">
              {role.assignments.length}/{role.maxSlots}
            </Badge>
          </div>
        </div>
        {role.description && (
          <p className="text-xs text-muted-foreground mb-2 ml-6">{role.description}</p>
        )}

        {role.assignments.length > 0 && (
          <div className="space-y-1.5 mt-2">
            {role.assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 ml-6">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center rounded-md bg-emerald-500/10 text-emerald-700 px-2 py-0.5 text-[11px] font-medium">
                    {a.name || "Unknown"}
                  </span>
                  {a.email && (
                    <span className="text-[11px] text-muted-foreground truncate">{a.email}</span>
                  )}
                </div>
                {canManage && (
                  <button
                    onClick={() => handleRemove(a.id)}
                    disabled={removing === a.id}
                    className="text-muted-foreground hover:text-destructive shrink-0 p-0.5"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {canManage && !showForm && !isFull && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium mt-2 ml-6"
          >
            <UserPlus className="h-3 w-3" />
            Assign volunteer
          </button>
        )}

        {showForm && (
          <div className="mt-2 ml-6 flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs rounded-lg flex-1"
            />
            <Input
              placeholder="Email (optional)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-8 text-xs rounded-lg flex-1"
            />
            <div className="flex gap-1.5 shrink-0">
              <Button
                size="sm"
                className="h-8 rounded-lg text-xs px-3"
                onClick={handleAssign}
                disabled={saving || !name.trim()}
              >
                {saving ? "..." : "Assign"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 rounded-lg p-0"
                onClick={() => { setShowForm(false); setName(""); setEmail(""); }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ========== Team Profile Settings ========== */

const TEAM_ICONS = [
  "⚾", "🥎", "🏀", "⚽", "🏈", "🏐", "🎾", "🏒", "🥊", "⭐",
  "🔥", "💎", "🦅", "🐻", "🦁", "🐯", "🐺", "🦈", "🐎", "🐉",
  "⚡", "🌪️", "🏆", "👑", "🎯", "💪", "🛡️", "⚔️", "🚀", "🎖️",
];

const TEAM_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  "#84cc16", "#e11d48", "#0ea5e9", "#a855f7", "#10b981",
  "#d946ef", "#64748b", "#dc2626", "#2563eb", "#16a34a",
];

interface OrgUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

function TeamProfileSettings({ team, canManage }: { team: TeamInfo; canManage: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(team.name);
  const [icon, setIcon] = useState(team.icon || "");
  const [color, setColor] = useState(team.color);
  const [active, setActive] = useState(team.active);
  const [headCoachId, setHeadCoachId] = useState(team.headCoach?.id || "");
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/organization/users");
      if (res.ok) {
        const data = await res.json();
        setOrgUsers(data);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const hasChanges =
    name !== team.name ||
    icon !== (team.icon || "") ||
    color !== team.color ||
    active !== team.active ||
    headCoachId !== (team.headCoach?.id || "");

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Team name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          icon: icon || null,
          color,
          active,
          headCoachId: headCoachId || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update team");
      }
      toast.success("Team settings saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold tracking-tight">Team Profile</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Manage team name, icon, color, and coaching staff</p>
      </div>

      <Card className="rounded-2xl border-border/50">
        <CardContent className="pt-6 space-y-6">
          {/* Team Name */}
          <div className="grid gap-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canManage}
              className="h-11 rounded-xl"
              placeholder="Team name"
            />
          </div>

          {/* Icon + Color row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Icon</Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => canManage && setShowIconPicker(!showIconPicker)}
                  disabled={!canManage}
                  className={cn(
                    "h-11 w-full rounded-xl border border-input bg-background px-3 text-left flex items-center gap-2 hover:bg-accent/50 transition-colors",
                    !canManage && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {icon ? (
                    <span className="text-xl">{icon}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Choose icon…</span>
                  )}
                </button>
                {showIconPicker && (
                  <div className="absolute z-20 top-12 left-0 bg-popover border border-border rounded-xl shadow-lg p-3 w-72">
                    <div className="flex flex-wrap gap-1.5">
                      {icon && (
                        <button
                          type="button"
                          className="h-9 w-9 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
                          onClick={() => { setIcon(""); setShowIconPicker(false); }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {TEAM_ICONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center text-lg hover:bg-accent transition-colors",
                            icon === emoji && "ring-2 ring-primary bg-accent"
                          )}
                          onClick={() => { setIcon(emoji); setShowIconPicker(false); }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {TEAM_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={!canManage}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all",
                      color === c ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Head Coach */}
          <div className="grid gap-2">
            <Label>Head Coach</Label>
            <Select value={headCoachId || "__none__"} onValueChange={(v: string | null) => setHeadCoachId(!v || v === "__none__" ? "" : v)} disabled={!canManage || loadingUsers} items={{ __none__: "None", ...Object.fromEntries(orgUsers.map((u) => [u.id, `${u.name || u.email}${u.role === "ADMIN" ? " (Admin)" : u.role === "COACH" ? " (Coach)" : ""}`])) }}>
              <SelectTrigger className="w-full h-11 rounded-xl">
                <SelectValue placeholder={loadingUsers ? "Loading…" : "Select head coach"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" label="None">
                  <span className="text-muted-foreground">None</span>
                </SelectItem>
                {orgUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id} label={`${u.name || u.email}${u.role === "ADMIN" ? " (Admin)" : u.role === "COACH" ? " (Coach)" : ""}`}>
                    {u.name || u.email} {u.role === "ADMIN" ? "(Admin)" : u.role === "COACH" ? "(Coach)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active/Inactive toggle */}
          {canManage && (
            <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
              <div>
                <Label htmlFor="team-active" className="text-sm font-medium">
                  Team Active
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {active ? "Team is visible and can be scheduled" : "Team is hidden from lists and scheduling"}
                </p>
              </div>
              <Switch
                id="team-active"
                checked={active}
                onCheckedChange={setActive}
              />
            </div>
          )}

          {/* Save button */}
          {canManage && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="rounded-xl"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="mr-1.5 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ========== Team Job Settings (unchanged) ========== */

function TeamJobSettings({
  teamId,
  orgTemplates,
  teamTemplates,
}: {
  teamId: string;
  orgTemplates: JobTemplateSummary[];
  teamTemplates: TeamSpecificTemplate[];
}) {
  return (
    <div className="space-y-8">
      <OrgJobToggles teamId={teamId} templates={orgTemplates} />
      <TeamSpecificJobs teamId={teamId} templates={teamTemplates} />
    </div>
  );
}

function OrgJobToggles({ teamId, templates }: { teamId: string; templates: JobTemplateSummary[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold tracking-tight">Organization Team Jobs</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Toggle which org-wide team jobs are active for this team</p>
      </div>
      {templates.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No organization team job templates available.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-border/50 overflow-hidden">
          <div className="divide-y divide-border/50">
            {templates.map((t) => (
              <JobToggleRow key={t.id} teamId={teamId} template={t} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function JobToggleRow({ teamId, template }: { teamId: string; template: JobTemplateSummary }) {
  const [active, setActive] = useState(template.active);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [preview, setPreview] = useState<{ affectedSignups: number; volunteers: { name: string | null; email: string | null }[] } | null>(null);
  const router = useRouter();

  async function handleToggle() {
    const newActive = !active;
    if (!newActive) {
      setLoading(true);
      try {
        const res = await fetch(`/api/teams/${teamId}/job-overrides`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobTemplateId: template.id, active: false, confirm: false }),
        });
        const data = await res.json();
        if (data.needsConfirmation) {
          setPreview(data);
          setConfirmOpen(true);
          return;
        }
      } catch {
        toast.error("Failed to check signups");
        return;
      } finally {
        setLoading(false);
      }
    }
    await saveOverride(newActive, newActive ? false : true);
  }

  async function saveOverride(newActive: boolean, confirm: boolean) {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/job-overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTemplateId: template.id, active: newActive, confirm }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setActive(newActive);
      setConfirmOpen(false);
      setPreview(null);
      toast.success(newActive ? "Job enabled" : "Job disabled");
      router.refresh();
    } catch {
      toast.error("Failed to update job status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium", !active && "text-muted-foreground")}>{template.name}</p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
            {template.description && <span className="truncate">{template.description}</span>}
            <span className="shrink-0 capitalize">{template.forEventType === "ALL" ? "all events" : `${template.forEventType.toLowerCase()}s`}</span>
            <span className="flex items-center gap-0.5 shrink-0"><Clock className="h-2.5 w-2.5" />{template.hoursPerGame}h/game</span>
          </div>
        </div>
        <button onClick={handleToggle} disabled={loading} className="shrink-0" title={active ? "Disable for this team" : "Enable for this team"}>
          <div className={cn("h-5 w-9 rounded-full transition-colors relative cursor-pointer", active ? "bg-emerald-500" : "bg-muted-foreground/30")}>
            <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all shadow-sm", active ? "left-[18px]" : "left-0.5")} />
          </div>
        </button>
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Disable {template.name}?
            </DialogTitle>
            <DialogDescription>
              This will cancel <strong>{preview?.affectedSignups} active signup(s)</strong> for this team&apos;s future events. Volunteers will be notified.
            </DialogDescription>
          </DialogHeader>
          {preview && preview.volunteers.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-lg border border-border/50 p-3 space-y-1">
              {preview.volunteers.map((v, i) => (
                <p key={i} className="text-xs text-muted-foreground">{v.name || "Unknown"} ({v.email || "no email"})</p>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Keep Active</Button>
            <Button variant="destructive" onClick={() => saveOverride(false, true)} disabled={loading}>
              {loading ? "Disabling..." : "Disable & Notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TeamSpecificJobs({ teamId, templates }: { teamId: string; templates: TeamSpecificTemplate[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold tracking-tight">Team-Specific Jobs</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Custom jobs that only apply to this team</p>
        </div>
        <TemplateForm showScopeToggle={false} apiUrl={`/api/teams/${teamId}/templates`}>
          <Button size="sm" className="rounded-xl shadow-md shadow-primary/15 active:scale-95 transition-all">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Job
          </Button>
        </TemplateForm>
      </div>
      {templates.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="py-8 text-center">
            <Briefcase className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No team-specific jobs yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-border/50 overflow-hidden">
          <div className="divide-y divide-border/50">
            {templates.map((t) => (
              <TeamTemplateRow key={t.id} template={t} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function TeamTemplateRow({ template }: { template: TeamSpecificTemplate }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/templates/${template.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Template deleted");
      setDeleteOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to delete template");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{template.name}</p>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
          {template.description && <span className="truncate">{template.description}</span>}
          <span className="flex items-center gap-0.5 shrink-0"><Clock className="h-2.5 w-2.5" />{template.hoursPerGame}h/game</span>
          <span className="shrink-0">{template._count.gameJobs} job{template._count.gameJobs !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <TemplateForm template={{ ...template, scope: "TEAM" }} showScopeToggle={false}>
          <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
        </TemplateForm>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {template.name}?</DialogTitle>
            <DialogDescription>This removes the template and all associated game jobs.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>{loading ? "Deleting..." : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, clickable, highlight }: { label: string; value: number | string; clickable?: boolean; highlight?: boolean }) {
  return (
    <Card className={cn(
      "rounded-xl md:rounded-2xl border-border/50",
      clickable && "hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer",
      highlight && "border-primary/30 bg-primary/5"
    )}>
      <CardContent className="py-3 md:py-4">
        <p className="text-[11px] md:text-xs text-muted-foreground font-medium">{label}</p>
        <p className={cn("text-xl md:text-2xl font-bold mt-0.5 md:mt-1", highlight && "text-primary")}>{value}</p>
      </CardContent>
    </Card>
  );
}
