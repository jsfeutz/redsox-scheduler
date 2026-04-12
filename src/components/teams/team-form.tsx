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
  headCoachId: z.string().optional(),
});

type TeamFormValues = z.infer<typeof teamSchema>;

interface Coach {
  id: string;
  name: string;
  email: string;
}

interface TeamFormProps {
  trigger: React.ReactNode;
}

export function TeamForm({ trigger }: TeamFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: "",
      headCoachId: "",
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
    if (open) {
      reset({ name: "", headCoachId: "" });
      setSelectedCoachId("");
    }
  }, [open, reset]);

  async function onSubmit(data: TeamFormValues) {
    setLoading(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          headCoachId: data.headCoachId || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Something went wrong");
      }

      toast.success("Team created — set icon, color, and age group in Settings");
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
          <DialogTitle>Add Team</DialogTitle>
          <DialogDescription>
            Name the team and optionally assign a head coach. Icon, team color,
            and age group can be set on the team&apos;s Settings tab.
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
            <Label>Head Coach</Label>
            <Select
              value={selectedCoachId}
              onValueChange={(val) => {
                const v = !val || val === "__none__" ? "" : val;
                setSelectedCoachId(v);
                setValue("headCoachId", v);
              }}
              items={{
                __none__: "No coach assigned",
                ...Object.fromEntries(coaches.map((c) => [c.id, c.name])),
              }}
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
              {loading ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
