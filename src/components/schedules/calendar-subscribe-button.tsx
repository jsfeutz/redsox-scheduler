"use client";

import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Check,
  Copy,
  Download,
  ExternalLink,
  Rss,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface CalendarSubscribeButtonProps {
  /** Path beginning with `/`, e.g. `/api/schedule/public/ical?teamId=…` */
  icalPath: string;
  /** `compact` = icon-only (mobile toolbars). */
  variant?: "default" | "compact";
  className?: string;
  /** Extra classes for the trigger button (default variant only). */
  triggerClassName?: string;
}

/**
 * Live iCal / webcal subscribe UI (Google Calendar, Apple, copy URL, download .ics).
 * Uses a path relative to the current origin (public iCal routes work without auth).
 */
export function CalendarSubscribeButton({
  icalPath,
  variant = "default",
  className,
  triggerClassName,
}: CalendarSubscribeButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const httpUrl = `${origin}${icalPath}`;
  const webcalUrl = httpUrl.replace(/^https?:/, "webcal:");
  const gcalSubscribeUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

  function copyUrl() {
    void navigator.clipboard.writeText(httpUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const feedTeamId = (() => {
    const i = icalPath.indexOf("?");
    if (i < 0) return null;
    try {
      return new URLSearchParams(icalPath.slice(i)).get("teamId");
    } catch {
      return null;
    }
  })();
  const isOrgWideFeed = !feedTeamId;

  return (
    <div className={cn("relative shrink-0", className)}>
      {variant === "compact" ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          title="Subscribe / live calendar feed"
          aria-label="Subscribe to calendar feed"
          onClick={() => setOpen(!open)}
        >
          <Rss className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("gap-1.5", triggerClassName)}
          onClick={() => setOpen(!open)}
        >
          <Rss className="h-4 w-4" />
          Subscribe
        </Button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={cn(
              "absolute z-50 w-[calc(100vw-2rem)] sm:w-[340px] max-w-[340px] rounded-xl border bg-card shadow-lg p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150",
              variant === "compact" ? "right-0 top-full mt-2" : "right-0 top-full mt-2"
            )}
          >
            <div>
              <h3 className="font-semibold text-sm mb-1">Live calendar feed</h3>
              <p className="text-xs text-muted-foreground">
                {isOrgWideFeed
                  ? "Includes all teams in your organization. Subscribe in Google, Apple, or Outlook—events stay in sync when the schedule changes."
                  : "Includes events for the selected team. Subscribe in Google, Apple, or Outlook—events stay in sync when the schedule changes."}
              </p>
            </div>

            <a
              href={gcalSubscribeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-accent/50 transition-colors w-full"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              Add to Google Calendar
            </a>

            <a
              href={webcalUrl}
              className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-accent/50 transition-colors w-full"
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              Open in calendar app
            </a>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Feed URL
              </label>
              <div className="flex gap-1.5">
                <input
                  readOnly
                  value={httpUrl}
                  className="flex-1 rounded-lg border bg-muted/50 px-2.5 py-1.5 text-xs font-mono select-all min-w-0"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={copyUrl}
                  className="shrink-0 rounded-lg border px-2.5 py-1.5 hover:bg-accent/50 transition-colors"
                  title="Copy URL"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <a
              href={icalPath}
              download
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              Download .ics file
            </a>
          </div>
        </>
      )}
    </div>
  );
}
