"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserRole } from "@prisma/client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Loader2, AlertTriangle } from "lucide-react";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: UserRole.ADMIN, label: "Admin" },
  { value: UserRole.SCHEDULE_MANAGER, label: "Schedule Manager" },
  { value: UserRole.FACILITY_MANAGER, label: "Facility Manager" },
  { value: UserRole.COACH, label: "Coach" },
  { value: UserRole.TEAM_ADMIN, label: "Team Admin" },
];

const TEAM_ROLE_OPTIONS = [
  { value: "HEAD_COACH", label: "Head Coach" },
  { value: "ASSISTANT_COACH", label: "Assistant Coach" },
  { value: "TEAM_MANAGER", label: "Team Manager" },
];

interface TeamInfo {
  id: string;
  name: string;
  headCoach: { id: string; name: string; email: string } | null;
  members: { role: string; user: { id: string; name: string; email: string } }[];
}

interface InviteFormProps {
  onCreated: () => void;
  children: React.ReactNode;
}

export function InviteForm({ onCreated, children }: InviteFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>(UserRole.COACH);
  const [teamId, setTeamId] = useState<string>("");
  const [teamRole, setTeamRole] = useState<string>("HEAD_COACH");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const showTeamSection = role === UserRole.COACH || role === UserRole.TEAM_ADMIN;

  useEffect(() => {
    if (open && teams.length === 0) {
      setTeamsLoading(true);
      fetch("/api/teams")
        .then((r) => r.json())
        .then((data) => setTeams(data))
        .catch(() => {})
        .finally(() => setTeamsLoading(false));
    }
  }, [open]);

  const selectedTeam = teams.find((t) => t.id === teamId);

  const currentHolder = (() => {
    if (!selectedTeam || !teamRole) return null;
    if (teamRole === "HEAD_COACH" && selectedTeam.headCoach) {
      return selectedTeam.headCoach;
    }
    const member = selectedTeam.members.find((m) => m.role === teamRole);
    return member?.user ?? null;
  })();

  function resetForm() {
    setEmail("");
    setRole(UserRole.COACH);
    setTeamId("");
    setTeamRole("HEAD_COACH");
    setInviteLink(null);
    setCopied(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: Record<string, string> = {
        email: email.trim(),
        role,
      };

      if (showTeamSection && teamId) {
        payload.teamId = teamId;
        payload.teamRole = teamRole;
      }

      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create invitation");
      }

      const invitation = await res.json();
      const link = `${window.location.origin}/invite/${invitation.token}`;
      setInviteLink(link);
      toast.success("Invitation created & email sent");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<span />}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Invitation Link</Label>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                An email has been sent. You can also share this link directly. It expires in 120 days.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
              <Button
                type="button"
                onClick={() => {
                  resetForm();
                }}
              >
                Invite Another
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="invite-email">Email *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="coach@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Role *</Label>
              <Select value={role} onValueChange={(v) => v && setRole(v)} items={Object.fromEntries(ROLE_OPTIONS.map((o) => [o.value, o.label]))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showTeamSection && (
              <>
                <div className="grid gap-2">
                  <Label>Assign to Team</Label>
                  {teamsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading teams...
                    </div>
                  ) : (
                    <Select value={teamId} onValueChange={(v) => v && setTeamId(v)} items={Object.fromEntries(teams.map((t) => [t.id, t.name]))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a team (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id} label={t.name}>
                            <div className="flex items-center justify-between w-full gap-2">
                              <span>{t.name}</span>
                              {t.headCoach && (
                                <span className="text-xs text-muted-foreground">
                                  Coach: {t.headCoach.name}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {teamId && (
                  <div className="grid gap-2">
                    <Label>Team Role *</Label>
                    <Select value={teamRole} onValueChange={(v) => v && setTeamRole(v)} items={Object.fromEntries(TEAM_ROLE_OPTIONS.map((o) => [o.value, o.label]))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select team role" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEAM_ROLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {currentHolder && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        This will replace {currentHolder.name}
                      </p>
                      <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                        {currentHolder.name} ({currentHolder.email}) is currently the{" "}
                        {TEAM_ROLE_OPTIONS.find((o) => o.value === teamRole)?.label ?? teamRole}{" "}
                        for {selectedTeam?.name}. They will be removed from this role and notified when the invitation is accepted.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Invitation"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
