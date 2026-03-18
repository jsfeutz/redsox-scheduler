"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { SubFacility } from "@prisma/client";

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

const subFacilitySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  type: z.string().max(100).optional(),
  capacity: z.string().optional(),
});

type SubFacilityFormValues = z.infer<typeof subFacilitySchema>;

interface SubFacilityFormProps {
  facilityId: string;
  subFacility?: SubFacility;
  children: React.ReactNode;
}

export function SubFacilityForm({
  facilityId,
  subFacility,
  children,
}: SubFacilityFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isEditing = !!subFacility;

  const form = useForm<SubFacilityFormValues>({
    resolver: zodResolver(subFacilitySchema),
    defaultValues: {
      name: subFacility?.name ?? "",
      type: subFacility?.type ?? "",
      capacity: subFacility?.capacity?.toString() ?? "",
    },
  });

  async function onSubmit(values: SubFacilityFormValues) {
    setLoading(true);
    try {
      const url = isEditing
        ? `/api/facilities/${facilityId}/sub-facilities/${subFacility.id}`
        : `/api/facilities/${facilityId}/sub-facilities`;
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          capacity: values.capacity ? parseInt(values.capacity, 10) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      toast.success(
        isEditing ? "Sub-facility updated" : "Sub-facility created"
      );
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Sub-Facility" : "Add Sub-Facility"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the sub-facility details below."
              : "Add a field, diamond, or other sub-facility."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sf-name">Name *</Label>
            <Input
              id="sf-name"
              placeholder="e.g. Field 1, Diamond A"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sf-type">Type</Label>
            <Input
              id="sf-type"
              placeholder="e.g. Baseball Diamond, Batting Cage"
              {...form.register("type")}
            />
            {form.formState.errors.type && (
              <p className="text-xs text-destructive">
                {form.formState.errors.type.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sf-capacity">Capacity</Label>
            <Input
              id="sf-capacity"
              type="number"
              placeholder="Max people"
              {...form.register("capacity")}
            />
            {form.formState.errors.capacity && (
              <p className="text-xs text-destructive">
                {form.formState.errors.capacity.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Add Sub-Facility"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
