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
import { DatePicker } from "@/components/ui/date-picker";

const seasonSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

type SeasonFormValues = z.infer<typeof seasonSchema>;

interface SeasonFormProps {
  season?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  trigger: React.ReactNode;
}

function toDateInputValue(dateStr: string) {
  return new Date(dateStr).toISOString().split("T")[0];
}

export function SeasonForm({ season, trigger }: SeasonFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SeasonFormValues>({
    resolver: zodResolver(seasonSchema),
    defaultValues: {
      name: season?.name ?? "",
      startDate: season ? toDateInputValue(season.startDate) : "",
      endDate: season ? toDateInputValue(season.endDate) : "",
    },
  });

  useEffect(() => {
    if (open && season) {
      reset({
        name: season.name,
        startDate: toDateInputValue(season.startDate),
        endDate: toDateInputValue(season.endDate),
      });
    }
  }, [open, season, reset]);

  async function onSubmit(data: SeasonFormValues) {
    setLoading(true);
    try {
      const url = season ? `/api/seasons/${season.id}` : "/api/seasons";
      const method = season ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Something went wrong");
      }

      toast.success(season ? "Season updated" : "Season created");
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
          <DialogTitle>{season ? "Edit Season" : "Add Season"}</DialogTitle>
          <DialogDescription>
            {season
              ? "Update the season details below."
              : "Fill in the details to create a new season."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="season-name">Name</Label>
            <Input
              id="season-name"
              placeholder="e.g. Spring 2026"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Start Date</Label>
              <DatePicker
                value={watch("startDate")}
                onChange={(v) => setValue("startDate", v)}
                placeholder="Start date"
              />
              {errors.startDate && (
                <p className="text-xs text-destructive">
                  {errors.startDate.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>End Date</Label>
              <DatePicker
                value={watch("endDate")}
                onChange={(v) => setValue("endDate", v)}
                placeholder="End date"
              />
              {errors.endDate && (
                <p className="text-xs text-destructive">
                  {errors.endDate.message}
                </p>
              )}
            </div>
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
              {loading
                ? "Saving..."
                : season
                  ? "Save Changes"
                  : "Create Season"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
