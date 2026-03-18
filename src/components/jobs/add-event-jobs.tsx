"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { JobTemplate } from "@prisma/client";

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
import { Checkbox } from "@/components/ui/checkbox";

interface AddEventJobsProps {
  scheduleEventId: string;
  templates: JobTemplate[];
  existingTemplateIds: string[];
  children: React.ReactNode;
}

export function AddEventJobs({
  scheduleEventId,
  templates,
  existingTemplateIds,
  children,
}: AddEventJobsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();

  const availableTemplates = templates.filter(
    (t) => !existingTemplateIds.includes(t.id)
  );

  function toggleTemplate(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0) {
      toast.error("Select at least one job template");
      return;
    }

    setLoading(true);
    try {
      const results = await Promise.all(
        Array.from(selected).map((jobTemplateId) =>
          fetch("/api/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobTemplateId, scheduleEventId }),
          })
        )
      );

      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        throw new Error(`Failed to create ${failed.length} job(s)`);
      }

      toast.success(`Added ${selected.size} job(s) to event`);
      setOpen(false);
      setSelected(new Set());
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
          <DialogTitle>Add Jobs to Event</DialogTitle>
          <DialogDescription>
            Select job templates to attach to this event. Each selected template
            creates a job that needs to be filled.
          </DialogDescription>
        </DialogHeader>
        {availableTemplates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            All templates are already attached to this event.
          </p>
        ) : (
          <div className="grid gap-3 max-h-64 overflow-y-auto py-2">
            {availableTemplates.map((template) => (
              <label
                key={template.id}
                className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selected.has(template.id)}
                  onCheckedChange={() => toggleTemplate(template.id)}
                  className="mt-0.5"
                />
                <div className="grid gap-0.5">
                  <span className="text-sm font-medium">{template.name}</span>
                  {template.description && (
                    <span className="text-xs text-muted-foreground">
                      {template.description}
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={loading || selected.size === 0}
          >
            {loading
              ? "Adding..."
              : `Add ${selected.size || ""} Job${selected.size !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
