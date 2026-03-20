"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { cn } from "@/lib/utils";
import { Users, Building2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const EVENT_TYPE_OPTIONS = [
  { value: "ALL", label: "All Events" },
  { value: "GAME", label: "Games" },
  { value: "PRACTICE", label: "Practices" },
  { value: "OTHER", label: "Other" },
] as const;

const templateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional(),
  scope: z.enum(["TEAM", "FACILITY"]),
  forEventType: z.enum(["ALL", "GAME", "PRACTICE", "OTHER"]),
  hoursPerGame: z.string().optional(),
  maxSlots: z.string().optional(),
  askComfortLevel: z.boolean().optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

export interface TemplateData {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  forEventType?: string;
  hoursPerGame: number;
  maxSlots?: number;
  askComfortLevel?: boolean;
}

interface TemplateFormProps {
  template?: TemplateData;
  showScopeToggle?: boolean;
  apiUrl?: string;
  children: React.ReactNode;
}

export function TemplateForm({
  template,
  showScopeToggle = true,
  apiUrl,
  children,
}: TemplateFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isEditing = !!template;

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name ?? "",
      description: template?.description ?? "",
      scope: (template?.scope as "TEAM" | "FACILITY") ?? "TEAM",
      forEventType: (template?.forEventType as "ALL" | "GAME" | "PRACTICE" | "OTHER") ?? "ALL",
      hoursPerGame: template?.hoursPerGame?.toString() ?? "2",
      maxSlots: template?.maxSlots?.toString() ?? "1",
      askComfortLevel: template?.askComfortLevel ?? false,
    },
  });

  const scope = form.watch("scope");
  const forEventType = form.watch("forEventType");

  async function onSubmit(values: TemplateFormValues) {
    setLoading(true);
    try {
      const defaultUrl = isEditing
        ? `/api/jobs/templates/${template.id}`
        : "/api/jobs/templates";

      const payload = {
        name: values.name,
        description: values.description,
        scope: values.scope,
        forEventType: values.forEventType,
        hoursPerGame: values.hoursPerGame ? parseFloat(values.hoursPerGame) : 2,
        maxSlots: values.maxSlots ? parseInt(values.maxSlots, 10) : 1,
        askComfortLevel: Boolean(values.askComfortLevel),
      };

      const res = await fetch(apiUrl ?? defaultUrl, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      toast.success(isEditing ? "Template updated" : "Template created");
      setOpen(false);
      form.reset();
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Template" : "Add Job Template"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the job template details below."
              : "Create a reusable volunteer job template."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          {showScopeToggle && (
            <div className="grid gap-2">
              <Label>Scope *</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => form.setValue("scope", "TEAM")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                    scope === "TEAM"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  <Users className="h-4 w-4" />
                  Team
                </button>
                <button
                  type="button"
                  onClick={() => form.setValue("scope", "FACILITY")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                    scope === "FACILITY"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  Facility
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Event Type</Label>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => form.setValue("forEventType", opt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    forEventType === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Which event types this job applies to.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Scorekeeper, Announcer"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What does this job involve?"
              {...form.register("description")}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 px-3 py-3">
            <div className="space-y-0.5">
              <Label htmlFor="askComfortLevel" className="text-sm font-medium">
                Ask comfort level on signup
              </Label>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                When enabled, volunteers see options like “new family” vs “comfortable without help” on the public signup form.
              </p>
            </div>
            <Switch
              id="askComfortLevel"
              checked={Boolean(form.watch("askComfortLevel"))}
              onCheckedChange={(v) => form.setValue("askComfortLevel", v)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="hoursPerGame">Hours per event</Label>
              <Input
                id="hoursPerGame"
                type="number"
                step="0.05"
                min="0.05"
                placeholder="2"
                {...form.register("hoursPerGame")}
              />
              <p className="text-xs text-muted-foreground">
                Hours credited per event worked.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxSlots">Max volunteers</Label>
              <Input
                id="maxSlots"
                type="number"
                step="1"
                min="1"
                placeholder="1"
                {...form.register("maxSlots")}
              />
              <p className="text-xs text-muted-foreground">
                How many can be assigned.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
