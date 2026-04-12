"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2,
  Link as LinkIcon,
  Briefcase,
  Plus,
  Settings,
  Pencil,
  Trash2,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Megaphone,
  Check,
  Copy,
  Palette,
  Sun,
  Moon,
  Monitor,
  MessageSquare,
  CalendarOff,
  Shield,
  Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { TemplateForm } from "@/components/jobs/template-form";
import { BrandingIconSetting } from "@/components/settings/branding-icon-setting";
import { format } from "date-fns";

interface TemplateData {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  forEventType: string;
  hoursPerGame: number;
  maxSlots: number;
  active: boolean;
  askComfortLevel?: boolean;
  organizationId: string;
  _count: { gameJobs: number };
}

interface FacilityOption {
  id: string;
  name: string;
}

interface TeamOption {
  id: string;
  name: string;
  color: string;
}

interface SettingsTabsProps {
  organizationName: string;
  organizationId: string;
  organizationTimeZone?: string;
  organizationTimeZoneLabel?: string;
  teamJobsCountHours: boolean;
  teamJobsPublicSignup: boolean;
  requiredVolunteerHours: number;
  primaryColor: string;
  themeMode: string;
  brandingIconVersion: number;
  smsEnabled: boolean;
  reminderHoursBefore: string;
  isAdmin: boolean;
  canManage: boolean;
  templates: TemplateData[];
  facilities?: FacilityOption[];
  teams?: TeamOption[];
}

const ROWS_PER_PAGE = 10;

export function SettingsTabs({
  organizationName,
  organizationId,
  organizationTimeZone,
  organizationTimeZoneLabel,
  teamJobsCountHours,
  teamJobsPublicSignup,
  requiredVolunteerHours,
  primaryColor,
  themeMode,
  brandingIconVersion,
  smsEnabled: initialSmsEnabled,
  reminderHoursBefore: initialReminderHours,
  isAdmin,
  canManage,
  templates,
  facilities = [],
  teams = [],
}: SettingsTabsProps) {
  return (
    <Tabs defaultValue="general">
      <TabsList className="w-full sm:w-auto flex-wrap">
        <TabsTrigger value="general">
          <Settings className="h-3.5 w-3.5 mr-1.5" />
          General
        </TabsTrigger>
        <TabsTrigger value="jobs">
          <Briefcase className="h-3.5 w-3.5 mr-1.5" />
          Volunteer Jobs
        </TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="blackouts">
            <CalendarOff className="h-3.5 w-3.5 mr-1.5" />
            Blackout Dates
          </TabsTrigger>
        )}
        {isAdmin && (
          <TabsTrigger value="priority">
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Priority Rules
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="general">
        <div className="space-y-6">
          <Card className="rounded-2xl border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Organization</CardTitle>
                  <CardDescription className="text-xs">
                    Your organization details
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 max-w-sm">
                <Label className="text-sm font-medium">Name</Label>
                <Input
                  value={organizationName}
                  disabled
                  className="rounded-xl h-10"
                />
              </div>
            </CardContent>
          </Card>

          {organizationTimeZone && (
            <Card className="rounded-2xl border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Timezone</CardTitle>
                    <CardDescription className="text-xs">
                      Used for emails, SMS reminders, and all server-generated event times
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-1 max-w-sm">
                  <p className="text-sm font-medium">
                    {organizationTimeZoneLabel || organizationTimeZone}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {organizationTimeZone}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <PublicLinksCard />

          {isAdmin && (
            <TeamJobsHoursToggle initialValue={teamJobsCountHours} />
          )}

          {isAdmin && (
            <TeamJobsSignupToggle initialValue={teamJobsPublicSignup} />
          )}

          {isAdmin && (
            <RequiredHoursSetting initialValue={requiredVolunteerHours} />
          )}

          {isAdmin && (
            <AppearanceSetting initialColor={primaryColor} initialTheme={themeMode} />
          )}

          {isAdmin && (
            <BrandingIconSetting brandingIconVersion={brandingIconVersion} />
          )}

          {isAdmin && (
            <SmsNotificationSetting
              initialSmsEnabled={initialSmsEnabled}
              initialReminderHours={initialReminderHours}
            />
          )}

        </div>
      </TabsContent>

      <TabsContent value="jobs">
        <JobTemplatesTable
          templates={templates}
          canManage={canManage}
          isAdmin={isAdmin}
        />
      </TabsContent>

      {isAdmin && (
        <TabsContent value="blackouts">
          <BlackoutDatesManager facilities={facilities} />
        </TabsContent>
      )}

      {isAdmin && (
        <TabsContent value="priority">
          <SchedulingRulesManager teams={teams} />
        </TabsContent>
      )}

    </Tabs>
  );
}

function PublicLinksCard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const base = typeof window !== "undefined" ? window.location.origin : "";

  const links = [
    {
      key: "help-wanted",
      label: "Volunteer Sign-Up",
      description: "Parents can browse and sign up for open shifts",
      url: `${base}/help-wanted`,
    },
    {
      key: "schedule",
      label: "Public Schedule",
      description: "Full calendar view with inline volunteering",
      url: `${base}/schedule`,
    },
  ];

  async function handleCopy(key: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedKey(key);
    toast.success("Link copied");
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <LinkIcon className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <CardTitle className="text-base">Public Links</CardTitle>
            <CardDescription className="text-xs">
              Share these with parents and volunteers
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.key} className="grid gap-1.5">
              <Label className="text-sm font-medium">{link.label}</Label>
              <div className="flex gap-2">
                <Input
                  value={link.url}
                  readOnly
                  className="rounded-xl h-10 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl"
                  onClick={() => handleCopy(link.key, link.url)}
                >
                  {copiedKey === link.key ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{link.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TeamJobsHoursToggle({ initialValue }: { initialValue: boolean }) {
  const [enabled, setEnabled] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    const newValue = !enabled;
    setLoading(true);
    try {
      const res = await fetch("/api/organization/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamJobsCountHours: newValue }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEnabled(newValue);
      toast.success(newValue ? "Team jobs now count toward hours" : "Team jobs no longer count toward hours");
      router.refresh();
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Volunteer Hours</CardTitle>
            <CardDescription className="text-xs">
              Configure how volunteer hours are tracked
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Team jobs count toward hours</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              When enabled, volunteers assigned to team-level jobs earn hours.
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={loading}
            className="shrink-0"
          >
            <div
              className={cn(
                "h-5 w-9 rounded-full transition-colors relative cursor-pointer",
                enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all shadow-sm",
                  enabled ? "left-[18px]" : "left-0.5"
                )}
              />
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamJobsSignupToggle({ initialValue }: { initialValue: boolean }) {
  const [enabled, setEnabled] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    const newValue = !enabled;
    setLoading(true);
    try {
      const res = await fetch("/api/organization/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamJobsPublicSignup: newValue }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEnabled(newValue);
      toast.success(newValue ? "Team jobs visible on Volunteer Signup board" : "Team jobs hidden from Volunteer Signup board");
      router.refresh();
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <Megaphone className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Volunteer Signup Board</CardTitle>
            <CardDescription className="text-xs">
              Control which jobs appear on the public signup board
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Team jobs on signup board</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              When disabled, only facility jobs appear on the public board. Coaches assign team jobs directly.
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={loading}
            className="shrink-0"
          >
            <div
              className={cn(
                "h-5 w-9 rounded-full transition-colors relative cursor-pointer",
                enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all shadow-sm",
                  enabled ? "left-[18px]" : "left-0.5"
                )}
              />
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function RequiredHoursSetting({ initialValue }: { initialValue: number }) {
  const [hours, setHours] = useState(String(initialValue));
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSave() {
    const val = parseFloat(hours) || 0;
    setSaving(true);
    try {
      const res = await fetch("/api/organization/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requiredVolunteerHours: Math.max(0, val) }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(val > 0 ? `Required hours set to ${val}` : "Required hours tracking disabled");
      router.refresh();
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
            <Users className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Required Volunteer Hours</CardTitle>
            <CardDescription className="text-xs">
              Set the minimum hours each family must contribute per season
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3 max-w-sm">
          <div className="grid gap-2 flex-1">
            <Label className="text-sm font-medium">Hours per family</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="rounded-xl h-10"
              placeholder="0 = no requirement"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl h-10"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Set to 0 to disable the requirement. Hours are tracked on the Volunteers Participation tab and each team&apos;s Roster.
        </p>
      </CardContent>
    </Card>
  );
}

const PRESET_COLORS = [
  "#dc2626", "#ea580c", "#d97706", "#65a30d", "#16a34a",
  "#0d9488", "#0284c7", "#4f46e5", "#7c3aed", "#c026d3",
  "#e11d48", "#78716c",
];

function AppearanceSetting({
  initialColor,
  initialTheme,
}: {
  initialColor: string;
  initialTheme: string;
}) {
  const [color, setColor] = useState(initialColor);
  const [mode, setMode] = useState(initialTheme);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/organization/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryColor: color, themeMode: mode }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Appearance updated");
      window.location.reload();
    } catch {
      toast.error("Failed to update appearance");
    } finally {
      setSaving(false);
    }
  }

  const modes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10">
            <Palette className="h-5 w-5 text-pink-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription className="text-xs">
              Customize organization colors and theme mode
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Primary Color</Label>
          <div className="flex items-center gap-3 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="relative h-8 w-8 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? "white" : "transparent",
                  boxShadow: color === c ? `0 0 0 2px ${c}` : "none",
                }}
              >
                {color === c && (
                  <Check className="h-4 w-4 text-white absolute inset-0 m-auto" />
                )}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-2">
              <Label className="text-xs text-muted-foreground">Custom</Label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-8 rounded-full border-0 cursor-pointer bg-transparent"
              />
            </div>
          </div>
          <div
            className="mt-2 h-10 rounded-xl flex items-center justify-center text-sm font-medium text-white"
            style={{ backgroundColor: color }}
          >
            Preview
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Theme Mode</Label>
          <div className="flex gap-2">
            {modes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                  mode === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl h-10"
        >
          {saving ? "Saving..." : "Save Appearance"}
        </Button>
      </CardContent>
    </Card>
  );
}

function SmsNotificationSetting({
  initialSmsEnabled,
  initialReminderHours,
}: {
  initialSmsEnabled: boolean;
  initialReminderHours: string;
}) {
  const [enabled, setEnabled] = useState(initialSmsEnabled);
  const [reminderHours, setReminderHours] = useState(initialReminderHours);
  const [saving, setSaving] = useState(false);

  async function handleToggle(checked: boolean) {
    setEnabled(checked);
    try {
      const res = await fetch("/api/organization/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smsEnabled: checked }),
      });
      if (!res.ok) throw new Error();
      toast.success(checked ? "SMS notifications enabled" : "SMS notifications disabled");
    } catch {
      setEnabled(!checked);
      toast.error("Failed to update");
    }
  }

  async function handleSaveReminders() {
    setSaving(true);
    try {
      const res = await fetch("/api/organization/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderHoursBefore: reminderHours }),
      });
      if (!res.ok) throw new Error();
      toast.success("Reminder schedule updated");
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <MessageSquare className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">SMS Notifications</CardTitle>
            <CardDescription className="text-xs">
              Configure organization-wide SMS settings
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable SMS</p>
            <p className="text-xs text-muted-foreground">
              Send text reminders and notifications to volunteers
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} />
        </div>

        {enabled && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Reminder Hours Before Event</Label>
            <Input
              value={reminderHours}
              onChange={(e) => setReminderHours(e.target.value)}
              placeholder="24,2"
              className="h-10 rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated hours before event start. e.g. &quot;24,2&quot; sends reminders 24 hours and 2 hours before.
            </p>
            <Button
              onClick={handleSaveReminders}
              disabled={saving}
              size="sm"
              className="rounded-xl"
            >
              {saving ? "Saving..." : "Save Reminders"}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          <a href="/terms" className="underline">Terms</a> |{" "}
          <a href="/privacy" className="underline">Privacy</a> |{" "}
          <a href="/sms-consent" className="underline">SMS Consent</a>
        </p>
      </CardContent>
    </Card>
  );
}

type ScopeFilter = "ALL" | "TEAM" | "FACILITY";

function JobTemplatesTable({
  templates,
  canManage,
  isAdmin,
}: {
  templates: TemplateData[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("ALL");
  const [page, setPage] = useState(1);

  const handleScopeChange = useCallback((scope: ScopeFilter) => {
    setScopeFilter(scope);
    setPage(1);
  }, []);

  const filtered = useMemo(() => {
    if (scopeFilter === "ALL") return templates;
    return templates.filter((t) => t.scope === scopeFilter);
  }, [templates, scopeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            Volunteer Job Templates
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtered.length} template{filtered.length !== 1 ? "s" : ""}
            {scopeFilter !== "ALL" && " (filtered)"}
          </p>
        </div>
        {canManage && (
          <TemplateForm>
            <Button
              size="sm"
              className="rounded-xl shadow-md shadow-primary/15 active:scale-95 transition-all"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Template
            </Button>
          </TemplateForm>
        )}
      </div>

      <div className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-card/30 p-1.5 w-fit">
        {(["ALL", "TEAM", "FACILITY"] as const).map((s) => (
          <button
            key={s}
            onClick={() => handleScopeChange(s)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
              scopeFilter === s
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            {s === "TEAM" && <Users className="h-3 w-3" />}
            {s === "FACILITY" && <Building2 className="h-3 w-3" />}
            {s === "ALL" ? "All" : s === "TEAM" ? "Team" : "Facility"}
          </button>
        ))}
      </div>

      {templates.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Briefcase className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No templates yet</p>
            <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs">
              Create job templates like Scorekeeper, Announcer, or Field Prep.
            </p>
            {canManage && (
              <TemplateForm>
                <Button
                  className="mt-4 rounded-xl shadow-md shadow-primary/15"
                  size="sm"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Template
                </Button>
              </TemplateForm>
            )}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              No {scopeFilter.toLowerCase()} templates found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-border/50 overflow-hidden">
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5">Name</th>
                  <th className="text-left px-4 py-2.5">Scope</th>
                  <th className="text-left px-3 py-2.5">For</th>
                  <th className="text-center px-3 py-2.5">Hrs/event</th>
                  <th className="text-center px-3 py-2.5">Max</th>
                  <th className="text-center px-3 py-2.5">Used</th>
                  <th className="text-center px-3 py-2.5">Status</th>
                  {canManage && (
                    <th className="text-right px-4 py-2.5 w-[90px]" />
                  )}
                </tr>
              </thead>
              <tbody>
                {paginated.map((t) => (
                  <TemplateRow
                    key={t.id}
                    template={t}
                    canManage={canManage}
                    isAdmin={isAdmin}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-border/50">
            {paginated.map((t) => (
              <MobileTemplateRow
                key={t.id}
                template={t}
                canManage={canManage}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {(page - 1) * ROWS_PER_PAGE + 1}
            {" - "}
            {Math.min(page * ROWS_PER_PAGE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-lg text-xs",
                  p === page && "bg-primary text-primary-foreground"
                )}
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateRow({
  template,
  canManage,
  isAdmin,
}: {
  template: TemplateData;
  canManage: boolean;
  isAdmin: boolean;
}) {
  const isTeam = template.scope === "TEAM";

  return (
    <tr
      className={cn(
        "border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors",
        !template.active && "opacity-50"
      )}
    >
      <td className="px-4 py-2.5">
        <div className="font-medium">{template.name}</div>
        {template.description && (
          <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
            {template.description}
          </p>
        )}
      </td>
      <td className="px-4 py-2.5">
        <Badge
          variant="outline"
          className="rounded-md text-[10px] gap-1 font-normal"
        >
          {isTeam ? (
            <Users className="h-2.5 w-2.5" />
          ) : (
            <Building2 className="h-2.5 w-2.5" />
          )}
          {isTeam ? "Team" : "Facility"}
        </Badge>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs font-medium capitalize">
          {template.forEventType === "ALL" ? "All" : template.forEventType.toLowerCase()}
        </span>
      </td>
      <td className="px-3 py-2.5 text-center">
        <span className="text-xs font-medium">{template.hoursPerGame}h</span>
      </td>
      <td className="px-3 py-2.5 text-center">
        <span className="text-xs font-medium">{template.maxSlots}</span>
      </td>
      <td className="px-3 py-2.5 text-center">
        <span className="text-xs text-muted-foreground">
          {template._count.gameJobs}
        </span>
      </td>
      <td className="px-3 py-2.5 text-center">
        {template.active ? (
          <Badge
            variant="secondary"
            className="rounded-md text-[10px] font-normal bg-emerald-500/10 text-emerald-600"
          >
            Active
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="rounded-md text-[10px] font-normal bg-muted text-muted-foreground"
          >
            Inactive
          </Badge>
        )}
      </td>
      {canManage && (
        <td className="px-4 py-2.5 text-right">
          <div className="flex items-center justify-end gap-0.5">
            <TemplateForm template={template}>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Pencil className="h-3 w-3" />
              </Button>
            </TemplateForm>
            {isAdmin && (
              <ToggleActiveButton template={template} />
            )}
            <DeleteTemplateButton
              templateId={template.id}
              templateName={template.name}
            />
          </div>
        </td>
      )}
    </tr>
  );
}

function MobileTemplateRow({
  template,
  canManage,
  isAdmin,
}: {
  template: TemplateData;
  canManage: boolean;
  isAdmin: boolean;
}) {
  const isTeam = template.scope === "TEAM";

  return (
    <div
      className={cn(
        "px-4 py-3 flex items-center justify-between gap-3",
        !template.active && "opacity-50"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{template.name}</span>
          <Badge
            variant="outline"
            className="rounded-md text-[10px] gap-0.5 font-normal shrink-0"
          >
            {isTeam ? (
              <Users className="h-2.5 w-2.5" />
            ) : (
              <Building2 className="h-2.5 w-2.5" />
            )}
            {isTeam ? "Team" : "Facility"}
          </Badge>
          {!template.active && (
            <Badge
              variant="secondary"
              className="rounded-md text-[10px] font-normal bg-muted text-muted-foreground shrink-0"
            >
              Inactive
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
          <span className="shrink-0 capitalize">
            {template.forEventType === "ALL" ? "all events" : `${template.forEventType.toLowerCase()}s`}
          </span>
          <span className="flex items-center gap-0.5 shrink-0">
            <Clock className="h-2.5 w-2.5" />
            {template.hoursPerGame}h
          </span>
          <span className="shrink-0">
            max {template.maxSlots}
          </span>
          <span className="shrink-0">
            {template._count.gameJobs} job
            {template._count.gameJobs !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      {canManage && (
        <div className="flex items-center gap-0.5 shrink-0">
          <TemplateForm template={template}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </TemplateForm>
          {isAdmin && (
            <ToggleActiveButton template={template} />
          )}
          <DeleteTemplateButton
            templateId={template.id}
            templateName={template.name}
          />
        </div>
      )}
    </div>
  );
}

function ToggleActiveButton({ template }: { template: TemplateData }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    affectedSignups: number;
    volunteers: { name: string | null; email: string | null }[];
  } | null>(null);
  const router = useRouter();

  async function handleToggle() {
    if (template.active) {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/jobs/templates/${template.id}/deactivate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirm: false }),
          }
        );
        const data = await res.json();
        if (data.affectedSignups > 0) {
          setPreview(data);
          setOpen(true);
        } else {
          await confirmDeactivate();
        }
      } catch {
        toast.error("Failed to check signups");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const res = await fetch(`/api/jobs/templates/${template.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: template.name,
            description: template.description,
            scope: template.scope,
            hoursPerGame: template.hoursPerGame,
            active: true,
            askComfortLevel: template.askComfortLevel ?? false,
          }),
        });
        if (!res.ok) throw new Error("Failed to activate");
        toast.success("Template activated");
        router.refresh();
      } catch {
        toast.error("Failed to activate template");
      } finally {
        setLoading(false);
      }
    }
  }

  async function confirmDeactivate() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/jobs/templates/${template.id}/deactivate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        }
      );
      if (!res.ok) throw new Error("Failed to deactivate");
      const data = await res.json();
      toast.success(
        `Template deactivated. ${data.cancelledSignups} signup(s) cancelled.`
      );
      setOpen(false);
      setPreview(null);
      router.refresh();
    } catch {
      toast.error("Failed to deactivate template");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleToggle}
        disabled={loading}
        title={template.active ? "Deactivate" : "Activate"}
      >
        <div
          className={cn(
            "h-3 w-6 rounded-full transition-colors relative",
            template.active ? "bg-emerald-500" : "bg-muted-foreground/30"
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 h-2 w-2 rounded-full bg-white transition-all",
              template.active ? "left-3.5" : "left-0.5"
            )}
          />
        </div>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Deactivate {template.name}?
            </DialogTitle>
            <DialogDescription>
              This will cancel{" "}
              <strong>{preview?.affectedSignups} active signup(s)</strong> for
              future events. Affected volunteers will be notified by email.
            </DialogDescription>
          </DialogHeader>
          {preview && preview.volunteers.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-lg border border-border/50 p-3 space-y-1">
              {preview.volunteers.map((v, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  {v.name || "Unknown"} ({v.email || "no email"})
                </p>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeactivate}
              disabled={loading}
            >
              {loading ? "Deactivating..." : "Deactivate & Notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeleteTemplateButton({
  templateId,
  templateName,
}: {
  templateId: string;
  templateName: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/templates/${templateId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete");
      }
      toast.success("Template deleted");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Template</DialogTitle>
          <DialogDescription>
            Delete <strong>{templateName}</strong>? This also removes all
            associated game jobs.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Blackout Dates Manager ============

const DAYS_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface BlackoutData {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  scope: string;
  facilityId: string | null;
  eventTypes: string;
  facility?: { id: string; name: string } | null;
}

function BlackoutDatesManager({ facilities }: { facilities: FacilityOption[] }) {
  const [blackouts, setBlackouts] = useState<BlackoutData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formScope, setFormScope] = useState<"ORG_WIDE" | "FACILITY">("ORG_WIDE");
  const [formFacilityId, setFormFacilityId] = useState("");
  const [formEventTypes, setFormEventTypes] = useState("ALL");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchBlackouts = useCallback(async () => {
    try {
      const res = await fetch("/api/blackout-dates");
      if (res.ok) setBlackouts(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useState(() => { fetchBlackouts(); });

  async function handleCreate() {
    if (!formTitle || !formStartDate || !formEndDate) {
      toast.error("Title and dates are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/blackout-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          startDate: formStartDate,
          endDate: formEndDate,
          scope: formScope,
          facilityId: formScope === "FACILITY" ? formFacilityId : null,
          eventTypes: formEventTypes,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to create");
      }
      toast.success("Blackout date created");
      setShowForm(false);
      setFormTitle("");
      setFormStartDate("");
      setFormEndDate("");
      setFormScope("ORG_WIDE");
      setFormFacilityId("");
      setFormEventTypes("ALL");
      fetchBlackouts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/blackout-dates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Blackout date removed");
      fetchBlackouts();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Blackout Dates</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Block scheduling during holidays, maintenance windows, or other periods
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-xl shadow-md shadow-primary/15"
          onClick={() => setShowForm(true)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Blackout
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. July 4th Weekend"
                className="rounded-xl h-10"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <DatePicker
                  value={formStartDate}
                  onChange={setFormStartDate}
                  placeholder="Start"
                />
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <DatePicker
                  value={formEndDate}
                  onChange={setFormEndDate}
                  placeholder="End"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Scope</Label>
              <Select
                value={formScope}
                onValueChange={(v) => setFormScope((v ?? "ORG_WIDE") as "ORG_WIDE" | "FACILITY")}
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
            {formScope === "FACILITY" && (
              <div className="grid gap-2">
                <Label>Facility</Label>
                <Select
                  value={formFacilityId || "__none__"}
                  onValueChange={(v) => setFormFacilityId(v === "__none__" ? "" : v ?? "")}
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
                value={formEventTypes}
                onValueChange={(v) => setFormEventTypes(v ?? "ALL")}
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={saving}
                className="rounded-xl"
              >
                {saving ? "Creating..." : "Create Blackout"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : blackouts.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarOff className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No blackout dates</p>
            <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs">
              Add blackout dates to prevent scheduling during holidays or maintenance periods.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-border/50 overflow-hidden">
          <div className="divide-y divide-border/50">
            {blackouts.map((b) => (
              <div key={b.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{b.title}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {b.scope === "ORG_WIDE" ? "Org-wide" : b.facility?.name ?? "Facility"}
                    </Badge>
                    {b.eventTypes !== "ALL" && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {b.eventTypes}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {format(new Date(b.startDate), "MMM d, yyyy")} – {format(new Date(b.endDate), "MMM d, yyyy")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                  onClick={() => handleDelete(b.id)}
                  disabled={deleting === b.id}
                >
                  {deleting === b.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============ Scheduling Rules Manager ============

interface RuleData {
  id: string;
  teamId: string;
  subFacilityId: string | null;
  dayOfWeek: number;
  eventType: string;
  priority: number;
  team: { id: string; name: string; color: string };
}

function SchedulingRulesManager({ teams }: { teams: TeamOption[] }) {
  const [rules, setRules] = useState<RuleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formTeamId, setFormTeamId] = useState("");
  const [formDayOfWeek, setFormDayOfWeek] = useState("1");
  const [formEventType, setFormEventType] = useState("ALL");
  const [formPriority, setFormPriority] = useState("1");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/scheduling-rules");
      if (res.ok) setRules(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useState(() => { fetchRules(); });

  async function handleCreate() {
    if (!formTeamId) {
      toast.error("Team is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/scheduling-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: formTeamId,
          dayOfWeek: Number(formDayOfWeek),
          eventType: formEventType,
          priority: Number(formPriority),
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to create");
      }
      toast.success("Priority rule created");
      setShowForm(false);
      setFormTeamId("");
      setFormDayOfWeek("1");
      setFormEventType("ALL");
      setFormPriority("1");
      fetchRules();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/scheduling-rules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Rule removed");
      fetchRules();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Scheduling Priority Rules</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define team scheduling priorities. Lower numbers = higher priority. Higher-priority teams can bump lower-priority events.
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-xl shadow-md shadow-primary/15"
          onClick={() => setShowForm(true)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-2">
              <Label>Team</Label>
              <Select
                value={formTeamId || "__none__"}
                onValueChange={(v) => setFormTeamId(v === "__none__" ? "" : v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select a team</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="inline-block h-2.5 w-2.5 rounded-full mr-1.5" style={{ backgroundColor: t.color }} />
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Day of Week</Label>
                <Select value={formDayOfWeek} onValueChange={(v) => setFormDayOfWeek(v ?? "0")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_LABEL.map((d, i) => (
                      <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority (1 = highest)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                  className="rounded-xl h-10"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Event Type</Label>
              <Select value={formEventType} onValueChange={(v) => setFormEventType(v ?? "ALL")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Events</SelectItem>
                  <SelectItem value="GAME">Games Only</SelectItem>
                  <SelectItem value="PRACTICE">Practices Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={saving}
                className="rounded-xl"
              >
                {saving ? "Creating..." : "Create Rule"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No priority rules</p>
            <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs">
              Add rules to give teams scheduling priority on specific days. Higher-priority teams can automatically bump lower-priority events.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                <th className="text-left px-4 py-2.5">Team</th>
                <th className="text-left px-3 py-2.5">Day</th>
                <th className="text-left px-3 py-2.5">Type</th>
                <th className="text-center px-3 py-2.5">Priority</th>
                <th className="text-right px-4 py-2.5 w-[60px]" />
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: r.team.color }}
                      />
                      <span className="font-medium">{r.team.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">{DAYS_LABEL[r.dayOfWeek]}</td>
                  <td className="px-3 py-2.5 capitalize text-xs">
                    {r.eventType === "ALL" ? "All" : r.eventType.toLowerCase()}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge
                      variant={r.priority === 1 ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {r.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(r.id)}
                      disabled={deleting === r.id}
                    >
                      {deleting === r.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

