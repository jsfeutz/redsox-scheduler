"use client";

import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export interface ConflictData {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  team: { name: string; color: string };
  subFacility: {
    name: string;
    facility: { name: string };
  };
}

interface ConflictDialogProps {
  open: boolean;
  onClose: () => void;
  conflict: ConflictData;
  onForceOverride: () => void;
  canBump: boolean;
  loading: boolean;
}

export function ConflictDialog({
  open,
  onClose,
  conflict,
  onForceOverride,
  canBump,
  loading,
}: ConflictDialogProps) {
  const start = parseISO(conflict.startTime);
  const end = parseISO(conflict.endTime);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Time Conflict Detected</DialogTitle>
          </div>
          <DialogDescription>
            The requested time slot conflicts with an existing event on this
            facility.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: conflict.team.color }}
            />
            <span className="font-medium">{conflict.title}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>
              <span className="text-xs font-medium text-foreground">Team</span>
              <p>{conflict.team.name}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-foreground">
                Facility
              </span>
              <p>
                {conflict.subFacility.facility.name} &ndash;{" "}
                {conflict.subFacility.name}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-foreground">Date</span>
              <p>{format(start, "MMM d, yyyy")}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-foreground">Time</span>
              <p>
                {format(start, "h:mm a")} &ndash; {format(end, "h:mm a")}
              </p>
            </div>
          </div>
        </div>

        {!canBump && (
          <p className="text-sm text-muted-foreground">
            You do not have permission to override schedule conflicts. Contact a
            Schedule Manager or Admin.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          {canBump && (
            <Button
              variant="destructive"
              onClick={onForceOverride}
              disabled={loading}
            >
              {loading ? "Overriding..." : "Force Override"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
