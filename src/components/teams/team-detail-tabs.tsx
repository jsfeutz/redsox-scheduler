"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Loader2,
  Save,
  Copy,
  Check,
  Minus,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { TemplateForm } from "@/components/jobs/template-form";
import { ScheduleView } from "@/components/schedules/schedule-view";
import { TeamMembers } from "@/components/teams/team-members";
import { TeamRoster } from "@/components/teams/team-roster";
import { JobSlotRow } from "@/components/jobs/job-slot-row";
import type { JobSlotData } from "@/components/jobs/job-slot-row";
import { AddJobToEvent } from "@/components/jobs/add-job-to-event";

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

type GameJobSummary = JobSlotData;

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
  gameVenue?: string | null;
  customLocation?: string | null;
  customLocationUrl?: string | null;
  noJobs?: boolean;
  conflicts: ConflictInfo[];
  gameJobs: GameJobSummary[];
}

interface SchedulingData {
  teams: {
    id: string;
    name: string;
    color: string;
    icon: string | null;
    headCoach?: { name: string } | null;
  }[];
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
  /** Org admin — passed through to schedule calendar (blackouts, etc.). */
  isAdmin?: boolean;
  /** Teams the user may act on in schedule UI (same semantics as main Schedule page). */
  userTeams?: SchedulingData["teams"];
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
  isAdmin = false,
  userTeams,
}: TeamDetailTabsProps) {
  const games = events.filter((e) => e.type === "GAME");
  const practices = events.filter((e) => e.type === "PRACTICE");
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<string | number | null>("overview");

  const allFacilityJobs = events.flatMap((e) => e.gameJobs.filter((j) => j.scope === "FACILITY" && !j.disabled));
  const openJobs = allFacilityJobs.filter((j) => j.filled < j.slotsNeeded);

  function goToSchedule() {
    setActiveTab("schedule");
  }

  const scheduleUserTeams = userTeams ?? scheduling.teams;

  const tabs = [
    { value: "overview", label: "Overview", icon: Info },
    { value: "schedule", label: "Schedule", icon: Calendar },
    { value: "staff", label: "Staff", icon: Users },
    { value: "roster", label: "Roster", icon: Users },
    ...(canManage ? [{ value: "settings", label: "Settings", icon: Settings }] : []),
  ];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col md:block gap-0">
      <div className="flex shrink-0 border-b border-border/50 overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 scrollbar-none">
        {tabs.map((tab) => {
          const active = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
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
          <button type="button" className="text-left" onClick={() => goToSchedule()}>
            <StatCard label="Upcoming Games" value={games.length} clickable />
          </button>
          <button type="button" className="text-left" onClick={() => goToSchedule()}>
            <StatCard label="Practices" value={practices.length} clickable />
          </button>
          <button type="button" className="text-left" onClick={() => goToSchedule()}>
            <StatCard label="Facility Jobs" value={allFacilityJobs.length} clickable />
          </button>
          <button type="button" className="text-left" onClick={() => goToSchedule()}>
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

      <TabsContent value="schedule" className="flex flex-col flex-1 min-h-0 overflow-hidden md:overflow-y-auto md:min-h-[28rem]">
        <Suspense
          fallback={
            <div className="text-sm text-muted-foreground py-8 text-center">
              Loading schedule…
            </div>
          }
        >
          <ScheduleView
            teams={scheduling.teams}
            facilities={scheduling.facilities}
            seasons={scheduling.seasons}
            canManage={scheduling.canSchedule}
            canBump={scheduling.canBump}
            isAdmin={isAdmin}
            userTeams={scheduleUserTeams}
            lockedTeamId={team.id}
            viewModeStorageKey={`schedule-viewMode-team-${team.id}`}
            onScheduleChanged={() => router.refresh()}
          />
        </Suspense>
      </TabsContent>

      <TabsContent value="staff" className="overflow-y-auto min-h-0">
        <div className="space-y-6">
          <StaffList teamId={team.id} canManage={canManage} />

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

/* ========== Staff List with Inline Role Editing ========== */

const ROLE_OPTIONS = [
  { value: "HEAD_COACH", label: "Head Coach" },
  { value: "ASSISTANT_COACH", label: "Asst. Coach" },
  { value: "TEAM_MANAGER", label: "Manager" },
] as const;

const staffRoleColors: Record<string, string> = {
  HEAD_COACH: "bg-red-500/15 text-red-600 border-red-500/20",
  ASSISTANT_COACH: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  TEAM_MANAGER: "bg-amber-500/15 text-amber-600 border-amber-500/20",
};

interface StaffMember {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string };
}

function StaffList({ teamId, canManage }: { teamId: string; canManage: boolean }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members`);
      if (!res.ok) return;
      setMembers(await res.json());
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update role");
      }
      toast.success("Role updated");
      await fetchMembers();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleRemove(userId: string, name: string | null) {
    setRemovingId(userId);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to remove member");
      }
      toast.success(`${name || "Member"} removed`);
      setMembers((prev) => prev.filter((m) => m.user.id !== userId));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setRemovingId(null);
    }
  }

  const isSelf = (userId: string) => userId === session?.user?.id;
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Coaching Staff</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No staff assigned yet.</p>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/30 transition-colors group"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                {m.user.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate leading-tight">
                  {m.user.name || m.user.email}
                  {isSelf(m.user.id) && <span className="text-muted-foreground ml-1 text-xs font-normal">You</span>}
                </p>
                {m.user.name && (
                  <p className="text-[11px] text-muted-foreground truncate leading-tight">{m.user.email}</p>
                )}
              </div>
              {canManage && !isSelf(m.user.id) ? (
                <Select
                  value={m.role}
                  onValueChange={(v) => v && handleRoleChange(m.user.id, v)}
                >
                  <SelectTrigger className="h-7 w-auto min-w-[100px] rounded-lg text-[10px] border-0 bg-transparent px-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn("rounded-lg text-[10px] pointer-events-none", staffRoleColors[m.role])}
                    >
                      {updatingId === m.user.id ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : null}
                      {roleBadge[m.role] ?? m.role}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge
                  variant="outline"
                  className={cn("rounded-lg text-[10px] shrink-0", staffRoleColors[m.role])}
                >
                  {roleBadge[m.role] ?? m.role}
                </Badge>
              )}
              {canManage && !isSelf(m.user.id) && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  disabled={removingId === m.user.id}
                  onClick={() => handleRemove(m.user.id, m.user.name)}
                >
                  {removingId === m.user.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3 text-destructive" />
                  )}
                </Button>
              )}
            </div>
          ))
        )}
        {canManage && (
          <TeamMembers teamId={teamId} canManage={false} hideList inviteOnly onInviteSuccess={fetchMembers} />
        )}
      </CardContent>
    </Card>
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
  const router = useRouter();
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
        <div className="space-y-3 mt-3 pt-3 border-t border-border/30">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Volunteer Jobs</p>
          {event.gameJobs.length > 0 ? (
            event.gameJobs.map((gj) => (
              <JobSlotRow key={gj.id} job={gj} canManage={canManage} />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No volunteer jobs for this event.</p>
          )}
          {canManage && (
            <AddJobToEvent
              scheduleEventId={event.id}
              existingTemplateIds={event.gameJobs
                .map((j) => j.templateId)
                .filter(Boolean) as string[]}
              onAdded={() => router.refresh()}
            />
          )}
        </div>
      </CardContent>
    </Card>
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
            <Badge variant="secondary" className="rounded-lg text-[10px]">{role.hoursPerGame}h/event</Badge>
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

const DEFAULT_TEAM_COLOR = "#3b82f6";

function hexForColorInput(value: string): string {
  const t = value.trim();
  const withHash = t.startsWith("#") ? t : `#${t}`;
  return /^#[0-9A-Fa-f]{6}$/.test(withHash)
    ? withHash.toLowerCase()
    : DEFAULT_TEAM_COLOR;
}

function parseHexOrNull(raw: string): string | null {
  let t = raw.trim();
  if (!t) return null;
  if (!t.startsWith("#")) t = `#${t}`;
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t.toLowerCase();
  return null;
}

const TEAM_ICONS = Array.from(
  new Set([
    "⚾",
    "🥎",
    "🏀",
    "⚽",
    "🏈",
    "🏐",
    "🎾",
    "🏓",
    "🏸",
    "🥅",
    "🏒",
    "🥊",
    "🥋",
    "🎿",
    "⛷️",
    "🏂",
    "🏄",
    "🤿",
    "🛼",
    "🎯",
    "🎳",
    "🥏",
    "🏹",
    "🎣",
    "🏆",
    "🥇",
    "🥈",
    "🥉",
    "🏅",
    "🎖️",
    "🎗️",
    "🦅",
    "🐻",
    "🦁",
    "🐯",
    "🐺",
    "🦈",
    "🐎",
    "🐉",
    "🦖",
    "🦕",
    "🐊",
    "🦬",
    "🐂",
    "🦌",
    "🦉",
    "🦊",
    "🐱",
    "🐶",
    "🐝",
    "🦋",
    "⭐",
    "✨",
    "🔥",
    "💎",
    "⚡",
    "🌪️",
    "🌈",
    "☀️",
    "🌙",
    "❄️",
    "💧",
    "👑",
    "🛡️",
    "⚔️",
    "🚀",
    "💪",
    "🎪",
    "🎨",
    "🎸",
    "🎺",
    "🥁",
    "🔔",
    "📣",
    "🏁",
    "🚩",
    "🎌",
    "1️⃣",
    "2️⃣",
    "3️⃣",
    "4️⃣",
    "5️⃣",
    "6️⃣",
    "7️⃣",
    "8️⃣",
    "9️⃣",
    "🔟",
    "❤️",
    "🧡",
    "💙",
    "💚",
    "💜",
    "🖤",
    "🤍",
    "💛",
    "🎁",
    "🎂",
    "🍀",
    "🌸",
    "🌻",
    "🌴",
    "⛳",
    "🎮",
    "🕹️",
    "🧢",
    "👟",
    "🧤",
  ])
);

function TeamProfileSettings({ team, canManage }: { team: TeamInfo; canManage: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(team.name);
  const [ageGroup, setAgeGroup] = useState(team.ageGroup || "");
  const [icon, setIcon] = useState(team.icon || "");
  const [color, setColor] = useState(team.color);
  const [active, setActive] = useState(team.active);
  const [iconOpen, setIconOpen] = useState(false);
  const lastGoodColor = useRef(team.color);

  useEffect(() => {
    setName(team.name);
    setAgeGroup(team.ageGroup || "");
    setIcon(team.icon || "");
    setColor(team.color);
    lastGoodColor.current = team.color;
    setActive(team.active);
  }, [
    team.id,
    team.name,
    team.ageGroup,
    team.icon,
    team.color,
    team.active,
  ]);

  const hasChanges =
    name !== team.name ||
    ageGroup !== (team.ageGroup || "") ||
    icon !== (team.icon || "") ||
    color !== team.color ||
    active !== team.active;

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Team name is required");
      return;
    }
    const parsedColor = parseHexOrNull(color);
    if (!parsedColor) {
      toast.error("Color must be a valid hex value like #3b82f6");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ageGroup: ageGroup.trim() || null,
          icon: icon || null,
          color: parsedColor,
          active,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update team");
      }
      toast.success("Team settings saved");
      lastGoodColor.current = parsedColor;
      setColor(parsedColor);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function onColorPickerChange(hex: string) {
    setColor(hex.toLowerCase());
    lastGoodColor.current = hex.toLowerCase();
  }

  function onColorHexBlur() {
    const parsed = parseHexOrNull(color);
    if (parsed) {
      setColor(parsed);
      lastGoodColor.current = parsed;
    } else {
      toast.error("Invalid hex — use #RRGGBB");
      setColor(lastGoodColor.current);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold tracking-tight">Team Profile</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage team name, age group, icon, color, and visibility
        </p>
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

          <div className="grid gap-2">
            <Label htmlFor="team-age-group">Age Group</Label>
            <Input
              id="team-age-group"
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              disabled={!canManage}
              className="h-11 rounded-xl"
              placeholder="e.g. 12U, 14U, Varsity"
            />
          </div>

          {/* Icon + Color row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Icon</Label>
              <Popover open={iconOpen} onOpenChange={setIconOpen}>
                <PopoverTrigger
                  disabled={!canManage}
                  render={
                    <button
                      type="button"
                      className={cn(
                        "h-11 w-full rounded-xl border border-input bg-background px-3 text-left flex items-center gap-2 hover:bg-accent/50 transition-colors",
                        !canManage && "opacity-60 cursor-not-allowed"
                      )}
                    />
                  }
                >
                  {icon ? (
                    <span className="text-2xl leading-none">{icon}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Choose icon…
                    </span>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Pick an icon
                  </p>
                  <div className="max-h-72 overflow-y-auto pr-1">
                    <div className="grid grid-cols-6 gap-2">
                      {icon && (
                        <button
                          type="button"
                          className="h-11 w-11 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground hover:bg-accent/50 transition-colors"
                          onClick={() => {
                            setIcon("");
                            setIconOpen(false);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      {TEAM_ICONS.map((emoji, i) => (
                        <button
                          key={`${emoji}-${i}`}
                          type="button"
                          className={cn(
                            "h-11 w-11 rounded-xl flex items-center justify-center text-2xl hover:bg-accent transition-colors",
                            icon === emoji && "ring-2 ring-primary bg-accent"
                          )}
                          onClick={() => {
                            setIcon(emoji);
                            setIconOpen(false);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="team-color-hex">Color</Label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  id="team-color-picker"
                  className="h-11 w-14 cursor-pointer rounded-xl border border-input bg-background p-1 shrink-0"
                  value={hexForColorInput(color)}
                  disabled={!canManage}
                  onChange={(e) => onColorPickerChange(e.target.value)}
                />
                <Input
                  id="team-color-hex"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  onBlur={onColorHexBlur}
                  disabled={!canManage}
                  className="h-11 rounded-xl flex-1 min-w-[8rem] font-mono text-sm"
                  placeholder="#3b82f6"
                  spellCheck={false}
                />
              </div>
            </div>
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
            <span className="flex items-center gap-0.5 shrink-0"><Clock className="h-2.5 w-2.5" />{template.hoursPerGame}h/event</span>
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
          <span className="flex items-center gap-0.5 shrink-0"><Clock className="h-2.5 w-2.5" />{template.hoursPerGame}h/event</span>
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
