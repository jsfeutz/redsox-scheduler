"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ToggleTeamActiveProps {
  teamId: string;
  active: boolean;
}

export function ToggleTeamActive({ teamId, active: initialActive }: ToggleTeamActiveProps) {
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    const newActive = !active;
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setActive(newActive);
      toast.success(newActive ? "Team enabled" : "Team disabled");
      router.refresh();
    } catch {
      toast.error("Failed to update team");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="shrink-0 p-1"
      title={active ? "Disable team" : "Enable team"}
    >
      <div
        className={cn(
          "h-4 w-7 rounded-full transition-colors relative cursor-pointer",
          active ? "bg-emerald-500" : "bg-muted-foreground/30"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all shadow-sm",
            active ? "left-3.5" : "left-0.5"
          )}
        />
      </div>
    </button>
  );
}
