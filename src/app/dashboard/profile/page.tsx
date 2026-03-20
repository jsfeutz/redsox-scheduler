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

const ADMIN_NOTIFY_EVENTS = [
  {
    event: "JOB_CANCELLATION",
    label: "Job cancellations",
    description:
      "When a volunteer cancels a shift (e.g. via the link in their confirmation email).",
  },
  {
    event: "UNFILLED_JOBS_24H",
    label: "Unfilled jobs (24 hours before)",
    description:
      "Alert when a public shift is still open about 24 hours before the event starts.",
  },
  {
    event: "UNFILLED_JOBS_WEEK",
    label: "Unfilled jobs (weekly digest)",
    description:
      "Every Monday, a summary of open public shifts in the next 7 days (requires a scheduled cron).",
  },
] as const;

type NotifyChannel = "EMAIL" | "SMS" | "BOTH";

function canEditAdminNotifications(role: string | undefined) {
  return role === "ADMIN" || role === "SCHEDULE_MANAGER";
}

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
  const [notifState, setNotifState] = useState<
    Record<string, { enabled: boolean; channel: NotifyChannel }>
  >({});
  const [savingNotif, setSavingNotif] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
        if (data.phone) setPhone(data.phone);
        if (data.smsEnabled !== undefined) setSmsEnabled(data.smsEnabled);
        const next: Record<string, { enabled: boolean; channel: NotifyChannel }> = {};
        for (const row of ADMIN_NOTIFY_EVENTS) {
          const found = (data.adminNotificationPrefs as { event: string; channel: string; enabled: boolean }[] | undefined)?.find(
            (p) => p.event === row.event
          );
          next[row.event] = {
            enabled: found?.enabled ?? false,
            channel: (found?.channel as NotifyChannel) || "EMAIL",
          };
        }
        setNotifState(next);
        setLoaded(true);
      })
      .catch(() => toast.error("Failed to load profile"));
  }, []);

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
    if (!canEditAdminNotifications(session?.user?.role)) return;
    setSavingNotif(true);
    try {
      const notificationPrefs = ADMIN_NOTIFY_EVENTS.map((row) => ({
        event: row.event,
        enabled: notifState[row.event]?.enabled ?? false,
        channel: notifState[row.event]?.channel ?? "EMAIL",
      }));
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPrefs }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save notification preferences");
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

      {canEditAdminNotifications(session?.user?.role) && (
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                <Bell className="h-5 w-5 text-violet-500" />
              </div>
              <CardTitle className="text-base">Admin notifications</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground pl-[52px] -mt-2">
              Choose how you want to be notified about volunteer staffing. SMS uses your phone number above and respects the SMS toggle.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {ADMIN_NOTIFY_EVENTS.map((row) => (
              <div
                key={row.event}
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
                    checked={notifState[row.event]?.enabled ?? false}
                    onCheckedChange={(checked) =>
                      setNotifState((s) => ({
                        ...s,
                        [row.event]: {
                          enabled: checked,
                          channel: s[row.event]?.channel ?? "EMAIL",
                        },
                      }))
                    }
                  />
                </div>
                {(notifState[row.event]?.enabled ?? false) && (
                  <div className="grid gap-1.5 pt-1">
                    <Label className="text-xs">Delivery</Label>
                    <Select
                      value={notifState[row.event]?.channel ?? "EMAIL"}
                      onValueChange={(v) =>
                        setNotifState((s) => ({
                          ...s,
                          [row.event]: {
                            enabled: s[row.event]?.enabled ?? true,
                            channel: (v as NotifyChannel) || "EMAIL",
                          },
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 rounded-xl text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMAIL">Email only</SelectItem>
                        <SelectItem value="SMS">Text only</SelectItem>
                        <SelectItem value="BOTH">Email and text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}
            <Button
              type="button"
              onClick={handleSaveNotifications}
              disabled={savingNotif}
              className="rounded-xl"
            >
              {savingNotif && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save notification preferences
            </Button>
          </CardContent>
        </Card>
      )}

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
