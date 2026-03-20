"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Plus, Minus, Loader2 } from "lucide-react";

interface Template {
  id: string;
  name: string;
  scope: string;
  maxSlots: number;
  active: boolean;
}

interface AddJobToEventProps {
  scheduleEventId: string;
  existingTemplateIds: string[];
  onAdded: () => void;
}

export function AddJobToEvent({
  scheduleEventId,
  existingTemplateIds,
  onAdded,
}: AddJobToEventProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [slots, setSlots] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/jobs/templates")
      .then((r) => r.json())
      .then((data: Template[]) => {
        const available = data.filter(
          (t) => t.active && t.scope === "FACILITY" && !existingTemplateIds.includes(t.id)
        );
        setTemplates(available);
      })
      .catch(() => toast.error("Failed to load job templates"))
      .finally(() => setLoading(false));
  }, [open, existingTemplateIds]);

  function handleSelect(id: string) {
    setSelectedId(id);
    const t = templates.find((t) => t.id === id);
    if (t) setSlots(t.maxSlots);
  }

  async function handleAdd() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTemplateId: selectedId,
          scheduleEventId,
          slotsNeeded: slots,
          isPublic: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add job");
      }
      const tpl = templates.find((t) => t.id === selectedId);
      toast.success(`${tpl?.name ?? "Job"} added`);
      setOpen(false);
      setSelectedId("");
      setSlots(1);
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add job");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-[11px] px-2 gap-1"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3 w-3" />
        Add Job
      </Button>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <Select
          value={selectedId || "__none__"}
          onValueChange={(v) => handleSelect(!v || v === "__none__" ? "" : v)}
        >
          <SelectTrigger className="h-8 text-xs flex-1">
            {(() => {
              const tpl = templates.find((t) => t.id === selectedId);
              return tpl
                ? <span>{tpl.name}</span>
                : <span className="text-muted-foreground">Select job template</span>;
            })()}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" label="Select job template">Select job template</SelectItem>
            {loading && (
              <SelectItem value="__loading__" disabled label="Loading...">
                Loading...
              </SelectItem>
            )}
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id} label={t.name}>
                {t.name}
              </SelectItem>
            ))}
            {!loading && templates.length === 0 && (
              <SelectItem value="__empty__" disabled label="No available templates">
                No available templates
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setSlots((s) => Math.max(1, s - 1))}
            disabled={slots <= 1}
            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="text-xs font-medium tabular-nums w-4 text-center">{slots}</span>
          <button
            type="button"
            onClick={() => setSlots((s) => s + 1)}
            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5">
        <Button
          size="sm"
          className="h-7 text-xs px-3 flex-1"
          onClick={handleAdd}
          disabled={saving || !selectedId}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs px-3"
          onClick={() => { setOpen(false); setSelectedId(""); setSlots(1); }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
