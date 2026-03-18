"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Invitation } from "@prisma/client";

interface InvitationWithTeam extends Invitation {
  team?: { id: string; name: string } | null;
}
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Trash2, UserPlus, Loader2 } from "lucide-react";
import { InviteForm } from "./invite-form";

interface InvitationManagerProps {
  organizationName: string;
}

export function InvitationManager({ organizationName }: InvitationManagerProps) {
  const [invitations, setInvitations] = useState<InvitationWithTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  async function fetchInvitations() {
    try {
      const res = await fetch("/api/invitations");
      if (!res.ok) throw new Error("Failed to load invitations");
      const data = await res.json();
      setInvitations(data);
    } catch {
      toast.error("Failed to load invitations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInvitations();
  }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/invitations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel invitation");
      }
      toast.success("Invitation cancelled");
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeletingId(null);
    }
  }

  function handleInviteCreated() {
    fetchInvitations();
    router.refresh();
  }

  const pendingInvitations = invitations.filter((inv) => inv.status === "PENDING");

  function statusVariant(status: string) {
    switch (status) {
      case "PENDING":
        return "outline" as const;
      case "ACCEPTED":
        return "default" as const;
      case "EXPIRED":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Invitations</CardTitle>
              <CardDescription>
                Invite coaches and managers to {organizationName}
              </CardDescription>
            </div>
          </div>
          <InviteForm onCreated={handleInviteCreated}>
            <Button size="sm">
              <UserPlus className="mr-1.5 h-4 w-4" />
              Invite User
            </Button>
          </InviteForm>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Mail className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No invitations yet. Invite your first team member!
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => {
                const isExpired =
                  invitation.status === "PENDING" &&
                  new Date() > new Date(invitation.expiresAt);
                const displayStatus = isExpired ? "EXPIRED" : invitation.status;

                return (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">
                      {invitation.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {invitation.role.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invitation.team?.name ?? "—"}
                      {invitation.teamRole && (
                        <span className="block text-xs">
                          {invitation.teamRole.replace(/_/g, " ")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(displayStatus)}>
                        {displayStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {invitation.status === "PENDING" && !isExpired && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(invitation.id)}
                          disabled={deletingId === invitation.id}
                        >
                          {deletingId === invitation.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {pendingInvitations.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            {pendingInvitations.length} pending{" "}
            {pendingInvitations.length === 1 ? "invitation" : "invitations"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
