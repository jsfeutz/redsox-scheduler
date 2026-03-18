"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const teamSchema = z.object({
  name: z.string().min(1, "Name is required"),
  ageGroup: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color"),
  headCoachId: z.string().optional(),
});

type TeamFormValues = z.infer<typeof teamSchema>;

interface Coach {
  id: string;
  name: string;
  email: string;
}

interface TeamFormProps {
  team?: {
    id: string;
    name: string;
    ageGroup: string | null;
    color: string;
    headCoachId: string | null;
  };
  trigger: React.ReactNode;
}

export function TeamForm({ team, trigger }: TeamFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState<string>(
    team?.headCoachId ?? ""
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: team?.name ?? "",
      ageGroup: team?.ageGroup ?? "",
      color: team?.color ?? "#3b82f6",
      headCoachId: team?.headCoachId ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      fetch("/api/coaches")
        .then((r) => r.json())
        .then(setCoaches)
        .catch(() => setCoaches([]));
    }
  }, [open]);

  useEffect(() => {
    if (open && team) {
      reset({
        name: team.name,
        ageGroup: team.ageGroup ?? "",
        color: team.color,
        headCoachId: team.headCoachId ?? "",
      });
      setSelectedCoachId(team.headCoachId ?? "");
    }
  }, [open, team, reset]);

  async function onSubmit(data: TeamFormValues) {
    setLoading(true);
    try {
      const url = team ? `/api/teams/${team.id}` : "/api/teams";
      const method = team ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          headCoachId: data.headCoachId || null,
          ageGroup: data.ageGroup || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Something went wrong");
      }

      toast.success(team ? "Team updated" : "Team created");
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
      <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{team ? "Edit Team" : "Add Team"}</DialogTitle>
          <DialogDescription>
            {team
              ? "Update the team details below."
              : "Fill in the details to create a new team."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="team-name">Name</Label>
            <Input
              id="team-name"
              placeholder="e.g. Thunder 12U"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="team-age">Age Group</Label>
            <Input
              id="team-age"
              placeholder="e.g. 12U, 14U, Varsity"
              {...register("ageGroup")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="team-color">Team Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="team-color"
                className="h-8 w-12 cursor-pointer rounded border border-input bg-transparent"
                {...register("color")}
              />
              <Input
                className="flex-1"
                placeholder="#3b82f6"
                {...register("color")}
              />
            </div>
            {errors.color && (
              <p className="text-xs text-destructive">
                {errors.color.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Head Coach</Label>
            <Select
              value={selectedCoachId}
              onValueChange={(val) => {
                const v = !val || val === "__none__" ? "" : val;
                setSelectedCoachId(v);
                setValue("headCoachId", v);
              }}
              items={{ __none__: "No coach assigned", ...Object.fromEntries(coaches.map((c) => [c.id, c.name])) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a coach" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No coach assigned</SelectItem>
                {coaches.map((c) => (
                  <SelectItem key={c.id} value={c.id} label={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : team ? "Save Changes" : "Create Team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
