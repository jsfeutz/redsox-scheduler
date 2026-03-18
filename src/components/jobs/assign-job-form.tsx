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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrgUser {
  id: string;
  name: string;
  email: string;
}

interface AssignJobFormProps {
  gameJobId: string;
  orgUsers: OrgUser[];
  children: React.ReactNode;
}

export function AssignJobForm({
  gameJobId,
  orgUsers,
  children,
}: AssignJobFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"user" | "manual">("user");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const router = useRouter();

  function reset() {
    setSelectedUserId("");
    setManualName("");
    setManualEmail("");
    setMode("user");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "user" && !selectedUserId) {
      toast.error("Please select a member");
      return;
    }
    if (mode === "manual" && !manualName.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);
    try {
      const payload =
        mode === "user"
          ? { userId: selectedUserId }
          : { name: manualName.trim(), email: manualEmail.trim() || undefined };

      const res = await fetch(`/api/jobs/${gameJobId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign");
      }

      toast.success("Job assigned");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger render={<span />}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Job</DialogTitle>
          <DialogDescription>
            Select an organization member or enter details manually for someone
            outside the system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "user" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("user")}
            >
              Organization Member
            </Button>
            <Button
              type="button"
              variant={mode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("manual")}
            >
              Manual Entry
            </Button>
          </div>

          {mode === "user" ? (
            <div className="grid gap-2">
              <Label>Select Member</Label>
              <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v ?? "")} items={Object.fromEntries(orgUsers.map((u) => [u.id, `${u.name} (${u.email})`]))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a member..." />
                </SelectTrigger>
                <SelectContent>
                  {orgUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id} label={`${u.name} (${u.email})`}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="manual-name">Name *</Label>
                <Input
                  id="manual-name"
                  placeholder="John Doe"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manual-email">Email</Label>
                <Input
                  id="manual-email"
                  type="email"
                  placeholder="john@example.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
