"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  hoursPerGame: number;
  active: boolean;
}

export interface AddJobTeamOption {
  id: string;
  name: string;
  color: string;
}

export interface AddJobEventOption {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  teamId: string | null;
  teamName: string;
  facility: string | null;
}

export interface AddJobPlayerOption {
  id: string;
  name: string;
  teamName: string;
  number?: string | null;
}

export function AddJobDialog({
  children,
  teams,
  events,
  players,
}: {
  children: React.ReactNode;
  teams: AddJobTeamOption[];
  events: AddJobEventOption[];
  players: AddJobPlayerOption[];
}) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [jobTemplateId, setJobTemplateId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");

  const [teamId, setTeamId] = useState<string | null>(null);
  const [scheduleEventId, setScheduleEventId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const [slotsNeeded, setSlotsNeeded] = useState(1);
  const [hoursPerSlot, setHoursPerSlot] = useState<string>("");

  const [isPublic, setIsPublic] = useState(false);

  const [assignments, setAssignments] = useState<{ name: string; email: string }[]>([
    { name: "", email: "" },
  ]);

  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const selectedTemplate = useMemo(
    () => (jobTemplateId ? templates.find((t) => t.id === jobTemplateId) || null : null),
    [templates, jobTemplateId]
  );

  const effectiveHours = useMemo(() => {
    if (hoursPerSlot.trim()) {
      const n = Number(hoursPerSlot);
      return Number.isFinite(n) ? n : null;
    }
    return selectedTemplate ? selectedTemplate.hoursPerGame : null;
  }, [hoursPerSlot, selectedTemplate]);

  const eventsForTeam = useMemo(() => {
    if (!teamId) return events;
    return events.filter((e) => e.teamId === teamId);
  }, [events, teamId]);

  useEffect(() => {
    if (!open) return;
    setLoadingTemplates(true);
    fetch("/api/jobs/templates")
      .then((r) => r.json())
      .then((data: Template[]) => setTemplates(data.filter((t) => t.active)))
      .catch(() => toast.error("Failed to load job templates"))
      .finally(() => setLoadingTemplates(false));
  }, [open]);

  useEffect(() => {
    // If an event is selected, derive team from it.
    if (!scheduleEventId) return;
    const evt = events.find((e) => e.id === scheduleEventId);
    if (!evt) return;
    if (evt.teamId) setTeamId(evt.teamId);
    setIsPublic(true); // event-tied jobs are typically public signups
  }, [scheduleEventId, events]);

  function reset() {
    setJobTemplateId(null);
    setCustomName("");
    setCustomDescription("");
    setTeamId(null);
    setScheduleEventId(null);
    setPlayerId(null);
    setSlotsNeeded(1);
    setHoursPerSlot("");
    setIsPublic(false);
    setAssignments([{ name: "", email: "" }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customName.trim() && !selectedTemplate) {
      toast.error("Job name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/jobs/create-with-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTemplateId,
          scheduleEventId,
          playerId,
          teamId,
          slotsNeeded,
          isPublic,
          overrideName: customName.trim() || null,
          overrideDescription: customDescription.trim() || null,
          hoursPerSlot: effectiveHours,
          assignNow: assignments
            .map((a) => ({ name: a.name.trim(), email: a.email.trim() || null }))
            .filter((a) => a.name),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to create job");
      }
      toast.success("Job created");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger render={<span />}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Job</DialogTitle>
          <DialogDescription>
            Create a job tied to an event, a team, or as a standalone organization job.
            Optionally assign someone immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Template (optional)</Label>
            <Select
              value={jobTemplateId ?? "__none__"}
              onValueChange={(v) => setJobTemplateId(!v || v === "__none__" ? null : v)}
            >
              <SelectTrigger>
                {(() => {
                  if (loadingTemplates) return <span className="text-muted-foreground">Loading...</span>;
                  if (!jobTemplateId) return <span className="text-muted-foreground">None</span>;
                  return <span className="truncate">{selectedTemplate?.name ?? "Template"}</span>;
                })()}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" label="None">None</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id} label={t.name}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate?.description && (
              <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="customName">Custom name (optional)</Label>
              <Input
                id="customName"
                placeholder={selectedTemplate?.name || "Job name"}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customDescription">Custom description (optional)</Label>
              <Input
                id="customDescription"
                placeholder="Shown on volunteer signup"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SearchablePick
              label="Team (optional)"
              placeholder="None"
              value={teamId}
              onChange={(next) => {
                setTeamId(next);
                if (next && scheduleEventId) {
                  const evt = events.find((e) => e.id === scheduleEventId);
                  if (evt?.teamId && evt.teamId !== next) setScheduleEventId(null);
                }
              }}
              options={[
                { id: "__none__", label: "None", keywords: "none" },
                ...teams.map((t) => ({ id: t.id, label: t.name, keywords: t.name.toLowerCase() })),
              ]}
            />

            <SearchablePick
              label="Event (optional)"
              placeholder="None"
              value={scheduleEventId}
              onChange={(next) => setScheduleEventId(next)}
              options={[
                { id: "__none__", label: "None", keywords: "none" },
                ...eventsForTeam.map((e) => ({
                  id: e.id,
                  label: `${format(new Date(e.startTime), "MMM d, h:mm a")} · ${e.title}`,
                  keywords: `${e.title} ${e.teamName} ${e.facility ?? ""}`.toLowerCase(),
                  subLabel: `${e.teamName}${e.facility ? ` · ${e.facility}` : ""}`,
                })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SearchablePick
              label="Player / kid (optional)"
              placeholder="None"
              value={playerId}
              onChange={(next) => setPlayerId(next)}
              options={[
                { id: "__none__", label: "None", keywords: "none" },
                ...players.map((p) => ({
                  id: p.id,
                  label: p.number ? `${p.name} (#${p.number})` : p.name,
                  subLabel: p.teamName,
                  keywords: `${p.name} ${p.number ?? ""} ${p.teamName}`.toLowerCase(),
                })),
              ]}
            />
            <div />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="slotsNeeded">Slots needed</Label>
              <Input
                id="slotsNeeded"
                type="number"
                min={1}
                value={slotsNeeded}
                onChange={(e) => setSlotsNeeded(Math.max(1, parseInt(e.target.value || "1", 10)))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hoursPerSlot">Hours (per slot)</Label>
              <Input
                id="hoursPerSlot"
                type="number"
                step="0.25"
                min={0}
                placeholder={selectedTemplate ? String(selectedTemplate.hoursPerGame) : "2"}
                value={hoursPerSlot}
                onChange={(e) => setHoursPerSlot(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="grid gap-1">
                <Label>Public signup</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isPublic}
                    onCheckedChange={(v) => setIsPublic(v)}
                  />
                  <span className="text-xs text-muted-foreground">
                    {isPublic ? "On" : "Off"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 p-3 grid gap-3">
            <div>
              <p className="text-sm font-semibold">Assign now (optional)</p>
              <p className="text-xs text-muted-foreground">
                Add up to {slotsNeeded} people now (you can always assign more later).
              </p>
            </div>
            <div className="grid gap-2">
              {assignments.map((a, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <div className="grid gap-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      placeholder="Jane Smith"
                      value={a.name}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAssignments((prev) => prev.map((p, i) => (i === idx ? { ...p, name: v } : p)));
                      }}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      placeholder="jane@example.com"
                      value={a.email}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAssignments((prev) => prev.map((p, i) => (i === idx ? { ...p, email: v } : p)));
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-lg"
                    onClick={() => setAssignments((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={assignments.length <= 1}
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setAssignments((prev) => [...prev, { name: "", email: "" }])}
                  disabled={assignments.length >= slotsNeeded}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add person
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={saving || (!customName.trim() && !selectedTemplate)}>
              {saving ? "Creating..." : "Create Job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SearchablePick({
  label,
  placeholder,
  value,
  onChange,
  options,
}: {
  label: string;
  placeholder: string;
  value: string | null;
  onChange: (id: string | null) => void;
  options: { id: string; label: string; keywords: string; subLabel?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [menuKey, setMenuKey] = useState(0);

  const selected = useMemo(() => {
    if (!value) return options.find((o) => o.id === "__none__") ?? options[0];
    return options.find((o) => o.id === value) ?? options[0];
  }, [options, value]);

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setMenuKey((k) => k + 1);
        }}
      >
        <PopoverTrigger
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm",
            "hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "dark:bg-input/30 dark:hover:bg-input/50"
          )}
          aria-expanded={open}
        >
          <span className="truncate text-left font-normal" title={selected?.label}>
            {selected?.label || placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" className="p-0 w-[min(100vw-1rem,32rem)]" sideOffset={4}>
          <Command key={menuKey}>
            <CommandInput placeholder={`Search…`} className="h-9" />
            <CommandList>
              <CommandEmpty>No matches.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={`${o.label} ${o.keywords}`}
                    onSelect={() => {
                      onChange(o.id === "__none__" ? null : o.id);
                      setOpen(false);
                    }}
                    className="items-start gap-2 py-2"
                  >
                    <div className="min-w-0">
                      <div className="whitespace-normal break-words leading-snug">
                        {o.label}
                      </div>
                      {o.subLabel && (
                        <div className="text-xs text-muted-foreground whitespace-normal break-words leading-snug">
                          {o.subLabel}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

