"use client";

import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Pencil,
  Trash2,
  Clock,
  MapPin,
  Users,
  Repeat,
  FileText,
  ArrowRightLeft,
  Loader2,
  ExternalLink,
  Ban,
} from "lucide-react";
import { useState } from "react";

interface JobAssignmentData {
  id: string;
  name: string | null;
  playerName: string | null;
}

interface GameJobData {
  id: string;
  slotsNeeded: number;
  isPublic: boolean;
  jobTemplate: { name: string; scope: string };
  assignments: JobAssignmentData[];
}

interface EventData {
  id: string;
  title: string;
  type: string;
  priority: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  recurrenceGroupId: string | null;
  teamId: string | null;
  subFacilityId: string | null;
  seasonId: string | null;
  customLocation?: string | null;
  customLocationUrl?: string | null;
  gameVenue?: string | null;
  cancelledByBumpId?: string | null;
  team?: { id: string; name: string; color: string } | null;
  subFacility?: {
    id: string;
    name: string;
    facility: { id: string; name: string; googleMapsUrl?: string | null };
  } | null;
  gameJobs?: GameJobData[];
}

interface UserTeam {
  id: string;
  name: string;
  color: string;
}

interface EventDetailProps {
  open: boolean;
  onClose: () => void;
  event: EventData;
  canManage: boolean;
  onEdit: () => void;
  onDeleted: () => void;
  userTeams?: UserTeam[];
}

export function EventDetail({
  open,
  onClose,
  event,
  canManage,
  onEdit,
  onDeleted,
  userTeams = [],
}: EventDetailProps) {
  const [deleting, setDeleting] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestTeamId, setRequestTeamId] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [requesting, setRequesting] = useState(false);

  const start = parseISO(event.startTime);
  const end = parseISO(event.endTime);

  async function handleDeleteSingle() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/schedules/${event.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete");
      }
      toast.success("Event deleted");
      setShowDeleteDialog(false);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteGroup(futureOnly: boolean) {
    if (!event.recurrenceGroupId) return;
    setDeletingGroup(true);
    try {
      const qs = futureOnly ? "?futureOnly=true" : "";
      const res = await fetch(
        `/api/schedules/group/${event.recurrenceGroupId}${qs}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete");
      }
      const data = await res.json();
      toast.success(`Deleted ${data.deleted} event(s)`);
      setShowDeleteDialog(false);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingGroup(false);
    }
  }

  async function handleSyncJobs(scope: "single" | "series") {
    setSyncing(true);
    try {
      const res = await fetch(
        `/api/schedules/${event.id}/sync-jobs?scope=${scope}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.newJobs > 0) {
        toast.success(
          `Added ${data.newJobs} job(s) across ${data.synced} event(s)`
        );
      } else {
        toast.info("All jobs are already up to date");
      }
      onDeleted();
    } catch {
      toast.error("Failed to sync jobs");
    } finally {
      setSyncing(false);
    }
  }

  const otherTeams = event.teamId
    ? userTeams.filter((t) => t.id !== event.teamId)
    : [];

  async function handleRequestSlot() {
    if (!requestTeamId) return;
    setRequesting(true);
    try {
      const res = await fetch("/api/slot-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleEventId: event.id,
          requestingTeamId: requestTeamId,
          reason: requestReason.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to send request");
      }
      toast.success("Time slot request sent! The coach will be notified.");
      setShowRequestForm(false);
      setRequestTeamId("");
      setRequestReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRequesting(false);
    }
  }

  const priorityVariant =
    event.priority === "HIGH"
      ? "destructive"
      : event.priority === "LOW"
        ? "outline"
        : "secondary";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2">
            {event.team && (
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: event.team.color }}
              />
            )}
            <SheetTitle>{event.title}</SheetTitle>
          </div>
          <SheetDescription>
            <span className="flex items-center gap-2">
              <Badge
                variant={event.type === "GAME" ? "default" : "secondary"}
              >
                {event.type === "GAME"
                  ? (event.gameVenue === "AWAY" ? "AWAY GAME" : "HOME GAME")
                  : event.type}
              </Badge>
              <Badge variant={priorityVariant}>
                {event.priority}
              </Badge>
              {event.isRecurring && (
                <Badge variant="outline">
                  <Repeat className="mr-1 h-3 w-3" />
                  Recurring
                </Badge>
              )}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-5">
          <div className="space-y-4">
            {event.cancelledByBumpId && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                <Ban className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  This event was bumped by a higher-priority team
                </p>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  {format(start, "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(start, "h:mm a")} &ndash; {format(end, "h:mm a")}
                </p>
              </div>
            </div>

            {event.team && (
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">{event.team.name}</p>
                  <p className="text-xs text-muted-foreground">Team</p>
                </div>
              </div>
            )}

            {event.subFacility ? (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {event.subFacility.facility.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.subFacility.name}
                  </p>
                  {event.subFacility.facility.googleMapsUrl && (
                    <a
                      href={event.subFacility.facility.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Directions
                    </a>
                  )}
                </div>
              </div>
            ) : event.customLocation ? (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">{event.customLocation}</p>
                  {event.customLocationUrl && (
                    <a
                      href={event.customLocationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Directions
                    </a>
                  )}
                </div>
              </div>
            ) : null}

            {event.notes && (
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
                </div>
              </div>
            )}

            {event.isRecurring && event.recurrenceRule && (
              <div className="flex items-start gap-3">
                <Repeat className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">Recurrence</p>
                  <p className="text-xs text-muted-foreground">
                    {event.recurrenceRule}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Volunteer Jobs */}
          {(event.gameJobs?.length ?? 0) >= 0 && (
            <div className="border-t border-border/50 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Volunteer Jobs
                </h4>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      onClick={() => handleSyncJobs("single")}
                      disabled={syncing}
                    >
                      {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sync Jobs"}
                    </Button>
                    {event.isRecurring && event.recurrenceGroupId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2"
                        onClick={() => handleSyncJobs("series")}
                        disabled={syncing}
                      >
                        {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sync Series"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2.5">
                {(!event.gameJobs || event.gameJobs.length === 0) && (
                  <p className="text-xs text-muted-foreground py-2">
                    No volunteer jobs assigned. Use "Sync Jobs" to add jobs from templates.
                  </p>
                )}
                {(event.gameJobs ?? []).map((job) => {
                  const open = job.slotsNeeded - job.assignments.length;
                  return (
                    <div key={job.id} className="rounded-lg border bg-muted/30 p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">
                            {job.jobTemplate.name}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {job.jobTemplate.scope}
                          </Badge>
                        </div>
                        <span className={`text-xs font-medium ${open > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                          {job.assignments.length}/{job.slotsNeeded}
                        </span>
                      </div>
                      {job.assignments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {job.assignments.map((a) => (
                            <Badge
                              key={a.id}
                              variant="secondary"
                              className="text-[11px] font-normal"
                            >
                              {a.name || "Volunteer"}
                              {a.playerName && (
                                <span className="text-muted-foreground ml-1">
                                  for {a.playerName}
                                </span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {open > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {open} more needed
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Request This Slot section */}
          {otherTeams.length > 0 && (
            <div className="border-t border-border/50 pt-4">
              {!showRequestForm ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowRequestForm(true)}
                >
                  <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
                  Request This Time Slot
                </Button>
              ) : (
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Request Time Slot Transfer
                  </Label>
                  <div className="grid gap-2">
                    <Label className="text-sm">Your Team</Label>
                    <Select
                      value={requestTeamId || "__none__"}
                      onValueChange={(v) => setRequestTeamId(!v || v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select your team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Select your team</SelectItem>
                        {otherTeams.map((t) => (
                          <SelectItem key={t.id} value={t.id} label={t.name}>
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full mr-1.5"
                              style={{ backgroundColor: t.color }}
                            />
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm">Reason (optional)</Label>
                    <Textarea
                      placeholder="Why do you need this slot?"
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowRequestForm(false);
                        setRequestTeamId("");
                        setRequestReason("");
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleRequestSlot}
                      disabled={requesting || !requestTeamId}
                      className="flex-1"
                    >
                      {requesting ? "Sending..." : "Send Request"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {canManage && (
          <SheetFooter className="flex-col gap-2 sm:flex-col">
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={onEdit} className="flex-1">
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="flex-1"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              {event.isRecurring && event.recurrenceGroupId
                ? "This is a recurring event. How would you like to delete it?"
                : `Are you sure you want to delete "${event.title}"? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          {event.isRecurring && event.recurrenceGroupId ? (
            <div className="grid gap-2">
              <Button
                variant="outline"
                onClick={handleDeleteSingle}
                disabled={deleting || deletingGroup}
                className="justify-start h-auto py-3 px-4"
              >
                <div className="text-left">
                  <p className="font-medium text-sm">This event only</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Delete only this single occurrence
                  </p>
                </div>
                {deleting && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDeleteGroup(true)}
                disabled={deleting || deletingGroup}
                className="justify-start h-auto py-3 px-4 text-amber-600 hover:text-amber-600"
              >
                <div className="text-left">
                  <p className="font-medium text-sm">This and future events</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Delete this event and all future ones in the series
                  </p>
                </div>
                {deletingGroup && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDeleteGroup(false)}
                disabled={deleting || deletingGroup}
                className="justify-start h-auto py-3 px-4 text-destructive hover:text-destructive"
              >
                <div className="text-left">
                  <p className="font-medium text-sm">All events in series</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Delete every event in this recurring series
                  </p>
                </div>
                {deletingGroup && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
              </Button>
            </div>
          ) : (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSingle}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Event"
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
