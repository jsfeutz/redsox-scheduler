"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PublicJobSignup } from "@/components/jobs/public-job-signup";
import { cn } from "@/lib/utils";

interface HelpWantedJobCardProps {
  job: {
    id: string;
    templateName: string;
    eventTitle: string;
    teamName: string;
    teamColor: string;
    facilityName: string;
    subFacilityName: string;
    time: string;
    slotsNeeded: number;
    assignmentCount: number;
    volunteerNames: string[];
    hoursPerGame: number;
  };
}

export function HelpWantedJobCard({ job }: HelpWantedJobCardProps) {
  const [assignmentCount, setAssignmentCount] = useState(job.assignmentCount);
  const [names, setNames] = useState(job.volunteerNames);
  const spotsLeft = job.slotsNeeded - assignmentCount;
  const fillPct = Math.min((assignmentCount / job.slotsNeeded) * 100, 100);

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4 transition-all duration-200 hover:border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{job.templateName}</span>
            <Badge
              variant={spotsLeft > 0 ? "secondary" : "default"}
              className="rounded-lg text-[11px]"
            >
              <Users className="mr-1 h-3 w-3" />
              {spotsLeft > 0
                ? `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`
                : "Full"}
            </Badge>
            <Badge variant="outline" className="rounded-lg text-[11px]">
              {job.hoursPerGame}h
            </Badge>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: job.teamColor }}
            />
            <span className="truncate">
              {job.teamName} &middot; {job.eventTitle}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {job.facilityName} &ndash; {job.subFacilityName} &middot; {job.time}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  fillPct >= 100
                    ? "bg-emerald-500"
                    : fillPct >= 50
                      ? "bg-amber-500"
                      : "bg-red-500"
                )}
                style={{ width: `${fillPct}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground font-medium shrink-0">
              {assignmentCount}/{job.slotsNeeded}
            </span>
          </div>
          {names.length > 0 && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Signed up: {names.join(", ")}
            </p>
          )}
        </div>
        {spotsLeft > 0 && (
          <div className="shrink-0">
            <PublicJobSignup
              jobId={job.id}
              jobName={job.templateName}
              onSuccess={(name) => {
                setAssignmentCount((c) => c + 1);
                if (name) setNames((prev) => [...prev, name]);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
