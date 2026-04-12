"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CalendarX2,
  Loader2,
  Search,
  MapPin,
  Clock,
  Users,
  User,
  Mail,
} from "lucide-react";

interface Assignment {
  id: string;
  name: string | null;
  email: string | null;
  cancelledAt: string | null;
}

interface GameJob {
  id: string;
  slotsNeeded: number;
  jobTemplate: { name: string };
  assignments: Assignment[];
}

interface CancelledEvent {
  id: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  customLocation: string | null;
  gameVenue: string | null;
  cancelledAt: string;
  cancelledBy: string | null;
  team: { id: string; name: string; color: string } | null;
  subFacility: {
    name: string;
    facility: { id: string; name: string };
  } | null;
  gameJobs: GameJob[];
}

export function CancelledEventsReport() {
  const [events, setEvents] = useState<CancelledEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const scrolledToEvent = useRef(false);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/cancelled-events");
      if (!res.ok) throw new Error();
      setEvents(await res.json());
    } catch {
      toast.error("Failed to load cancelled events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (scrolledToEvent.current || loading || events.length === 0) return;
    const eventId = searchParams.get("event");
    if (!eventId) return;
    const exists = events.some((e) => e.id === eventId);
    if (!exists) return;
    scrolledToEvent.current = true;
    setHighlightId(eventId);
    setTimeout(() => {
      document.getElementById(`cancelled-${eventId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    setTimeout(() => setHighlightId(null), 4000);
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("event");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [events, loading, searchParams, pathname, router]);

  const filtered = search.trim()
    ? events.filter((e) => {
        const q = search.toLowerCase();
        if (e.title.toLowerCase().includes(q)) return true;
        if (e.team?.name.toLowerCase().includes(q)) return true;
        if (e.cancelledBy?.toLowerCase().includes(q)) return true;
        return e.gameJobs.some((j) =>
          j.assignments.some(
            (a) =>
              a.name?.toLowerCase().includes(q) ||
              a.email?.toLowerCase().includes(q)
          )
        );
      })
    : events;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by event, team, volunteer..."
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length} cancelled event{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarX2 className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">
              {events.length === 0
                ? "No cancelled events"
                : "No matches for your search"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs">
              {events.length === 0
                ? "Cancelled events will appear here with full details."
                : "Try a different search term."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => (
            <CancelledEventCard
              key={event.id}
              event={event}
              highlighted={event.id === highlightId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CancelledEventCard({ event, highlighted }: { event: CancelledEvent; highlighted?: boolean }) {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const cancelledDate = new Date(event.cancelledAt);
  const location = event.subFacility
    ? `${event.subFacility.facility.name} – ${event.subFacility.name}`
    : event.customLocation || null;

  const activeVolunteers = event.gameJobs.flatMap((j) =>
    j.assignments
      .filter((a) => !a.cancelledAt)
      .map((a) => ({ ...a, jobName: j.jobTemplate.name }))
  );

  const totalSlots = event.gameJobs.reduce((s, j) => s + j.slotsNeeded, 0);

  return (
    <Card
      id={`cancelled-${event.id}`}
      className={`rounded-2xl border-border/50 overflow-hidden transition-all duration-700 ${highlighted ? "ring-2 ring-red-400 shadow-lg" : ""}`}
    >
      <div className="border-l-4 border-red-500">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold">{event.title}</h3>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 capitalize"
                >
                  {event.type.toLowerCase().replace("_", " ")}
                </Badge>
                {event.gameVenue === "AWAY" && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Away
                  </Badge>
                )}
                {event.team && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 gap-1"
                  >
                    <span
                      className="h-2 w-2 rounded-full inline-block"
                      style={{ backgroundColor: event.team.color }}
                    />
                    {event.team.name}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(start, "EEE, MMM d, yyyy")} &middot;{" "}
                  {format(start, "h:mm a")} – {format(end, "h:mm a")}
                </span>
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {location}
                  </span>
                )}
              </div>

              {event.notes && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                  {event.notes}
                </p>
              )}
            </div>

            <div className="text-right shrink-0">
              <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                Cancelled
              </Badge>
              <p className="text-[10px] text-muted-foreground mt-1">
                {format(cancelledDate, "MMM d, h:mm a")}
              </p>
              {event.cancelledBy && (
                <p className="text-[10px] text-muted-foreground">
                  by {event.cancelledBy}
                </p>
              )}
            </div>
          </div>

          {event.gameJobs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">
                  Jobs ({event.gameJobs.length}) &middot;{" "}
                  {activeVolunteers.length}/{totalSlots} volunteer
                  {totalSlots !== 1 ? "s" : ""} signed up
                </span>
              </div>

              <div className="space-y-2">
                {event.gameJobs.map((job) => {
                  const active = job.assignments.filter((a) => !a.cancelledAt);
                  return (
                    <div
                      key={job.id}
                      className="rounded-lg bg-muted/30 px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">
                          {job.jobTemplate.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {active.length}/{job.slotsNeeded} filled
                        </span>
                      </div>
                      {active.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {active.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center gap-2 text-[11px] text-muted-foreground"
                            >
                              <User className="h-3 w-3 shrink-0" />
                              <span className="font-medium text-foreground">
                                {a.name || "Unknown"}
                              </span>
                              {a.email && (
                                <span className="flex items-center gap-0.5">
                                  <Mail className="h-2.5 w-2.5" />
                                  {a.email}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
