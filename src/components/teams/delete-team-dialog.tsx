"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { AlertTriangle } from "lucide-react";

interface DeleteTeamDialogProps {
  teamId: string;
  teamName: string;
  trigger: React.ReactNode;
}

interface Impact {
  events: number;
  seasons: number;
  members: number;
}

export function DeleteTeamDialog({
  teamId,
  teamName,
  trigger,
}: DeleteTeamDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [confirmText, setConfirmText] = useState("");

  async function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setConfirmText("");
      setImpact(null);
      try {
        const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
        if (res.ok) {
          const data = await res.json();
          setImpact(data);
        }
      } catch {
        // If preview fails, still show the dialog
      }
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}?confirm=true`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete team");
      }
      toast.success("Team deleted");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  const canDelete = confirmText === teamName;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {teamName}?
          </DialogTitle>
          <DialogDescription>
            This action is permanent and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {impact && (impact.events > 0 || impact.seasons > 0 || impact.members > 0) && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1 text-sm">
            <p className="font-medium text-destructive">This will permanently delete:</p>
            <ul className="list-disc list-inside text-muted-foreground text-xs space-y-0.5">
              {impact.events > 0 && (
                <li>{impact.events} scheduled event{impact.events !== 1 ? "s" : ""} and all associated jobs/signups</li>
              )}
              {impact.seasons > 0 && (
                <li>{impact.seasons} season enrollment{impact.seasons !== 1 ? "s" : ""}</li>
              )}
              {impact.members > 0 && (
                <li>{impact.members} team member assignment{impact.members !== 1 ? "s" : ""}</li>
              )}
            </ul>
          </div>
        )}

        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            Type <strong>{teamName}</strong> to confirm:
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={teamName}
            className="rounded-xl"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || !canDelete}
          >
            {loading ? "Deleting..." : "Delete Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
