"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
    facility: string;
  };
  requestingTeam: { id: string; name: string; color: string };
  requestedBy: { id: string; name: string };
  respondedBy: { id: string; name: string } | null;
}

interface RequestsListProps {
  incoming: SlotRequestData[];
  outgoing: SlotRequestData[];
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Pending", variant: "outline" },
  APPROVED: { label: "Approved", variant: "default" },
  DENIED: { label: "Denied", variant: "destructive" },
};

export function RequestsList({ incoming, outgoing }: RequestsListProps) {
  const pendingCount = incoming.filter((r) => r.status === "PENDING").length;

  return (
    <Tabs defaultValue="incoming">
      <TabsList>
        <TabsTrigger value="incoming">
          <ArrowDownLeft className="h-3.5 w-3.5 mr-1.5" />
          Incoming
          {pendingCount > 0 && (
            <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 rounded-full text-[10px] px-1.5">
              {pendingCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="outgoing">
          <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
          Outgoing
        </TabsTrigger>
      </TabsList>

      <TabsContent value="incoming">
        {incoming.length === 0 ? (
          <EmptyState text="No incoming slot requests." />
        ) : (
          <div className="space-y-3">
            {incoming.map((req) => (
              <RequestCard key={req.id} request={req} type="incoming" />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="outgoing">
        {outgoing.length === 0 ? (
          <EmptyState text="No outgoing slot requests." />
        ) : (
          <div className="space-y-3">
            {outgoing.map((req) => (
              <RequestCard key={req.id} request={req} type="outgoing" />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function RequestCard({
  request,
  type,
}: {
  request: SlotRequestData;
  type: "incoming" | "outgoing";
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
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
      toast.success(action === "approve" ? "Request approved — slot transferred" : "Request denied");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-2xl border-border/50 overflow-hidden">
      <div
        className="h-0.5"
        style={{
          backgroundColor:
            type === "incoming"
              ? request.requestingTeam.color
              : request.scheduleEvent.team.color,
        }}
      />
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
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

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(request.scheduleEvent.startTime), "EEE, MMM d · h:mm a")}
                {" – "}
                {format(parseISO(request.scheduleEvent.endTime), "h:mm a")}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {request.scheduleEvent.facility}
              </span>
            </div>

            {request.reason && (
              <div className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{request.reason}</span>
              </div>
            )}

            {request.respondedBy && request.respondedAt && (
              <p className="text-[11px] text-muted-foreground mt-2">
                {request.status === "APPROVED" ? "Approved" : "Denied"} by{" "}
                {request.respondedBy.name} on{" "}
                {format(parseISO(request.respondedAt), "MMM d, yyyy")}
              </p>
            )}
          </div>

          {type === "incoming" && request.status === "PENDING" && (
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRespond("deny")}
                disabled={loading}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Deny
              </Button>
              <Button
                size="sm"
                onClick={() => handleRespond("approve")}
                disabled={loading}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Approve
              </Button>
            </div>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground mt-2">
          Requested {format(parseISO(request.createdAt), "MMM d, yyyy 'at' h:mm a")}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="rounded-2xl border-border/50">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Users className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
