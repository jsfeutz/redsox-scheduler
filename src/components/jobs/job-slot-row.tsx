"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Globe,
  Lock,
  Plus,
  Minus,
  UserPlus,
  X,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface JobVolunteer {
  assignmentId: string;
  name: string;
}

export interface JobSlotData {
  id: string;
  templateId?: string;
  name: string;
  slotsNeeded: number;
  filled: number;
  isPublic: boolean;
  disabled: boolean;
  scope?: string;
  volunteers: JobVolunteer[];
}

interface JobSlotRowProps {
  job: JobSlotData;
  canManage: boolean;
  onToggle?: (id: string, disabled: boolean) => void;
  onChanged?: () => void;
}

export function JobSlotRow({ job, canManage, onToggle, onChanged }: JobSlotRowProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [isDisabled, setIsDisabled] = useState(job.disabled);
  const [copied, setCopied] = useState(false);
  const [slots, setSlots] = useState(job.slotsNeeded);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(job.name);
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editIsPublic, setEditIsPublic] = useState(job.isPublic);
  const [editHours, setEditHours] = useState<string>("");
  const router = useRouter();
  const hasOpen = !isDisabled && job.filled < slots;

  function openEdit() {
    setEditName(job.name);
    setEditIsPublic(job.isPublic);
    setEditDescription("");
    setEditHours("");
    setEditing(true);
  }

  async function handleSaveEdit() {
    setEditSaving(true);
    try {
      const hours = editHours.trim() ? Number(editHours) : null;
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overrideName: editName.trim() || null,
          overrideDescription: editDescription.trim() || null,
          isPublic: editIsPublic,
          overrideHoursPerGame: editHours.trim() ? (Number.isFinite(hours) ? hours : null) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to update job");
      }
      toast.success("Job updated");
      setEditing(false);
      onChanged?.();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update job");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleRemoveJob() {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to remove job");
      toast.success("Job removed");
      setEditing(false);
      onChanged?.();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove job");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleToggle(checked: boolean) {
    const newDisabled = !checked;
    setToggling(true);
    setIsDisabled(newDisabled);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: newDisabled }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(newDisabled ? `${job.name} disabled` : `${job.name} enabled`);
      onToggle?.(job.id, newDisabled);
    } catch {
      setIsDisabled(!newDisabled);
      toast.error("Failed to toggle job");
    } finally {
      setToggling(false);
    }
  }

  async function handleSlotsChange(delta: number) {
    const newSlots = Math.max(1, slots + delta);
    if (newSlots === slots) return;
    if (newSlots < job.filled) {
      toast.error(`Can't reduce below ${job.filled} — unassign a volunteer first`);
      return;
    }
    setSlotsLoading(true);
    const prev = slots;
    setSlots(newSlots);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotsNeeded: newSlots }),
      });
      if (!res.ok) throw new Error("Failed to update");
    } catch {
      setSlots(prev);
      toast.error("Failed to update slots");
    } finally {
      setSlotsLoading(false);
    }
  }

  async function handleUnassign(assignmentId: string, volunteerName: string) {
    try {
      const res = await fetch(`/api/jobs/${job.id}/assignments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove");
      }
      toast.success(`${volunteerName} removed`);
      onChanged?.();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove volunteer");
    }
  }

  function copyShareLink() {
    const url = `${window.location.origin}/help-wanted?job=${job.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Signup link copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleAssign() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign");
      }
      toast.success(`${name.trim()} assigned`);
      setName("");
      setEmail("");
      setShowForm(false);
      onChanged?.();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("rounded-xl border border-border/30 p-3", isDisabled && "opacity-50")}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {canManage && (
            <Switch
              checked={!isDisabled}
              onCheckedChange={handleToggle}
              disabled={toggling}
              className="scale-75 shrink-0"
            />
          )}
          <span className={cn("text-sm font-medium truncate", isDisabled && "line-through text-muted-foreground")}>{job.name}</span>
          {!isDisabled && (job.isPublic ? (
            <Globe className="h-3 w-3 text-emerald-500 shrink-0" />
          ) : (
            <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!isDisabled && canManage && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => handleSlotsChange(-1)}
                disabled={slotsLoading || slots <= 1}
                className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="text-xs font-medium tabular-nums w-4 text-center">{slots}</span>
              <button
                type="button"
                onClick={() => handleSlotsChange(1)}
                disabled={slotsLoading}
                className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          )}
          <Badge
            variant={isDisabled ? "outline" : job.filled >= slots ? "default" : "secondary"}
            className="rounded-lg text-[10px]"
          >
            {isDisabled ? "Off" : `${job.filled}/${slots}`}
          </Badge>
        </div>
      </div>

      {!isDisabled && job.volunteers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {job.volunteers.map((v) => (
            <span
              key={v.assignmentId}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-700 px-2 py-0.5 text-[11px] font-medium group"
            >
              {v.name}
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleUnassign(v.assignmentId, v.name)}
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity -mr-0.5"
                  title={`Remove ${v.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!isDisabled && (
        <div className="flex items-center gap-2 mt-1">
          {canManage && hasOpen && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            >
              <UserPlus className="h-3 w-3" />
              Assign
            </button>
          )}
          {canManage && (
            <button
              onClick={openEdit}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium"
            >
              Edit
            </button>
          )}
          {job.isPublic && (
            <button
              onClick={copyShareLink}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied!" : "Share Link"}
            </button>
          )}
        </div>
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit job</DialogTitle>
            <DialogDescription>Update details or remove this job.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Description</label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Hours (per slot)</label>
                <Input
                  type="number"
                  step="0.25"
                  min={0}
                  placeholder="Leave blank to keep"
                  value={editHours}
                  onChange={(e) => setEditHours(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="grid gap-1">
                  <label className="text-xs font-medium">Public signup</label>
                  <div className="flex items-center gap-2">
                    <Switch checked={editIsPublic} onCheckedChange={(v) => setEditIsPublic(v)} />
                    <span className="text-xs text-muted-foreground">{editIsPublic ? "On" : "Off"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemoveJob}
              disabled={editSaving}
            >
              Remove job
            </Button>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={editSaving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveEdit} disabled={editSaving || !editName.trim()}>
                {editSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isDisabled && showForm && (
        <div className="mt-2 flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-xs rounded-lg flex-1"
          />
          <Input
            placeholder="Email (optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-8 text-xs rounded-lg flex-1"
          />
          <div className="flex gap-1.5 shrink-0">
            <Button
              size="sm"
              className="h-8 rounded-lg text-xs px-3"
              onClick={handleAssign}
              disabled={saving || !name.trim()}
            >
              {saving ? "..." : "Assign"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 rounded-lg p-0"
              onClick={() => { setShowForm(false); setName(""); setEmail(""); }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
