"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  X,
  Clock,
  MapPin,
  Calendar,
  Users,
  MessageSquare,
  Loader2,
  Bell,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface SlotRequestData {
  id: string;
  status: string;
  reason: string | null;
  createdAt: string;
  respondedAt: string | null;
  scheduleEvent: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    team: { id: string; name: string; color: string };
    subFacility: {
      name: string;
      facility: { id: string; name: string };
    };
  };
  requestingTeam: { id: string; name: string; color: string };
  requestedBy: { id: string; name: string };
  respondedBy: { id: string; name: string } | null;
}

interface TimeSlotRequestsProps {
  open: boolean;
  onClose: () => void;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Pending", variant: "outline" },
  APPROVED: { label: "Approved", variant: "default" },
  DENIED: { label: "Denied", variant: "destructive" },
};

export function TimeSlotRequests({ open, onClose }: TimeSlotRequestsProps) {
  const [incoming, setIncoming] = useState<SlotRequestData[]>([]);
  const [outgoing, setOutgoing] = useState<SlotRequestData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const [inRes, outRes] = await Promise.all([
        fetch("/api/slot-requests?direction=incoming"),
        fetch("/api/slot-requests?direction=outgoing"),
      ]);
      if (inRes.ok) setIncoming(await inRes.json());
      if (outRes.ok) setOutgoing(await outRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchRequests();
  }, [open, fetchRequests]);

  const pendingCount = incoming.filter((r) => r.status === "PENDING").length;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-lg w-full">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Time Slot Requests
            {pendingCount > 0 && (
              <Badge variant="destructive" className="rounded-full text-[10px] px-1.5 h-5 min-w-5">
                {pendingCount}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Manage incoming and outgoing time slot requests
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="incoming">
              <TabsList className="w-full">
                <TabsTrigger value="incoming" className="flex-1">
                  <ArrowDownLeft className="h-3.5 w-3.5 mr-1.5" />
                  Incoming
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-1.5 h-4 min-w-4 rounded-full text-[9px] px-1">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="outgoing" className="flex-1">
                  <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
                  Outgoing
                </TabsTrigger>
              </TabsList>

              <TabsContent value="incoming" className="mt-3">
                {incoming.length === 0 ? (
                  <EmptyState text="No incoming time slot requests." />
                ) : (
                  <div className="space-y-3">
                    {incoming.map((req) => (
                      <RequestCard
                        key={req.id}
                        request={req}
                        type="incoming"
                        onResponded={fetchRequests}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="outgoing" className="mt-3">
                {outgoing.length === 0 ? (
                  <EmptyState text="No outgoing time slot requests." />
                ) : (
                  <div className="space-y-3">
                    {outgoing.map((req) => (
                      <RequestCard
                        key={req.id}
                        request={req}
                        type="outgoing"
                        onResponded={fetchRequests}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function TimeSlotRequestsBadge({
  onClick,
}: {
  onClick: () => void;
}) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch("/api/slot-requests?direction=incoming")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SlotRequestData[]) => {
        setPendingCount(
          Array.isArray(data) ? data.filter((r) => r.status === "PENDING").length : 0
        );
      })
      .catch(() => {});

    const interval = setInterval(() => {
      fetch("/api/slot-requests?direction=incoming")
        .then((r) => (r.ok ? r.json() : []))
        .then((data: SlotRequestData[]) => {
          setPendingCount(
            Array.isArray(data) ? data.filter((r) => r.status === "PENDING").length : 0
          );
        })
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="relative"
    >
      <Bell className="h-4 w-4 mr-1.5" />
      Requests
      {pendingCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
          {pendingCount}
        </span>
      )}
    </Button>
  );
}

function RequestCard({
  request,
  type,
  onResponded,
}: {
  request: SlotRequestData;
  type: "incoming" | "outgoing";
  onResponded: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const status = statusConfig[request.status] ?? statusConfig.PENDING;

  async function handleRespond(action: "approve" | "deny") {
    setLoading(true);
    try {
      const res = await fetch(`/api/slot-requests/${request.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to respond");
      }
      toast.success(
        action === "approve"
          ? "Request approved — slot transferred"
          : "Request denied"
      );
      onResponded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const facility = `${request.scheduleEvent.subFacility.facility.name} — ${request.scheduleEvent.subFacility.name}`;

  return (
    <Card className="rounded-xl border-border/50 overflow-hidden">
      <div
        className="h-0.5"
        style={{
          backgroundColor:
            type === "incoming"
              ? request.requestingTeam.color
              : request.scheduleEvent.team.color,
        }}
      />
      <CardContent className="py-3 px-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant={status.variant} className="rounded-lg text-[10px]">
                {status.label}
              </Badge>
              {type === "incoming" ? (
                <span className="text-xs text-muted-foreground">
                  from <strong>{request.requestingTeam.name}</strong> ({request.requestedBy.name})
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  requesting <strong>{request.scheduleEvent.team.name}</strong>&apos;s slot
                </span>
              )}
            </div>

            <h3 className="text-sm font-semibold mb-1">
              {request.scheduleEvent.title}
            </h3>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(request.scheduleEvent.startTime), "EEE, MMM d · h:mm a")}
                {" – "}
                {format(parseISO(request.scheduleEvent.endTime), "h:mm a")}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {facility}
              </span>
            </div>

            {request.reason && (
              <div className="flex items-start gap-1.5 mt-1.5 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{request.reason}</span>
              </div>
            )}

            {request.respondedBy && request.respondedAt && (
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {request.status === "APPROVED" ? "Approved" : "Denied"} by{" "}
                {request.respondedBy.name} on{" "}
                {format(parseISO(request.respondedAt), "MMM d, yyyy")}
              </p>
            )}
          </div>

          {type === "incoming" && request.status === "PENDING" && (
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button
                size="sm"
                onClick={() => handleRespond("approve")}
                disabled={loading}
                className="h-7 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRespond("deny")}
                disabled={loading}
                className="h-7 text-xs text-destructive hover:text-destructive"
              >
                <X className="h-3 w-3 mr-1" />
                Deny
              </Button>
            </div>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground mt-1.5">
          Requested {format(parseISO(request.createdAt), "MMM d, yyyy 'at' h:mm a")}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="rounded-xl border-border/50">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Users className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
