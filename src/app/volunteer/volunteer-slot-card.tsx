"use client";

import { useState } from "react";
import { Users, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicSignupForm } from "@/components/volunteers/public-signup-form";
import { cn } from "@/lib/utils";

interface VolunteerSlotCardProps {
  slot: {
    id: string;
    name: string;
    description: string | null;
    slotsNeeded: number;
    signupCount: number;
  };
}

export function VolunteerSlotCard({ slot }: VolunteerSlotCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [signupCount, setSignupCount] = useState(slot.signupCount);
  const spotsLeft = slot.slotsNeeded - signupCount;
  const fillPct = Math.min((signupCount / slot.slotsNeeded) * 100, 100);

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4 transition-all duration-200 hover:border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{slot.name}</span>
            <Badge
              variant={spotsLeft > 0 ? "secondary" : "default"}
              className="rounded-lg text-[11px]"
            >
              <Users className="mr-1 h-3 w-3" />
              {spotsLeft > 0
                ? `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`
                : "Full"}
            </Badge>
          </div>
          {slot.description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {slot.description}
            </p>
          )}
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
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
        </div>
        {spotsLeft > 0 && !showForm && (
          <Button
            className="shrink-0 rounded-xl shadow-md shadow-primary/15 active:scale-95 transition-transform h-11 px-5 text-sm"
            onClick={() => setShowForm(true)}
          >
            Sign Up
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {showForm && spotsLeft > 0 && (
        <div className="mt-4 border-t border-border/50 pt-4">
          <PublicSignupForm
            slotId={slot.id}
            slotName={slot.name}
            onSuccess={() => {
              setSignupCount((c) => c + 1);
              setShowForm(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
