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
    templateDescription?: string | null;
    eventTitle: string;
    teamName: string;
    teamColor: string;
    facilityName: string;
    subFacilityName: string;
    date: string;
    time: string;
    slotsNeeded: number;
    assignmentCount: number;
    volunteerNames: string[];
    hoursPerGame: number;
    askComfortLevel?: boolean;
  };
  autoOpen?: boolean;
  smsEnabled?: boolean;
}

export function HelpWantedJobCard({ job, autoOpen, smsEnabled = true }: HelpWantedJobCardProps) {
  const [assignmentCount, setAssignmentCount] = useState(job.assignmentCount);
  const [names, setNames] = useState(job.volunteerNames);
  const spotsLeft = job.slotsNeeded - assignmentCount;
  const fillPct = Math.min((assignmentCount / job.slotsNeeded) * 100, 100);

  return (
    <div className="rounded-lg md:rounded-xl border border-border/50 bg-card/50 p-3 md:p-4 transition-all duration-200 hover:border-border">
      <div className="flex items-start justify-between gap-2 md:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
            <span className="font-semibold text-sm md:text-base">{job.templateName}</span>
            <Badge
              variant={spotsLeft > 0 ? "secondary" : "default"}
              className="rounded text-xs md:text-sm px-2 py-0.5"
            >
              {spotsLeft > 0
                ? `${spotsLeft} left`
                : "Full"}
            </Badge>
            <Badge variant="outline" className="rounded text-xs md:text-sm px-2 py-0.5">
              {job.hoursPerGame}h
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-1.5 md:gap-2">
            <div className="h-1 md:h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
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
            <span className="text-xs md:text-sm text-muted-foreground font-medium shrink-0">
              {assignmentCount}/{job.slotsNeeded}
            </span>
          </div>
          {!!job.templateDescription && (
            <p className="mt-1 text-xs md:text-sm text-muted-foreground line-clamp-2">
              {job.templateDescription}
            </p>
          )}
          {names.length > 0 && (
            <p className={cn("text-xs md:text-sm text-muted-foreground truncate", job.templateDescription ? "mt-0.5" : "mt-1")}>
              {names.join(", ")}
            </p>
          )}
        </div>
        {spotsLeft > 0 && (
          <div className="shrink-0">
            <PublicJobSignup
              jobId={job.id}
              jobName={job.templateName}
              jobDescription={job.templateDescription ?? null}
              eventTitle={job.eventTitle}
              eventDate={job.date}
              eventTime={job.time}
              autoOpen={autoOpen}
              askComfortLevel={job.askComfortLevel}
              smsEnabled={smsEnabled}
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
