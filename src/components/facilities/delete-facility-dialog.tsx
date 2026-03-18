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

interface DeleteFacilityDialogProps {
  facilityId: string;
  facilityName: string;
  type?: "facility" | "sub-facility";
  subFacilityId?: string;
  children: React.ReactNode;
}

export function DeleteFacilityDialog({
  facilityId,
  facilityName,
  type = "facility",
  subFacilityId,
  children,
}: DeleteFacilityDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const url =
        type === "sub-facility" && subFacilityId
          ? `/api/facilities/${facilityId}/sub-facilities/${subFacilityId}`
          : `/api/facilities/${facilityId}`;

      const res = await fetch(url, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      toast.success(
        `${type === "sub-facility" ? "Sub-facility" : "Facility"} deleted`
      );
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete {type === "sub-facility" ? "Sub-Facility" : "Facility"}</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">{facilityName}</span>?
            {type === "facility" && (
              <> This will also delete all sub-facilities associated with it.</>
            )}{" "}
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
