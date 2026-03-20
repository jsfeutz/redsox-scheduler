"use client";

import { format, parseISO } from "date-fns";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";
import { AddJobToEvent } from "@/components/jobs/add-job-to-event";
import { comfortLevelLabel } from "@/lib/comfort-level";

interface JobAssignmentData {
  id: string;
  name: string | null;
  playerName: string | null;
  comfortLevel?: string | null;
}

interface GameJobData {
  id: string;
  jobTemplateId?: string;
  slotsNeeded: number;
  isPublic: boolean;
  jobTemplate: { name: string; scope: string; askComfortLevel?: boolean };
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
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
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

  async function handleRemoveJob(jobId: string) {
    setDeletingJobId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to remove job");
      }
      toast.success("Job removed");
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove job");
    } finally {
      setDeletingJobId(null);
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

  const typeLabel =
    event.type === "GAME"
      ? event.gameVenue === "AWAY"
        ? "Away Game"
        : "Home Game"
      : event.type === "CLUB_EVENT"
        ? "Club Event"
        : event.type === "PRACTICE"
          ? "Practice"
          : event.type;

  const typeColor =
    event.type === "GAME"
      ? event.gameVenue === "AWAY"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
      : event.type === "CLUB_EVENT"
        ? "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20"
        : event.type === "PRACTICE"
          ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
          : "bg-muted text-muted-foreground border-border/50";

  return (
    <>
      <Dialog open={open && !showDeleteDialog} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{event.title}</DialogTitle>
            <DialogDescription>{typeLabel}</DialogDescription>
          </DialogHeader>

          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              {event.team && (
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: event.team.color }}
                />
              )}
              <h2 className="text-lg font-semibold truncate">{event.title}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", typeColor)}>
                {typeLabel}
              </span>
              {event.priority === "HIGH" && (
                <Badge variant="destructive" className="text-[10px]">High Priority</Badge>
              )}
              {event.isRecurring && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                  <Repeat className="h-3 w-3" />
                  Recurring
                </span>
              )}
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-5 py-4 space-y-3">
              {event.cancelledByBumpId && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                  <Ban className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    This event was bumped by a higher-priority team
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {format(start, "EEE, MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(start, "h:mm a")} &ndash; {format(end, "h:mm a")}
                  </p>
                </div>
              </div>

              {event.team && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{event.team.name}</p>
                </div>
              )}

              {event.subFacility ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {event.subFacility.facility.name} &ndash; {event.subFacility.name}
                    </p>
                    {event.subFacility.facility.googleMapsUrl && (
                      <a
                        href={event.subFacility.facility.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Directions
                      </a>
                    )}
                  </div>
                </div>
              ) : event.customLocation ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{event.customLocation}</p>
                    {event.customLocationUrl && (
                      <a
                        href={event.customLocationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
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
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm whitespace-pre-wrap pt-1.5">{event.notes}</p>
                </div>
              )}

              {event.isRecurring && event.recurrenceRule && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {event.recurrenceRule}
                  </p>
                </div>
              )}
            </div>

            {/* Volunteer Jobs */}
            {(event.gameJobs?.length ?? 0) >= 0 && (
              <div className="px-5 py-4 border-t border-border/50">
                <div className="flex items-center justify-between mb-2.5">
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
                <div className="space-y-2">
                  {(!event.gameJobs || event.gameJobs.length === 0) && (
                    <p className="text-xs text-muted-foreground py-1">
                      No volunteer jobs yet.
                    </p>
                  )}
                  {(event.gameJobs ?? []).map((job) => {
                    const openSlots = job.slotsNeeded - job.assignments.length;
                    const hasAssignments = job.assignments.length > 0;
                    return (
                      <div key={job.id} className="rounded-lg border bg-muted/30 p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {job.jobTemplate.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-xs font-semibold tabular-nums",
                              openSlots > 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                            )}>
                              {job.assignments.length}/{job.slotsNeeded}
                            </span>
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => handleRemoveJob(job.id)}
                                disabled={hasAssignments || deletingJobId === job.id}
                                title={hasAssignments ? "Unassign all volunteers first" : "Remove job"}
                                className={cn(
                                  "h-6 w-6 rounded flex items-center justify-center transition-colors",
                                  hasAssignments
                                    ? "text-muted-foreground/30 cursor-not-allowed"
                                    : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                )}
                              >
                                {deletingJobId === job.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        {hasAssignments && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {job.assignments.map((a) => {
                              const cl = comfortLevelLabel(a.comfortLevel);
                              return (
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
                                  {cl && (
                                    <span className="text-muted-foreground ml-1 border-l border-border/60 pl-1">
                                      {cl}
                                    </span>
                                  )}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                        {openSlots > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {openSlots} more needed
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {canManage && (
                    <AddJobToEvent
                      scheduleEventId={event.id}
                      existingTemplateIds={(event.gameJobs ?? [])
                        .map((j) => j.jobTemplateId)
                        .filter(Boolean) as string[]}
                      onAdded={onDeleted}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Request This Slot */}
            {otherTeams.length > 0 && (
              <div className="px-5 py-4 border-t border-border/50">
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
                          <SelectItem value="__none__" label="Select your team">Select your team</SelectItem>
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

          {/* Footer actions */}
          {canManage && (
            <div className="shrink-0 border-t border-border/50 px-5 py-3 flex gap-2">
              <Button variant="outline" onClick={onEdit} className="flex-1 h-9">
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="flex-1 h-9"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
    </>
  );
}
