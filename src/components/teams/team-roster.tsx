"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Users,
  Plus,
  Trash2,
  UserPlus,
  ChevronDown,
  Search,
  Loader2,
  X,
  Phone,
  Mail,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VolunteerData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  relationship: string;
}

interface PlayerData {
  id: string;
  name: string;
  number: string | null;
  active: boolean;
  volunteers: VolunteerData[];
}

interface ParticipationData {
  playerId: string;
  totalHours: number;
  requiredHours: number;
}

interface TeamRosterProps {
  teamId: string;
  canManage: boolean;
}

const RELATIONSHIPS = ["Parent", "Guardian", "Family Member", "Other"];

export function TeamRoster({ teamId, canManage }: TeamRosterProps) {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [participation, setParticipation] = useState<Map<string, ParticipationData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [newVolunteers, setNewVolunteers] = useState<{ name: string; email: string; phone: string; relationship: string }[]>([{ name: "", email: "", phone: "", relationship: "Parent" }]);
  const [saving, setSaving] = useState(false);

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    try {
      const [rosterRes, partRes] = await Promise.all([
        fetch(`/api/teams/${teamId}/roster`),
        fetch(`/api/teams/${teamId}/roster/participation`),
      ]);
      if (rosterRes.ok) setPlayers(await rosterRes.json());
      if (partRes.ok) {
        const data: ParticipationData[] = await partRes.json();
        setParticipation(new Map(data.map((p) => [p.playerId, p])));
      }
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const filtered = filter
    ? players.filter(
        (p) =>
          p.name.toLowerCase().includes(filter.toLowerCase()) ||
          p.number?.includes(filter) ||
          p.volunteers.some((v) => v.name.toLowerCase().includes(filter.toLowerCase()))
      )
    : players;

  function resetAddPlayerForm() {
    setNewPlayerName("");
    setNewPlayerNumber("");
    setNewVolunteers([{ name: "", email: "", phone: "", relationship: "Parent" }]);
  }

  function updateNewVolunteer(index: number, field: string, value: string) {
    setNewVolunteers((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  }

  function addNewVolunteerRow() {
    setNewVolunteers((prev) => [...prev, { name: "", email: "", phone: "", relationship: "Parent" }]);
  }

  function removeNewVolunteerRow(index: number) {
    setNewVolunteers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAddPlayer() {
    if (!newPlayerName.trim()) return;
    setSaving(true);
    try {
      const volunteers = newVolunteers.filter((v) => v.name.trim());
      const res = await fetch(`/api/teams/${teamId}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPlayerName.trim(),
          number: newPlayerNumber.trim() || null,
          volunteers,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add player");
      }
      toast.success(`${newPlayerName.trim()} added to roster`);
      resetAddPlayerForm();
      setShowAddPlayer(false);
      fetchRoster();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add player");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePlayer(playerId: string, playerName: string) {
    try {
      const res = await fetch(`/api/teams/${teamId}/roster/${playerId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success(`${playerName} removed from roster`);
      fetchRoster();
    } catch {
      toast.error("Failed to remove player");
    }
  }

  async function handleToggleActive(player: PlayerData) {
    try {
      const res = await fetch(`/api/teams/${teamId}/roster/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !player.active }),
      });
      if (!res.ok) throw new Error();
      toast.success(player.active ? "Player deactivated" : "Player activated");
      fetchRoster();
    } catch {
      toast.error("Failed to update player");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players or volunteers..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        {canManage && (
          <Button
            size="sm"
            className="rounded-xl shadow-md shadow-primary/15"
            onClick={() => setShowAddPlayer(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Player
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {players.length} player{players.length !== 1 ? "s" : ""} on roster
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {players.length === 0
                ? "No players on the roster yet."
                : "No players match your search."}
            </p>
            {canManage && players.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-xl"
                onClick={() => setShowAddPlayer(true)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add your first player
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              teamId={teamId}
              canManage={canManage}
              participation={participation.get(player.id)}
              expanded={expandedId === player.id}
              onToggle={() =>
                setExpandedId(expandedId === player.id ? null : player.id)
              }
              onDelete={() => handleDeletePlayer(player.id, player.name)}
              onToggleActive={() => handleToggleActive(player)}
              onRefresh={fetchRoster}
            />
          ))}
        </div>
      )}

      <Dialog open={showAddPlayer} onOpenChange={(open) => { setShowAddPlayer(open); if (!open) resetAddPlayerForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Player</DialogTitle>
            <DialogDescription>
              Add a new player and their parent/volunteer contacts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Player Name *</Label>
                <Input
                  placeholder="Full name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Jersey Number</Label>
                <Input
                  placeholder="Optional"
                  value={newPlayerNumber}
                  onChange={(e) => setNewPlayerNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Parents / Volunteers</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addNewVolunteerRow}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Another
                </Button>
              </div>
              {newVolunteers.map((vol, i) => (
                <Card key={i} className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Contact {i + 1}</span>
                      {newVolunteers.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeNewVolunteerRow(i)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Name *"
                        value={vol.name}
                        onChange={(e) => updateNewVolunteer(i, "name", e.target.value)}
                      />
                      <Select value={vol.relationship} onValueChange={(v) => { if (v) updateNewVolunteer(i, "relationship", v); }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIPS.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Email"
                        type="email"
                        value={vol.email}
                        onChange={(e) => updateNewVolunteer(i, "email", e.target.value)}
                      />
                      <Input
                        placeholder="Phone"
                        type="tel"
                        value={vol.phone}
                        onChange={(e) => updateNewVolunteer(i, "phone", e.target.value)}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPlayer(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddPlayer}
              disabled={saving || !newPlayerName.trim()}
            >
              {saving ? "Adding..." : "Add Player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlayerCard({
  player,
  teamId,
  canManage,
  participation,
  expanded,
  onToggle,
  onDelete,
  onToggleActive,
  onRefresh,
}: {
  player: PlayerData;
  teamId: string;
  canManage: boolean;
  participation?: ParticipationData;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onRefresh: () => void;
}) {
  const [showAddVolunteer, setShowAddVolunteer] = useState(false);
  const [volName, setVolName] = useState("");
  const [volEmail, setVolEmail] = useState("");
  const [volPhone, setVolPhone] = useState("");
  const [volRelationship, setVolRelationship] = useState("Parent");
  const [savingVol, setSavingVol] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEditPlayer, setShowEditPlayer] = useState(false);
  const [editName, setEditName] = useState(player.name);
  const [editNumber, setEditNumber] = useState(player.number || "");
  const [savingEdit, setSavingEdit] = useState(false);

  async function handleAddVolunteer() {
    if (!volName.trim()) return;
    setSavingVol(true);
    try {
      const res = await fetch(
        `/api/teams/${teamId}/roster/${player.id}/volunteers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: volName.trim(),
            email: volEmail.trim() || null,
            phone: volPhone.trim() || null,
            relationship: volRelationship,
          }),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(`${volName.trim()} added as volunteer`);
      setVolName("");
      setVolEmail("");
      setVolPhone("");
      setVolRelationship("Parent");
      setShowAddVolunteer(false);
      onRefresh();
    } catch {
      toast.error("Failed to add volunteer");
    } finally {
      setSavingVol(false);
    }
  }

  async function handleRemoveVolunteer(volunteerId: string) {
    try {
      const res = await fetch(
        `/api/teams/${teamId}/roster/${player.id}/volunteers?volunteerId=${volunteerId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      toast.success("Volunteer removed");
      onRefresh();
    } catch {
      toast.error("Failed to remove volunteer");
    }
  }

  async function handleEditPlayer() {
    if (!editName.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/roster/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          number: editNumber.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Player updated");
      setShowEditPlayer(false);
      onRefresh();
    } catch {
      toast.error("Failed to update player");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <Card className={cn("rounded-2xl border-border/50 overflow-hidden", !player.active && "opacity-60")}>
      <CardContent className="py-0">
        <button
          type="button"
          className="w-full py-3 text-left flex items-center justify-between gap-3"
          onClick={onToggle}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
              {player.number || player.name[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">{player.name}</p>
                {player.number && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                    #{player.number}
                  </Badge>
                )}
                {!player.active && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{player.volunteers.length} volunteer{player.volunteers.length !== 1 ? "s" : ""}</span>
                {participation && participation.requiredHours > 0 && (
                  <>
                    <span className="text-border">|</span>
                    <span className={cn(
                      "font-medium",
                      participation.totalHours >= participation.requiredHours
                        ? "text-emerald-600"
                        : participation.totalHours > 0
                          ? "text-amber-600"
                          : "text-red-500"
                    )}>
                      {participation.totalHours} / {participation.requiredHours} hrs
                    </span>
                  </>
                )}
                {participation && participation.requiredHours <= 0 && participation.totalHours > 0 && (
                  <>
                    <span className="text-border">|</span>
                    <span className="font-medium text-emerald-600">{participation.totalHours} hrs</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform shrink-0",
              expanded && "rotate-180"
            )}
          />
        </button>

        {expanded && (
          <div className="pb-4 space-y-3 border-t border-border/30 pt-3">
            {participation && participation.requiredHours > 0 && (
              <div className="px-1 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">Volunteer Hours</span>
                  <span className={cn(
                    "font-semibold",
                    participation.totalHours >= participation.requiredHours
                      ? "text-emerald-600"
                      : participation.totalHours > 0
                        ? "text-amber-600"
                        : "text-red-500"
                  )}>
                    {participation.totalHours} / {participation.requiredHours} hrs
                    {participation.totalHours >= participation.requiredHours
                      ? " — Fulfilled"
                      : ` — ${(participation.requiredHours - participation.totalHours).toFixed(1)} remaining`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      participation.totalHours >= participation.requiredHours
                        ? "bg-emerald-500"
                        : participation.totalHours > 0
                          ? "bg-amber-500"
                          : "bg-red-400"
                    )}
                    style={{ width: `${Math.min((participation.totalHours / participation.requiredHours) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {player.volunteers.length > 0 ? (
              <div className="space-y-2">
                {player.volunteers.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{v.name}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {v.relationship}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        {v.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {v.email}
                          </span>
                        )}
                        {v.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {v.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => handleRemoveVolunteer(v.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0 p-1"
                        title="Remove volunteer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-1">
                No volunteers assigned to this player.
              </p>
            )}

            {canManage && (
              <div className="flex items-center gap-2 flex-wrap">
                {!showAddVolunteer && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs"
                    onClick={() => setShowAddVolunteer(true)}
                  >
                    <UserPlus className="mr-1.5 h-3 w-3" />
                    Add Volunteer
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-xs"
                  onClick={() => {
                    setEditName(player.name);
                    setEditNumber(player.number || "");
                    setShowEditPlayer(true);
                  }}
                >
                  <Pencil className="mr-1 h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-xs"
                  onClick={onToggleActive}
                >
                  {player.active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-xs text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Remove
                </Button>
              </div>
            )}

            {showAddVolunteer && (
              <div className="rounded-lg border border-border/50 p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  New Volunteer
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Name *"
                    value={volName}
                    onChange={(e) => setVolName(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                  <Select
                    value={volRelationship}
                    onValueChange={(v) => {
                      if (v) setVolRelationship(v);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIPS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Email (optional)"
                    type="email"
                    value={volEmail}
                    onChange={(e) => setVolEmail(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                  <Input
                    placeholder="Phone (optional)"
                    type="tel"
                    value={volPhone}
                    onChange={(e) => setVolPhone(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 rounded-lg text-xs px-3"
                    onClick={handleAddVolunteer}
                    disabled={savingVol || !volName.trim()}
                  >
                    {savingVol ? "Adding..." : "Add"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 rounded-lg text-xs"
                    onClick={() => {
                      setShowAddVolunteer(false);
                      setVolName("");
                      setVolEmail("");
                      setVolPhone("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {player.name}?</DialogTitle>
            <DialogDescription>
              This will remove the player and all their volunteer assignments
              from the roster. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDelete(false);
                onDelete();
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditPlayer} onOpenChange={setShowEditPlayer}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
            <DialogDescription>
              Update player name or jersey number.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Player Name *</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEditPlayer()}
              />
            </div>
            <div className="grid gap-2">
              <Label>Jersey Number</Label>
              <Input
                placeholder="Optional"
                value={editNumber}
                onChange={(e) => setEditNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEditPlayer()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPlayer(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditPlayer}
              disabled={savingEdit || !editName.trim()}
            >
              {savingEdit ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
