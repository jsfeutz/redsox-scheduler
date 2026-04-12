"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Shorter label for compact toolbars */
  compact?: boolean;
};

export function ShareScheduleButton({ className, compact }: Props) {
  async function share() {
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : "";
    if (!url) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: document.title,
          url,
        });
        return;
      }
    } catch {
      // User cancelled share sheet
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied — filters and view are included");
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon" : "sm"}
      className={cn(
        compact
          ? "h-11 w-11 min-h-11 min-w-11 shrink-0 touch-manipulation"
          : "gap-1.5",
        className
      )}
      onClick={() => void share()}
      title="Copy link with current filters, view, and search"
    >
      <Share2 className={cn(compact ? "h-5 w-5" : "h-4 w-4")} />
      {!compact && <span className="hidden sm:inline">Share</span>}
    </Button>
  );
}
