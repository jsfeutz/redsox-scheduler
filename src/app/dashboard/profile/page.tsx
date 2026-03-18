"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, User, Lock, MessageSquare } from "lucide-react";

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

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
        if (data.phone) setPhone(data.phone);
        if (data.smsEnabled !== undefined) setSmsEnabled(data.smsEnabled);
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
