"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Check, Trash2, Users, Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlotForm } from "./slot-form";
import type { VolunteerSlotStatus } from "@prisma/client";

interface Signup {
  id: string;
  name: string;
  email: string;
  hoursCompleted: number;
  isCompleted: boolean;
}

interface Slot {
  id: string;
  name: string;
  description: string | null;
  slotsNeeded: number;
  durationMinutes: number;
  status: VolunteerSlotStatus;
  signups: Signup[];
  createdAt: string;
  updatedAt: string;
}

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  team: { id: string; name: string; color: string };
  subFacility: {
    name: string;
    facility: { id: string; name: string };
  };
  volunteerSlots: Slot[];
}

interface SlotManagerProps {
  events: Event[];
  canManage: boolean;
}

const statusColors: Record<VolunteerSlotStatus, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  FILLED:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  COMPLETED:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED:
    "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

export function SlotManager({ events, canManage }: SlotManagerProps) {
  const router = useRouter();
  const [loadingSlot, setLoadingSlot] = useState<string | null>(null);

  async function handleComplete(slotId: string) {
    setLoadingSlot(slotId);
    try {
      const res = await fetch(`/api/volunteers/slots/${slotId}`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to mark as completed");
      }
      toast.success("Slot marked as completed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingSlot(null);
    }
  }

  async function handleDelete(slotId: string) {
    setLoadingSlot(slotId);
    try {
      const res = await fetch(`/api/volunteers/slots/${slotId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete slot");
      }
      toast.success("Slot deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingSlot(null);
    }
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No upcoming events</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule events first, then add volunteer slots to them.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {events.map((event) => (
        <Card key={event.id}>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{event.title}</h3>
                  <Badge variant="secondary">{event.team.name}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(event.startTime), "MMM d, h:mm a")} –{" "}
                    {format(new Date(event.endTime), "h:mm a")}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.subFacility.facility.name} –{" "}
                    {event.subFacility.name}
                  </span>
                </div>
              </div>
              {canManage && (
                <SlotForm scheduleEventId={event.id}>
                  <Button size="sm" variant="outline">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Slot
                  </Button>
                </SlotForm>
              )}
            </div>

            {event.volunteerSlots.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                {event.volunteerSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{slot.name}</span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[slot.status]}`}
                        >
                          {slot.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {slot.signups.length}/{slot.slotsNeeded} signed up
                          &middot; {slot.durationMinutes}min
                        </span>
                      </div>
                      {canManage && slot.status !== "COMPLETED" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={loadingSlot === slot.id}
                            onClick={() => handleComplete(slot.id)}
                            title="Mark as completed"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={loadingSlot === slot.id}
                            onClick={() => handleDelete(slot.id)}
                            title="Delete slot"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {slot.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {slot.description}
                      </p>
                    )}
                    {slot.signups.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {slot.signups.map((signup) => (
                          <div
                            key={signup.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="font-medium">{signup.name}</span>
                            <span className="text-muted-foreground">
                              {signup.email}
                            </span>
                            {signup.isCompleted && (
                              <Badge variant="secondary">
                                <Check className="mr-0.5 h-3 w-3" />
                                Done
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
