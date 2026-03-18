"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface GameJobEditFormProps {
  job: {
    id: string;
    slotsNeeded: number;
    isPublic: boolean;
    overrideName: string | null;
    overrideDescription: string | null;
    overrideHoursPerGame: number | null;
    templateName: string;
    templateDescription: string | null;
    templateHoursPerGame: number;
  };
  children: React.ReactNode;
}

export function GameJobEditForm({ job, children }: GameJobEditFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [overrideName, setOverrideName] = useState(job.overrideName ?? "");
  const [overrideDescription, setOverrideDescription] = useState(
    job.overrideDescription ?? ""
  );
  const [overrideHours, setOverrideHours] = useState(
    job.overrideHoursPerGame?.toString() ?? ""
  );
  const [slotsNeeded, setSlotsNeeded] = useState(job.slotsNeeded.toString());
  const [isPublic, setIsPublic] = useState(job.isPublic);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotsNeeded: parseInt(slotsNeeded) || 1,
          isPublic,
          overrideName: overrideName.trim() || null,
          overrideDescription: overrideDescription.trim() || null,
          overrideHoursPerGame: overrideHours ? parseFloat(overrideHours) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      toast.success("Job updated");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Game Job</DialogTitle>
          <DialogDescription>
            Override template defaults for this specific game. Leave fields blank
            to use the template values.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="overrideName">
              Name{" "}
              <span className="text-muted-foreground font-normal">
                (template: {job.templateName})
              </span>
            </Label>
            <Input
              id="overrideName"
              placeholder={job.templateName}
              value={overrideName}
              onChange={(e) => setOverrideName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="overrideDescription">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (override)
              </span>
            </Label>
            <Textarea
              id="overrideDescription"
              placeholder={job.templateDescription || "No template description"}
              value={overrideDescription}
              onChange={(e) => setOverrideDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="overrideHours">
                Hours{" "}
                <span className="text-muted-foreground font-normal">
                  (template: {job.templateHoursPerGame}h)
                </span>
              </Label>
              <Input
                id="overrideHours"
                type="number"
                step="0.5"
                min="0"
                placeholder={job.templateHoursPerGame.toString()}
                value={overrideHours}
                onChange={(e) => setOverrideHours(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slotsNeeded">Slots needed</Label>
              <Input
                id="slotsNeeded"
                type="number"
                min="1"
                value={slotsNeeded}
                onChange={(e) => setSlotsNeeded(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
            <div>
              <Label htmlFor="isPublic" className="text-sm font-medium">
                Public on Volunteer Signup
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allow volunteers to sign up publicly
              </p>
            </div>
            <Switch
              id="isPublic"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
