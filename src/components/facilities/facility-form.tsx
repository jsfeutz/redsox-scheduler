"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Facility } from "@prisma/client";

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

const facilitySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  address: z.string().max(500).optional(),
  googleMapsUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  notes: z.string().max(2000).optional(),
});

type FacilityFormValues = z.infer<typeof facilitySchema>;

interface FacilityFormProps {
  facility?: Facility;
  children: React.ReactNode;
}

export function FacilityForm({ facility, children }: FacilityFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isEditing = !!facility;

  const form = useForm<FacilityFormValues>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: facility?.name ?? "",
      address: facility?.address ?? "",
      googleMapsUrl: facility?.googleMapsUrl ?? "",
      notes: facility?.notes ?? "",
    },
  });

  async function onSubmit(values: FacilityFormValues) {
    setLoading(true);
    try {
      const url = isEditing
        ? `/api/facilities/${facility.id}`
        : "/api/facilities";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      toast.success(isEditing ? "Facility updated" : "Facility created");
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
            {isEditing ? "Edit Facility" : "Add Facility"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the facility details below."
              : "Enter the details for the new facility."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Riverside Park"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="123 Main St, City, State"
              {...form.register("address")}
            />
            {form.formState.errors.address && (
              <p className="text-xs text-destructive">
                {form.formState.errors.address.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="googleMapsUrl">Google Maps Link</Label>
            <Input
              id="googleMapsUrl"
              placeholder="https://maps.google.com/..."
              type="url"
              {...form.register("googleMapsUrl")}
            />
            {form.formState.errors.googleMapsUrl && (
              <p className="text-xs text-destructive">
                {form.formState.errors.googleMapsUrl.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Parking info, access instructions, etc."
              {...form.register("notes")}
            />
            {form.formState.errors.notes && (
              <p className="text-xs text-destructive">
                {form.formState.errors.notes.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Facility"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
