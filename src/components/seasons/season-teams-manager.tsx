"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface Team {
  id: string;
  name: string;
  color: string;
}

interface AssignedTeam extends Team {
  ageGroup: string | null;
}

interface SeasonTeamsManagerProps {
  seasonId: string;
  assignedTeams: AssignedTeam[];
  allTeams: Team[];
}

export function SeasonTeamsManager({
  seasonId,
  assignedTeams,
  allTeams,
}: SeasonTeamsManagerProps) {
  const router = useRouter();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const assignedIds = new Set(assignedTeams.map((t) => t.id));
  const availableTeams = allTeams.filter((t) => !assignedIds.has(t.id));

  async function addTeam() {
    if (!selectedTeamId) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/seasons/${seasonId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: selectedTeamId }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to add team");
      }
      toast.success("Team added to season");
      setSelectedTeamId("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add team");
    } finally {
      setAdding(false);
    }
  }

  async function removeTeam(teamId: string) {
    setRemovingId(teamId);
    try {
      const res = await fetch(`/api/seasons/${seasonId}/teams`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to remove team");
      }
      toast.success("Team removed from season");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove team"
      );
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {assignedTeams.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {assignedTeams.map((team) => (
            <div
              key={team.id}
              className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/50 px-3 py-1.5 group"
            >
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: team.color }}
              />
              <span className="text-sm font-medium">{team.name}</span>
              {team.ageGroup && (
                <Badge variant="secondary" className="text-[10px] rounded-lg">
                  {team.ageGroup}
                </Badge>
              )}
              <button
                type="button"
                disabled={removingId === team.id}
                onClick={() => removeTeam(team.id)}
                className="ml-0.5 rounded-md p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No teams assigned yet.</p>
      )}
      {availableTeams.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selectedTeamId} onValueChange={(v: string | null) => setSelectedTeamId(v ?? "")} items={Object.fromEntries(availableTeams.map((t) => [t.id, t.name]))}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select team to add" />
            </SelectTrigger>
            <SelectContent>
              {availableTeams.map((t) => (
                <SelectItem key={t.id} value={t.id} label={t.name}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={addTeam}
            disabled={!selectedTeamId || adding}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {adding ? "Adding..." : "Add"}
          </Button>
        </div>
      )}
    </div>
  );
}
