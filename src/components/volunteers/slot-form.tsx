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

interface SlotFormProps {
  scheduleEventId: string;
  children: React.ReactNode;
}

export function SlotForm({ scheduleEventId, children }: SlotFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slotsNeeded, setSlotsNeeded] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const router = useRouter();

  function reset() {
    setName("");
    setDescription("");
    setSlotsNeeded(1);
    setDurationMinutes(120);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/volunteers/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          slotsNeeded,
          durationMinutes,
          scheduleEventId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create slot");
      }

      toast.success("Volunteer slot created");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Volunteer Slot</DialogTitle>
          <DialogDescription>
            Create a new volunteer position for this event.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="slot-name">Name *</Label>
            <Input
              id="slot-name"
              placeholder="e.g. Scorekeeper, Concession Stand"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slot-desc">Description</Label>
            <Textarea
              id="slot-desc"
              placeholder="What this volunteer role involves..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="slots-needed">Volunteers Needed</Label>
              <Input
                id="slots-needed"
                type="number"
                min={1}
                max={50}
                value={slotsNeeded}
                onChange={(e) => setSlotsNeeded(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                min={15}
                step={15}
                value={durationMinutes}
                onChange={(e) =>
                  setDurationMinutes(parseInt(e.target.value) || 120)
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Slot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
