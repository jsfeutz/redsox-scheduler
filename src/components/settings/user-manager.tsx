"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserRole } from "@prisma/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Pencil,
  Trash2,
  Loader2,
  UserPlus,
  Search,
  X,
  Mail,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InviteForm } from "./invite-form";

interface TeamMembership {
  id: string;
  role: string;
  team: { id: string; name: string };
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  teamMembers: TeamMembership[];
  coachOfTeams: { id: string; name: string }[];
}

interface InvitationData {
  id: string;
  email: string;
  role: string;
  status: string;
  teamId: string | null;
  teamRole: string | null;
  expiresAt: string;
  createdAt: string;
  team?: { id: string; name: string } | null;
}

type UnifiedRow =
  | { kind: "user"; data: UserData }
  | { kind: "invitation"; data: InvitationData };

interface TeamOption {
  id: string;
  name: string;
  headCoach: { id: string; name: string } | null;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
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

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE" | "INVITED";

interface UserManagerProps {
  currentUserId: string;
}

export function UserManager({ currentUserId }: UserManagerProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [invitations, setInvitations] = useState<InvitationData[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const router = useRouter();

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/organization/users");
      if (!res.ok) throw new Error();
      setUsers(await res.json());
    } catch {
      toast.error("Failed to load users");
    }
  }, []);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch("/api/invitations");
      if (!res.ok) throw new Error();
      setInvitations(await res.json());
    } catch {}
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/teams");
      if (!res.ok) throw new Error();
      setTeams(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchInvitations(), fetchTeams()]).finally(() =>
      setLoading(false)
    );
  }, [fetchUsers, fetchInvitations, fetchTeams]);

  function refreshAll() {
    fetchUsers();
    fetchInvitations();
    fetchTeams();
    router.refresh();
  }

  const pendingInvitations = invitations.filter((inv) => {
    if (inv.status !== "PENDING") return false;
    const expired = new Date() > new Date(inv.expiresAt);
    return !expired;
  });

  const expiredInvitations = invitations.filter((inv) => {
    if (inv.status === "ACCEPTED") return false;
    if (inv.status === "EXPIRED") return true;
    if (inv.status === "PENDING" && new Date() > new Date(inv.expiresAt))
      return true;
    return false;
  });

  const acceptedEmails = new Set(
    invitations.filter((i) => i.status === "ACCEPTED").map((i) => i.email)
  );
  const pendingEmails = new Set(pendingInvitations.map((i) => i.email));

  const unified: UnifiedRow[] = [];

  for (const u of users) {
    unified.push({ kind: "user", data: u });
  }

  for (const inv of pendingInvitations) {
    if (!users.some((u) => u.email === inv.email)) {
      unified.push({ kind: "invitation", data: inv });
    }
  }

  for (const inv of expiredInvitations) {
    if (
      !users.some((u) => u.email === inv.email) &&
      !pendingInvitations.some((p) => p.email === inv.email)
    ) {
      unified.push({ kind: "invitation", data: inv });
    }
  }

  const filtered = unified.filter((row) => {
    const email = row.kind === "user" ? row.data.email : row.data.email;
    const name = row.kind === "user" ? row.data.name : "";
    const matchesSearch =
      !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "ACTIVE")
      return row.kind === "user" && row.data.active;
    if (statusFilter === "INACTIVE")
      return row.kind === "user" && !row.data.active;
    if (statusFilter === "INVITED") return row.kind === "invitation";
    return true;
  });

  const activeCount = users.filter((u) => u.active).length;
  const inactiveCount = users.filter((u) => !u.active).length;
  const invitedCount = pendingInvitations.length;

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
              <Users className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <CardTitle className="text-base">Users</CardTitle>
              <CardDescription className="text-xs">
                {activeCount} active
                {inactiveCount > 0 && `, ${inactiveCount} inactive`}
                {invitedCount > 0 && `, ${invitedCount} invited`}
              </CardDescription>
            </div>
          </div>
          <InviteForm onCreated={refreshAll}>
            <Button size="sm">
              <UserPlus className="mr-1.5 h-4 w-4" />
              Invite User
            </Button>
          </InviteForm>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-card/30 p-1.5 w-fit">
                {(
                  [
                    { key: "ALL", label: "All" },
                    { key: "ACTIVE", label: "Active" },
                    { key: "INACTIVE", label: "Inactive" },
                    { key: "INVITED", label: "Invited" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setStatusFilter(s.key)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all active:scale-95",
                      statusFilter === s.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {search || statusFilter !== "ALL"
                  ? "No users match your filter."
                  : "No users found."}
              </div>
            ) : (
              <>
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Team(s)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[120px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((row) =>
                        row.kind === "user" ? (
                          <ActiveUserRow
                            key={`user-${row.data.id}`}
                            user={row.data}
                            teams={teams}
                            currentUserId={currentUserId}
                            onRefresh={refreshAll}
                          />
                        ) : (
                          <InvitedUserRow
                            key={`inv-${row.data.id}`}
                            invitation={row.data}
                            onRefresh={refreshAll}
                          />
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="sm:hidden divide-y divide-border/50">
                  {filtered.map((row) =>
                    row.kind === "user" ? (
                      <MobileActiveUserRow
                        key={`user-${row.data.id}`}
                        user={row.data}
                        teams={teams}
                        currentUserId={currentUserId}
                        onRefresh={refreshAll}
                      />
                    ) : (
                      <MobileInvitedRow
                        key={`inv-${row.data.id}`}
                        invitation={row.data}
                        onRefresh={refreshAll}
                      />
                    )
                  )}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ row }: { row: UnifiedRow }) {
  if (row.kind === "invitation") {
    const inv = row.data;
    const expired =
      inv.status === "EXPIRED" ||
      (inv.status === "PENDING" && new Date() > new Date(inv.expiresAt));
    if (expired) {
      return (
        <Badge
          variant="secondary"
          className="rounded-md text-[10px] bg-muted text-muted-foreground gap-1"
        >
          <Clock className="h-2.5 w-2.5" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="rounded-md text-[10px] bg-blue-500/10 text-blue-600 gap-1"
      >
        <Mail className="h-2.5 w-2.5" />
        Invited
      </Badge>
    );
  }
  if (row.data.active) {
    return (
      <Badge
        variant="secondary"
        className="rounded-md text-[10px] bg-emerald-500/10 text-emerald-600"
      >
        Active
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="rounded-md text-[10px] bg-red-500/10 text-red-600"
    >
      Inactive
    </Badge>
  );
}

function ActiveUserRow({
  user,
  teams,
  currentUserId,
  onRefresh,
}: {
  user: UserData;
  teams: TeamOption[];
  currentUserId: string;
  onRefresh: () => void;
}) {
  const isSelf = user.id === currentUserId;
  const teamAssignments = getTeamAssignments(user);

  return (
    <TableRow className={cn(!user.active && "opacity-50")}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{user.name}</span>
          {isSelf && (
            <Badge variant="outline" className="text-[10px] rounded-md">
              You
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {user.email}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="rounded-md text-[10px]">
          {user.role.replace(/_/g, " ")}
        </Badge>
      </TableCell>
      <TableCell>
        {teamAssignments.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {teamAssignments.map((ta) => (
              <Badge
                key={ta.teamId + ta.role}
                variant="outline"
                className="rounded-md text-[10px] font-normal"
              >
                {ta.teamName} — {ta.roleLabel}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge row={{ kind: "user", data: user }} />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-0.5">
          <EditUserDialog user={user} isSelf={isSelf} onSaved={onRefresh} />
          <AssignTeamDialog user={user} teams={teams} onSaved={onRefresh} />
          {!isSelf && <DeleteUserDialog user={user} onDeleted={onRefresh} />}
        </div>
      </TableCell>
    </TableRow>
  );
}

function InvitedUserRow({
  invitation,
  onRefresh,
}: {
  invitation: InvitationData;
  onRefresh: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const expired =
    invitation.status === "EXPIRED" ||
    (invitation.status === "PENDING" &&
      new Date() > new Date(invitation.expiresAt));

  async function handleCancel() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/invitations/${invitation.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Invitation cancelled");
      onRefresh();
    } catch {
      toast.error("Failed to cancel invitation");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <TableRow className="opacity-75">
      <TableCell>
        <span className="text-muted-foreground italic text-sm">
          Pending signup
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {invitation.email}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="rounded-md text-[10px]">
          {invitation.role.replace(/_/g, " ")}
        </Badge>
      </TableCell>
      <TableCell>
        {invitation.team ? (
          <Badge variant="outline" className="rounded-md text-[10px] font-normal">
            {invitation.team.name}
            {invitation.teamRole && (
              <> — {invitation.teamRole.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</>
            )}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge row={{ kind: "invitation", data: invitation }} />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-0.5">
          {!expired && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCancel}
              disabled={deleting}
              title="Cancel invitation"
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3 text-destructive" />
              )}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function MobileActiveUserRow({
  user,
  teams,
  currentUserId,
  onRefresh,
}: {
  user: UserData;
  teams: TeamOption[];
  currentUserId: string;
  onRefresh: () => void;
}) {
  const isSelf = user.id === currentUserId;
  const teamAssignments = getTeamAssignments(user);

  return (
    <div className={cn("px-1 py-3", !user.active && "opacity-50")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{user.name}</span>
            {isSelf && (
              <Badge
                variant="outline"
                className="text-[10px] rounded-md shrink-0"
              >
                You
              </Badge>
            )}
            <StatusBadge row={{ kind: "user", data: user }} />
          </div>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="secondary" className="rounded-md text-[10px]">
              {user.role.replace(/_/g, " ")}
            </Badge>
            {teamAssignments.map((ta) => (
              <Badge
                key={ta.teamId + ta.role}
                variant="outline"
                className="rounded-md text-[10px] font-normal"
              >
                {ta.teamName} — {ta.roleLabel}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <EditUserDialog user={user} isSelf={isSelf} onSaved={onRefresh} />
          <AssignTeamDialog user={user} teams={teams} onSaved={onRefresh} />
          {!isSelf && <DeleteUserDialog user={user} onDeleted={onRefresh} />}
        </div>
      </div>
    </div>
  );
}

function MobileInvitedRow({
  invitation,
  onRefresh,
}: {
  invitation: InvitationData;
  onRefresh: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const expired =
    invitation.status === "EXPIRED" ||
    (invitation.status === "PENDING" &&
      new Date() > new Date(invitation.expiresAt));

  async function handleCancel() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/invitations/${invitation.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Invitation cancelled");
      onRefresh();
    } catch {
      toast.error("Failed to cancel invitation");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="px-1 py-3 opacity-75">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground italic truncate">
              Pending signup
            </span>
            <StatusBadge row={{ kind: "invitation", data: invitation }} />
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {invitation.email}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="secondary" className="rounded-md text-[10px]">
              {invitation.role.replace(/_/g, " ")}
            </Badge>
            {invitation.team && (
              <Badge
                variant="outline"
                className="rounded-md text-[10px] font-normal"
              >
                {invitation.team.name}
              </Badge>
            )}
          </div>
        </div>
        {!expired && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleCancel}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3 text-destructive" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function getTeamAssignments(user: UserData) {
  const assignments: {
    teamId: string;
    teamName: string;
    role: string;
    roleLabel: string;
  }[] = [];
  const seen = new Set<string>();

  for (const tm of user.teamMembers) {
    const key = `${tm.team.id}:${tm.role}`;
    if (!seen.has(key)) {
      seen.add(key);
      assignments.push({
        teamId: tm.team.id,
        teamName: tm.team.name,
        role: tm.role,
        roleLabel: tm.role
          .replace(/_/g, " ")
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      });
    }
  }

  for (const t of user.coachOfTeams) {
    const key = `${t.id}:HEAD_COACH`;
    if (!seen.has(key)) {
      seen.add(key);
      assignments.push({
        teamId: t.id,
        teamName: t.name,
        role: "HEAD_COACH",
        roleLabel: "Head Coach",
      });
    }
  }

  return assignments;
}

function EditUserDialog({
  user,
  isSelf,
  onSaved,
}: {
  user: UserData;
  isSelf: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [active, setActive] = useState(user.active);

  function handleOpen() {
    setName(user.name);
    setRole(user.role);
    setActive(user.active);
    setOpen(true);
  }

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/organization/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ...(isSelf ? {} : { role, active }),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update user");
      }
      toast.success("User updated");
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
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
        onClick={handleOpen}
        title="Edit user"
      >
        <Pencil className="h-3 w-3" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>{user.email}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {!isSelf && (
              <>
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select
                    value={role}
                    onValueChange={(v) => v && setRole(v)}
                    items={Object.fromEntries(
                      ROLE_OPTIONS.map((o) => [o.value, o.label])
                    )}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((o) => (
                        <SelectItem
                          key={o.value}
                          value={o.value}
                          label={o.label}
                        >
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Active</p>
                    <p className="text-xs text-muted-foreground">
                      Inactive users cannot log in
                    </p>
                  </div>
                  <button onClick={() => setActive(!active)}>
                    <div
                      className={cn(
                        "h-5 w-9 rounded-full transition-colors relative cursor-pointer",
                        active ? "bg-emerald-500" : "bg-muted-foreground/30"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all shadow-sm",
                          active ? "left-[18px]" : "left-0.5"
                        )}
                      />
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !name.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AssignTeamDialog({
  user,
  teams,
  onSaved,
}: {
  user: UserData;
  teams: TeamOption[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teamId, setTeamId] = useState("");
  const [teamRole, setTeamRole] = useState("HEAD_COACH");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const currentAssignments = getTeamAssignments(user);

  function handleOpen() {
    setTeamId("");
    setTeamRole("HEAD_COACH");
    setOpen(true);
  }

  async function handleAssign() {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/organization/users/${user.id}/assign-team`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId, teamRole }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign");
      }
      toast.success("Team assignment updated");
      setTeamId("");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(teamIdToRemove: string) {
    setRemovingId(teamIdToRemove);
    try {
      const res = await fetch(
        `/api/organization/users/${user.id}/assign-team?teamId=${teamIdToRemove}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      toast.success("Removed from team");
      onSaved();
    } catch {
      toast.error("Failed to remove from team");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleOpen}
        title="Assign to team"
      >
        <UserPlus className="h-3 w-3" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Team Assignments</DialogTitle>
            <DialogDescription>
              {user.name} ({user.email})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {currentAssignments.length > 0 && (
              <div className="grid gap-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Current Teams
                </Label>
                <div className="space-y-2">
                  {currentAssignments.map((a) => (
                    <div
                      key={a.teamId + a.role}
                      className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{a.teamName}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.roleLabel}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemove(a.teamId)}
                        disabled={removingId === a.teamId}
                      >
                        {removingId === a.teamId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <X className="h-3 w-3 text-destructive" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Add to Team
              </Label>
              <Select
                value={teamId}
                onValueChange={(v) => v && setTeamId(v)}
                items={Object.fromEntries(teams.map((t) => [t.id, t.name]))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
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
            </div>

            {teamId && (
              <div className="grid gap-2">
                <Label>Team Role</Label>
                <Select
                  value={teamRole}
                  onValueChange={(v) => v && setTeamRole(v)}
                  items={Object.fromEntries(
                    TEAM_ROLE_OPTIONS.map((o) => [o.value, o.label])
                  )}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} label={o.label}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Done
            </Button>
            {teamId && (
              <Button onClick={handleAssign} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign to Team"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeleteUserDialog({
  user,
  onDeleted,
}: {
  user: UserData;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/organization/users/${user.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("User deleted");
      setOpen(false);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
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
        onClick={() => setOpen(true)}
        title="Delete user"
      >
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Permanently delete <strong>{user.name}</strong> ({user.email})?
              This will remove all their team memberships and data. This action
              cannot be undone.
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
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
