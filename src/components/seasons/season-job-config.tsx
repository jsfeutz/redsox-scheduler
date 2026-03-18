"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Briefcase, Loader2, Plus, Trash2, X } from "lucide-react";

interface JobTemplate {
  id: string;
  name: string;
  description: string | null;
}

interface SeasonJobConfigItem {
  id: string;
  eventType: "GAME" | "PRACTICE";
  slotsNeeded: number;
  jobTemplate: { id: string; name: string; description: string | null };
  seasonTeam: {
    team: { id: string; name: string; color: string };
  };
}

interface SeasonJobConfigProps {
  seasonId: string;
  teamId: string;
  teamName: string;
}

export function SeasonJobConfig({
  seasonId,
  teamId,
  teamName,
}: SeasonJobConfigProps) {
  const router = useRouter();
  const [configs, setConfigs] = useState<SeasonJobConfigItem[]>([]);
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedEventType, setSelectedEventType] = useState<
    "GAME" | "PRACTICE"
  >("GAME");
  const [slotsNeeded, setSlotsNeeded] = useState(1);

  const teamConfigs = configs.filter((c) => c.seasonTeam.team.id === teamId);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch(`/api/seasons/${seasonId}/job-config`);
      if (res.ok) {
        const data: SeasonJobConfigItem[] = await res.json();
        setConfigs(data);
      }
    } catch {
      // silently fail on initial load
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
    fetchTemplates();
  }, [fetchConfigs, fetchTemplates]);

  const configuredTemplateIds = new Set(
    teamConfigs
      .filter((c) => c.eventType === selectedEventType)
      .map((c) => c.jobTemplate.id)
  );
  const availableTemplates = templates.filter(
    (t) => !configuredTemplateIds.has(t.id)
  );

  const gameConfigs = teamConfigs.filter((c) => c.eventType === "GAME");
  const practiceConfigs = teamConfigs.filter(
    (c) => c.eventType === "PRACTICE"
  );

  async function handleAdd() {
    if (!selectedTemplateId || !selectedEventType) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/seasons/${seasonId}/job-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          jobTemplateId: selectedTemplateId,
          eventType: selectedEventType,
          slotsNeeded,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to add job config");
      }
      toast.success("Job requirement added");
      setSelectedTemplateId("");
      setSlotsNeeded(1);
      setShowForm(false);
      await fetchConfigs();
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add job config"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(configId: string) {
    setRemovingId(configId);
    try {
      const res = await fetch(`/api/seasons/${seasonId}/job-config`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to remove config");
      }
      toast.success("Job requirement removed");
      await fetchConfigs();
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove config"
      );
    } finally {
      setRemovingId(null);
    }
  }

  function renderConfigGroup(
    label: string,
    items: SeasonJobConfigItem[],
    badgeClass: string
  ) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <Badge variant="secondary" className={`rounded-lg text-[10px] ${badgeClass}`}>
          {label}
        </Badge>
        <div className="rounded-lg border border-border/50 divide-y divide-border/50">
          {items.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between px-3 py-2"
            >
              <div className="flex items-center gap-2.5">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {config.jobTemplate.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  &times;{config.slotsNeeded}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={removingId === config.id}
                onClick={() => handleRemove(config.id)}
              >
                {removingId === config.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3 text-destructive" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Loading job config…
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-3 border-t border-border/30">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Job Requirements — {teamName}
        </h4>
        {!showForm && (
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowForm(true)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        )}
      </div>

      {teamConfigs.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground py-2 text-center rounded-lg border border-dashed border-border/50">
          No job requirements configured.
        </p>
      )}

      {renderConfigGroup("Game", gameConfigs, "bg-amber-500/15 text-amber-500 border-0")}
      {renderConfigGroup("Practice", practiceConfigs, "bg-blue-500/15 text-blue-500 border-0")}

      {showForm && (
        <div className="rounded-xl border border-border/50 bg-card/50 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Add Job Requirement</span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setShowForm(false);
                setSelectedTemplateId("");
                setSlotsNeeded(1);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Job Template</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={(v) => setSelectedTemplateId(v ?? "")}
                items={Object.fromEntries(availableTemplates.map((t) => [t.id, t.name]))}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No templates available
                    </div>
                  ) : (
                    availableTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id} label={t.name}>
                        {t.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Event Type</Label>
              <Select
                value={selectedEventType}
                onValueChange={(v) => {
                  if (v) setSelectedEventType(v as "GAME" | "PRACTICE");
                  setSelectedTemplateId("");
                }}
                items={{ GAME: "Game", PRACTICE: "Practice" }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GAME">Game</SelectItem>
                  <SelectItem value="PRACTICE">Practice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Slots Needed</Label>
              <Input
                type="number"
                min={1}
                value={slotsNeeded}
                onChange={(e) =>
                  setSlotsNeeded(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="h-9"
              />
            </div>
          </div>

          <Button
            size="sm"
            className="rounded-xl"
            disabled={!selectedTemplateId || saving}
            onClick={handleAdd}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
