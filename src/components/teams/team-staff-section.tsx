"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamMembers } from "./team-members";

interface TeamStaffSectionProps {
  teamId: string;
  canManage: boolean;
}

export function TeamStaffSection({ teamId, canManage }: TeamStaffSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-border/50 pt-3 mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        <span>Team Staff</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>
      {expanded && (
        <div className="mt-2 animate-in slide-in-from-top-1 fade-in duration-200">
          <TeamMembers teamId={teamId} canManage={canManage} />
        </div>
      )}
    </div>
  );
}
