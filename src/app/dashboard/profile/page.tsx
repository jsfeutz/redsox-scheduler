"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, User, Lock, MessageSquare, Bell } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type NotifScope = "ALL_EVENTS" | "MY_TEAMS" | "SPECIFIC_TEAM";
type NotifChannel = "EMAIL" | "SMS" | "BOTH";

interface NotifRow {
  enabled: boolean;
  channel: NotifChannel;
  scope: NotifScope;
  teamId: string | null;
}

interface OrgTeam {
  id: string;
  name: string;
  color: string | null;
}

const NOTIFICATION_TRIGGERS = [
  {
    trigger: "EVENT_ADDED",
    label: "Event added",
    description: "When a new game, practice, or event is created.",
    defaultEnabled: false,
  },
  {
    trigger: "EVENT_CANCELLED",
    label: "Event cancelled",
    description: "When a scheduled event is removed from the calendar.",
    defaultEnabled: false,
  },
  {
    trigger: "EVENT_TIME_CHANGED",
    label: "Event time changed",
    description: "When the date or time of an event is updated.",
    defaultEnabled: false,
  },
  {
    trigger: "JOB_SIGNUP_CANCELLED",
    label: "Job signup cancelled",
    description: "When a volunteer cancels their signup for a job on one of your events.",
    defaultEnabled: false,
  },
  {
    trigger: "CLUB_EVENT_CHANGED",
    label: "Club event changes",
    description: "When club-level events (not tied to a specific team) are changed.",
    defaultEnabled: false,
  },
  {
    trigger: "SLOT_REQUEST",
    label: "Time slot change requests",
    description: "When someone requests to change a time slot on the schedule.",
    defaultEnabled: true,
  },
  {
    trigger: "UNFILLED_JOBS_24H",
    label: "Unfilled jobs (24h before event)",
    description: "Get notified when volunteer jobs are still open 24 hours before an event starts.",
    defaultEnabled: false,
  },
] as const;

const SCOPE_OPTIONS: { value: NotifScope; label: string }[] = [
  { value: "ALL_EVENTS", label: "All events" },
  { value: "MY_TEAMS", label: "My teams only" },
  { value: "SPECIFIC_TEAM", label: "Specific team" },
];

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [teams, setTeams] = useState<OrgTeam[]>([]);
  const [notifState, setNotifState] = useState<Record<string, NotifRow>>({});
  const [savingNotif, setSavingNotif] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
        if (data.phone) setPhone(data.phone);
        if (data.smsEnabled !== undefined) setSmsEnabled(data.smsEnabled);
        if (Array.isArray(data.teams)) setTeams(data.teams);

        const next: Record<string, NotifRow> = {};
        const subs = (data.notificationSubscriptions ?? []) as {
          trigger: string;
          channel: string;
          enabled: boolean;
          scope: string;
          teamId: string | null;
        }[];
        for (const row of NOTIFICATION_TRIGGERS) {
          const matches = subs.filter((s) => s.trigger === row.trigger);
          const hasEmail = matches.some((s) => s.channel === "EMAIL" && s.enabled);
          const hasSms = matches.some((s) => s.channel === "SMS" && s.enabled);
          const anyEnabled = matches.some((s) => s.enabled);
          const first = matches[0];
          let channel: NotifChannel = "EMAIL";
          if (hasEmail && hasSms) channel = "BOTH";
          else if (hasSms) channel = "SMS";
          else if (hasEmail) channel = "EMAIL";
          else if (first?.channel === "SMS") channel = "SMS";
          next[row.trigger] = {
            enabled: anyEnabled || (matches.length === 0 && row.defaultEnabled),
            channel,
            scope: (first?.scope as NotifScope) ?? "MY_TEAMS",
            teamId: first?.teamId ?? null,
          };
        }
        setNotifState(next);

        setLoaded(true);
      })
      .catch(() => toast.error("Failed to load profile"));
  }, []);

  function updateNotif(trigger: string, patch: Partial<NotifRow>) {
    setNotifState((s) => ({
      ...s,
      [trigger]: { ...s[trigger], ...patch },
    }));
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, smsEnabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update profile");
        return;
      }
      toast.success("Profile updated");
      await updateSession({ name: data.name, email: data.email });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveNotifications() {
    setSavingNotif(true);
    try {
      const eventNotificationPrefs = NOTIFICATION_TRIGGERS.map((row) => {
        const s = notifState[row.trigger];
        return {
          trigger: row.trigger,
          enabled: s?.enabled ?? row.defaultEnabled,
          channel: s?.channel ?? "EMAIL",
          scope: s?.scope ?? "MY_TEAMS",
          teamId: s?.scope === "SPECIFIC_TEAM" ? s?.teamId : null,
        };
      });
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventNotificationPrefs }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingNotif(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to change password");
        return;
      }
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingPassword(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings
        </p>
      </div>

      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="(920) 555-1234"
              />
              <p className="text-xs text-muted-foreground">
                Used for SMS reminders about your volunteer shifts.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              Role: <span className="capitalize font-medium">{session?.user?.role?.replace(/_/g, " ").toLowerCase()}</span>
            </div>
            <Button
              type="submit"
              disabled={savingProfile}
              className="rounded-xl"
            >
              {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
            <CardTitle className="text-base">SMS Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable SMS Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive text reminders about your volunteer shifts and schedule changes.
                </p>
              </div>
              <Switch
                checked={smsEnabled}
                onCheckedChange={async (checked) => {
                  setSmsEnabled(checked);
                  try {
                    const res = await fetch("/api/profile", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ smsEnabled: checked }),
                    });
                    if (!res.ok) throw new Error();
                    toast.success(checked ? "SMS notifications enabled" : "SMS notifications disabled");
                  } catch {
                    setSmsEnabled(!checked);
                    toast.error("Failed to update preference");
                  }
                }}
              />
            </div>
            {!phone && (
              <p className="text-xs text-amber-500">
                Add a phone number above to receive SMS notifications.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Message and data rates may apply. Reply STOP to opt out at any time.{" "}
              <a href="/sms-consent" className="underline">SMS Consent</a> |{" "}
              <a href="/privacy" className="underline">Privacy Policy</a>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Bell className="h-5 w-5 text-emerald-500" />
            </div>
            <CardTitle className="text-base">Notifications</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground pl-[52px] -mt-2">
            Get notified about schedule changes, cancellations, and volunteer activity.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIFICATION_TRIGGERS.map((row) => {
            const s = notifState[row.trigger];
            const enabled = s?.enabled ?? row.defaultEnabled;
            return (
              <div
                key={row.trigger}
                className="rounded-xl border border-border/50 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{row.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {row.description}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      updateNotif(row.trigger, { enabled: checked })
                    }
                  />
                </div>
                {enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Delivery</Label>
                      <Select
                        value={s?.channel ?? "EMAIL"}
                        onValueChange={(v) =>
                          updateNotif(row.trigger, { channel: v as NotifChannel })
                        }
                      >
                        <SelectTrigger className="h-9 rounded-xl text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMAIL">Email</SelectItem>
                          <SelectItem value="SMS">SMS</SelectItem>
                          <SelectItem value="BOTH">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Scope</Label>
                      <Select
                        value={s?.scope ?? "MY_TEAMS"}
                        onValueChange={(v) =>
                          updateNotif(row.trigger, {
                            scope: v as NotifScope,
                            teamId: v === "SPECIFIC_TEAM" ? s?.teamId : null,
                          })
                        }
                      >
                        <SelectTrigger className="h-9 rounded-xl text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCOPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {s?.scope === "SPECIFIC_TEAM" && (
                      <div className="grid gap-1.5 sm:col-span-2">
                        <Label className="text-xs">Team</Label>
                        <Select
                          value={s.teamId ?? ""}
                          onValueChange={(v) =>
                            updateNotif(row.trigger, { teamId: v || null })
                          }
                        >
                          <SelectTrigger className="h-9 rounded-xl text-sm">
                            <SelectValue placeholder="Choose a team…" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                <span className="flex items-center gap-2">
                                  {t.color && (
                                    <span
                                      className="inline-block h-3 w-3 rounded-full shrink-0"
                                      style={{ backgroundColor: t.color }}
                                    />
                                  )}
                                  {t.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <Button
            type="button"
            onClick={handleSaveNotifications}
            disabled={savingNotif}
            className="rounded-xl"
          >
            {savingNotif && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save notifications
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Lock className="h-5 w-5 text-amber-500" />
            </div>
            <CardTitle className="text-base">Change Password</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="At least 8 characters"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={savingPassword}
              variant="outline"
              className="rounded-xl"
            >
              {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
