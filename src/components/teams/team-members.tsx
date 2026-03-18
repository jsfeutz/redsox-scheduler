"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Trash2,
  Loader2,
  CheckCircle2,
  Copy,
  Mail,
} from "lucide-react";

interface TeamMember {
  id: string;
  role: "HEAD_COACH" | "ASSISTANT_COACH" | "TEAM_MANAGER";
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface TeamMembersProps {
  teamId: string;
  canManage: boolean;
}

const roleColors: Record<string, string> = {
  HEAD_COACH: "bg-red-500/15 text-red-400 border-red-500/20",
  ASSISTANT_COACH: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  TEAM_MANAGER: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const roleLabels: Record<string, string> = {
  HEAD_COACH: "Head Coach",
  ASSISTANT_COACH: "Asst. Coach",
  TEAM_MANAGER: "Manager",
};

export function TeamMembers({ teamId, canManage }: TeamMembersProps) {
  const { data: session } = useSession();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members`);
      if (!res.ok) throw new Error("Failed to load members");
      const data = await res.json();
      setMembers(data);
    } catch {
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleRemove(userId: string, userName: string | null) {
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
      toast.success(`${userName || "Member"} removed from team`);
      setMembers((prev) => prev.filter((m) => m.user.id !== userId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">No staff assigned</p>
      ) : (
        <div className="space-y-1.5">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent/30 transition-colors group"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                {member.user.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate leading-tight">
                  {member.user.name || member.user.email}
                </p>
                {member.user.name && (
                  <p className="text-[11px] text-muted-foreground truncate leading-tight">
                    {member.user.email}
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] rounded-lg shrink-0 ${roleColors[member.role]}`}
              >
                {roleLabels[member.role]}
              </Badge>
              {canManage && member.user.id !== session?.user?.id && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  disabled={removingId === member.user.id}
                  onClick={() =>
                    handleRemove(member.user.id, member.user.name)
                  }
                >
                  {removingId === member.user.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3 text-destructive" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <InviteMemberDialog teamId={teamId} onSuccess={fetchMembers} />
      )}
    </div>
  );
}

function InviteMemberDialog({
  teamId,
  onSuccess,
}: {
  teamId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [teamRole, setTeamRole] = useState<string>("ASSISTANT_COACH");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  function resetForm() {
    setEmail("");
    setName("");
    setTeamRole("ASSISTANT_COACH");
    setInviteLink(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          role: "COACH",
          teamId,
          teamRole,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to send invitation");
      }

      const data = await res.json();
      setInviteLink(data.inviteLink || null);
      toast.success("Invitation sent!");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger render={<span />}>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground rounded-xl text-xs h-8 mt-1"
        >
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Invite Team Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join this team as a coach or manager.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>Invitation sent to {email}!</span>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Invite Link
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteLink}
                  className="h-10 rounded-xl text-xs font-mono"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-xl h-10"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    toast.success("Link copied!");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="invite-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="coach@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl pl-10"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invite-name">Name (optional)</Label>
              <Input
                id="invite-name"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={teamRole} onValueChange={(v) => v && setTeamRole(v)}>
                <SelectTrigger className="w-full h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASSISTANT_COACH">
                    Assistant Coach
                  </SelectItem>
                  <SelectItem value="TEAM_MANAGER">Team Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Send Invite
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
