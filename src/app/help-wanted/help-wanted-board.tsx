"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { useSearchParams } from "next/navigation";
import {
  Search,
  LayoutGrid,
  List,
  X,
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Check,
  ClipboardList,
  Loader2,
  Mail,
  User,
  LogOut,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { HelpWantedJobCard } from "./help-wanted-job-card";
import { PublicJobSignup } from "@/components/jobs/public-job-signup";
import { useVolunteerIdentity } from "@/components/providers/volunteer-identity";

const JOBS_PER_PAGE = 10;

export interface JobData {
  id: string;
  templateName: string;
  templateDescription: string | null;
  eventId: string;
  eventTitle: string;
  eventType: string;
  startTime: string;
  endTime: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  facilityId: string;
  facilityName: string;
  subFacilityName: string;
  slotsNeeded: number;
  assignmentCount: number;
  volunteerNames: string[];
  hoursPerGame: number;
}

export interface FilterOption {
  id: string;
  name: string;
  color?: string;
  coachName?: string;
}

interface HelpWantedBoardProps {
  jobs: JobData[];
  teams: FilterOption[];
  facilities: FilterOption[];
  compact?: boolean;
}

export function HelpWantedBoard({
  jobs,
  teams,
  facilities,
  compact = false,
}: HelpWantedBoardProps) {
  const searchParams = useSearchParams();
  const highlightJobId = searchParams.get("job");
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightJobId);
  const highlightRef = useRef<HTMLTableRowElement | null>(null);

  const [search, setSearch] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [selectedFacilities, setSelectedFacilities] = useState<Set<string>>(new Set());
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">(compact ? "cards" : "table");
  const [page, setPage] = useState(() => {
    if (highlightJobId) {
      const idx = jobs.findIndex((j) => j.id === highlightJobId);
      if (idx >= 0) return Math.floor(idx / JOBS_PER_PAGE) + 1;
    }
    return 1;
  });

  useEffect(() => {
    if (highlightJobId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = setTimeout(() => setHighlightedId(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [highlightJobId]);

  const jobNames = useMemo(() => {
    const names = Array.from(new Set(jobs.map((j) => j.templateName)));
    return names.sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const hasActiveFilters =
    search ||
    selectedTeams.size > 0 ||
    selectedFacilities.size > 0 ||
    selectedJobs.size > 0 ||
    dateFrom ||
    dateTo;

  const filteredJobs = useMemo(() => {
    setPage(1);
    return jobs.filter((job) => {
      if (search) {
        const q = search.toLowerCase();
        const match =
          job.templateName.toLowerCase().includes(q) ||
          job.eventTitle.toLowerCase().includes(q) ||
          job.teamName.toLowerCase().includes(q) ||
          job.facilityName.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (selectedTeams.size > 0 && !selectedTeams.has(job.teamId)) return false;
      if (selectedFacilities.size > 0 && !selectedFacilities.has(job.facilityId)) return false;
      if (selectedJobs.size > 0 && !selectedJobs.has(job.templateName)) return false;

      if (dateFrom) {
        const from = startOfDay(parseISO(dateFrom));
        if (isBefore(parseISO(job.startTime), from)) return false;
      }
      if (dateTo) {
        const to = endOfDay(parseISO(dateTo));
        if (isAfter(parseISO(job.startTime), to)) return false;
      }

      return true;
    });
  }, [jobs, search, selectedTeams, selectedFacilities, selectedJobs, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));
  const paginatedJobs = filteredJobs.slice(
    (page - 1) * JOBS_PER_PAGE,
    page * JOBS_PER_PAGE
  );

  const jobsByDate = useMemo(() => {
    return paginatedJobs.reduce<Record<string, JobData[]>>((acc, job) => {
      const dateKey = format(parseISO(job.startTime), "yyyy-MM-dd");
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(job);
      return acc;
    }, {});
  }, [paginatedJobs]);

  function clearFilters() {
    setSearch("");
    setSelectedTeams(new Set());
    setSelectedFacilities(new Set());
    setSelectedJobs(new Set());
    setDateFrom("");
    setDateTo("");
  }


  const filterCount =
    selectedTeams.size + selectedFacilities.size + selectedJobs.size + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const filterContent = (
    <div className="space-y-3">
      <div className="grid gap-1">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Team</label>
        <Select value={selectedTeams.size === 1 ? [...selectedTeams][0] ?? "ALL" : "ALL"} onValueChange={(v) => { if (!v || v === "ALL") setSelectedTeams(new Set<string>()); else setSelectedTeams(new Set<string>([v])); }}>
          <SelectTrigger className="h-10 rounded-xl text-sm">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  {t.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Job Type</label>
        <Select value={selectedJobs.size === 1 ? [...selectedJobs][0] ?? "ALL" : "ALL"} onValueChange={(v) => { if (!v || v === "ALL") setSelectedJobs(new Set<string>()); else setSelectedJobs(new Set<string>([v])); }}>
          <SelectTrigger className="h-10 rounded-xl text-sm">
            <SelectValue placeholder="All Jobs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Jobs</SelectItem>
            {jobNames.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Facility</label>
        <Select value={selectedFacilities.size === 1 ? [...selectedFacilities][0] ?? "ALL" : "ALL"} onValueChange={(v) => { if (!v || v === "ALL") setSelectedFacilities(new Set<string>()); else setSelectedFacilities(new Set<string>([v])); }}>
          <SelectTrigger className="h-10 rounded-xl text-sm">
            <SelectValue placeholder="All Facilities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Facilities</SelectItem>
            {facilities.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">From</label>
          <DatePicker value={dateFrom} onChange={(v) => setDateFrom(v)} placeholder="Start" className="h-10 rounded-xl text-sm" />
        </div>
        <div className="grid gap-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">To</label>
          <DatePicker value={dateTo} onChange={(v) => setDateTo(v)} placeholder="End" className="h-10 rounded-xl text-sm" />
        </div>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-xs mt-1">
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <div className={cn("space-y-3 md:space-y-4", compact && "py-3 md:py-0")}>
      {/* Search + filters row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs, teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn("pl-10 rounded-xl text-sm", compact ? "h-9" : "h-10")}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Sheet>
          <SheetTrigger
            render={<Button variant="outline" size="icon" className={cn("sm:hidden rounded-xl relative shrink-0", compact ? "h-9 w-9" : "h-10 w-10")} />}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {filterCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                {filterCount}
              </span>
            )}
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="pt-4 pb-6">
              {filterContent}
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-0.5 bg-muted rounded-xl p-0.5 shrink-0">
          <button
            onClick={() => setViewMode("cards")}
            className={cn(
              "flex items-center justify-center h-8 w-8 md:h-9 md:w-9 rounded-lg transition-colors",
              viewMode === "cards"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "flex items-center justify-center h-8 w-8 md:h-9 md:w-9 rounded-lg transition-colors",
              viewMode === "table"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Desktop inline filters */}
      <div className="hidden sm:flex items-center gap-2 flex-wrap">
        <Select value={selectedTeams.size === 1 ? [...selectedTeams][0] ?? "ALL" : "ALL"} onValueChange={(v) => { if (!v || v === "ALL") setSelectedTeams(new Set<string>()); else setSelectedTeams(new Set<string>([v])); }}>
          <SelectTrigger className="h-9 w-[150px] rounded-lg text-sm">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  {t.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedJobs.size === 1 ? [...selectedJobs][0] ?? "ALL" : "ALL"} onValueChange={(v) => { if (!v || v === "ALL") setSelectedJobs(new Set<string>()); else setSelectedJobs(new Set<string>([v])); }}>
          <SelectTrigger className="h-9 w-[150px] rounded-lg text-sm">
            <SelectValue placeholder="All Jobs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Jobs</SelectItem>
            {jobNames.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedFacilities.size === 1 ? [...selectedFacilities][0] ?? "ALL" : "ALL"} onValueChange={(v) => { if (!v || v === "ALL") setSelectedFacilities(new Set<string>()); else setSelectedFacilities(new Set<string>([v])); }}>
          <SelectTrigger className="h-9 w-[150px] rounded-lg text-sm">
            <SelectValue placeholder="All Facilities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Facilities</SelectItem>
            {facilities.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DatePicker value={dateFrom} onChange={(v) => setDateFrom(v)} placeholder="From" className="h-9 rounded-lg text-sm w-[140px]" />
        <DatePicker value={dateTo} onChange={(v) => setDateTo(v)} placeholder="To" className="h-9 rounded-lg text-sm w-[140px]" />
        {hasActiveFilters && (
          <>
            <Badge variant="secondary" className="rounded-lg text-xs h-9 px-3">
              {filteredJobs.length} result{filteredJobs.length !== 1 ? "s" : ""}
            </Badge>
            <button onClick={clearFilters} className="text-xs text-primary hover:underline font-medium">
              Clear
            </button>
          </>
        )}
      </div>

      {/* Mobile active filters summary */}
      {hasActiveFilters && (
        <div className="sm:hidden flex items-center gap-2">
          <Badge variant="secondary" className="rounded-lg text-xs">
            {filteredJobs.length} result{filteredJobs.length !== 1 ? "s" : ""}
            {filterCount > 0 && ` · ${filterCount} filter${filterCount !== 1 ? "s" : ""}`}
          </Badge>
          <button onClick={clearFilters} className="text-xs text-primary hover:underline font-medium">
            Clear
          </button>
        </div>
      )}

      {/* My Signups quick lookup - only for public (non-compact) mode */}
      {!compact && <MySignupsLookup />}

      {/* Results */}
      {filteredJobs.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className={cn("flex flex-col items-center", compact ? "py-10" : "py-16")}>
            <Calendar className={cn("text-muted-foreground/30 mb-4", compact ? "h-10 w-10" : "h-14 w-14")} />
            <p className={cn("font-semibold", compact ? "text-base" : "text-lg")}>
              {hasActiveFilters ? "No jobs match your filters" : "No open jobs right now"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Try adjusting your search or filters"
                : "Check back later for upcoming opportunities!"}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                className="mt-4 rounded-xl"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <TableView jobs={paginatedJobs} highlightedId={highlightedId} highlightJobId={highlightJobId} highlightRef={highlightRef} />
      ) : (
        <CardView jobsByDate={jobsByDate} compact={compact} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 pb-2">
          <p className="text-xs md:text-sm text-muted-foreground">
            {(page - 1) * JOBS_PER_PAGE + 1}–
            {Math.min(page * JOBS_PER_PAGE, filteredJobs.length)} of{" "}
            {filteredJobs.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 md:h-9 md:w-9 rounded-lg"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 5) return true;
                return p === 1 || p === totalPages || Math.abs(p - page) <= 1;
              })
              .map((p, i, arr) => (
                <span key={p} className="contents">
                  {i > 0 && arr[i - 1] !== p - 1 && (
                    <span className="text-xs text-muted-foreground px-0.5">...</span>
                  )}
                  <Button
                    variant={p === page ? "default" : "outline"}
                    size="icon"
                    className={cn(
                      "h-8 w-8 md:h-9 md:w-9 rounded-lg text-xs md:text-sm",
                      p === page && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                </span>
              ))}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 md:h-9 md:w-9 rounded-lg"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== My Signups Lookup ========== */

function MySignupsLookup() {
  const { identity, clearIdentity } = useVolunteerIdentity();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await fetch("/api/signup/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch {
      toast.error("Failed to send link");
    } finally {
      setSending(false);
    }
  }

  if (identity) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/30 p-3">
        <User className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm truncate">
          Volunteering as <strong>{identity.name || "Volunteer"}</strong>
        </span>
        <Link
          href={`/my-signups?token=${identity.token}`}
          className="ml-auto text-sm text-primary hover:underline font-medium whitespace-nowrap"
        >
          My Signups
        </Link>
        <button
          onClick={clearIdentity}
          className="text-muted-foreground hover:text-foreground shrink-0"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <Mail className="h-5 w-5 text-emerald-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Check your email!</p>
          <p className="text-xs text-muted-foreground">
            We sent a link to view and manage your signups.
          </p>
        </div>
        <button
          onClick={() => { setSent(false); setOpen(false); setEmail(""); }}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
      >
        <ClipboardList className="h-4 w-4" />
        Already signed up? View my signups
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/30 p-3"
    >
      <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        type="email"
        placeholder="Enter your email to view signups..."
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="h-10 rounded-lg text-sm flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2"
        autoFocus
      />
      <Button
        type="submit"
        disabled={sending}
        size="sm"
        className="rounded-lg h-10 px-4 shrink-0"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Send Link"
        )}
      </Button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-muted-foreground hover:text-foreground shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </form>
  );
}

/* ========== Card View ========== */

function CardView({
  jobsByDate,
  compact = false,
}: {
  jobsByDate: Record<string, JobData[]>;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-6", compact && "space-y-4")}>
      {Object.entries(jobsByDate).map(([dateKey, dateJobs]) => {
        const byEvent = dateJobs.reduce<Record<string, JobData[]>>(
          (acc, job) => {
            if (!acc[job.eventId]) acc[job.eventId] = [];
            acc[job.eventId].push(job);
            return acc;
          },
          {}
        );

        return (
          <section key={dateKey}>
            <div className={cn("mb-2 md:mb-3 flex items-center gap-2 px-1", compact && "sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10")}>
              <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
              <h2 className="text-xs md:text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {format(parseISO(dateKey), "EEE, MMM d")}
              </h2>
            </div>

            <div className={cn("space-y-3", compact && "space-y-2")}>
              {Object.entries(byEvent).map(([eventId, eventJobs]) => {
                const first = eventJobs[0];
                return (
                  <Card
                    key={eventId}
                    className={cn("rounded-xl md:rounded-2xl border-border/50 overflow-hidden")}
                  >
                    <div
                      className="h-1"
                      style={{ backgroundColor: first.teamColor }}
                    />
                    <CardContent className={cn("space-y-3 md:space-y-4", compact ? "p-3 md:p-5" : "p-5")}>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={cn("font-bold", compact ? "text-sm md:text-lg" : "text-lg")}>
                            {first.eventTitle}
                          </h3>
                          <Badge
                            variant="outline"
                            className="text-[10px] md:text-xs"
                            style={{
                              borderColor: first.teamColor,
                              color: first.teamColor,
                            }}
                          >
                            {first.teamName}
                          </Badge>
                        </div>
                        <div className={cn("mt-1.5 md:mt-2 flex flex-wrap gap-x-3 md:gap-x-4 gap-y-1 text-xs md:text-sm text-muted-foreground")}>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 md:h-3.5 md:w-3.5" />
                            {format(parseISO(first.startTime), "h:mm a")}
                            {" – "}
                            {format(parseISO(first.endTime), "h:mm a")}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5" />
                            {first.facilityName}
                            {first.subFacilityName && ` – ${first.subFacilityName}`}
                          </span>
                        </div>
                      </div>

                      <div className={cn("space-y-2 md:space-y-3 border-t border-border/50", compact ? "pt-2 md:pt-4" : "pt-4")}>
                        <p className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Available Jobs
                        </p>
                        {eventJobs.map((job) => (
                          <HelpWantedJobCard
                            key={job.id}
                            job={{
                              id: job.id,
                              templateName: job.templateName,
                              eventTitle: job.eventTitle,
                              teamName: job.teamName,
                              teamColor: job.teamColor,
                              facilityName: job.facilityName,
                              subFacilityName: job.subFacilityName,
                              date: format(parseISO(job.startTime), "EEE, MMM d"),
                              time: `${format(parseISO(job.startTime), "h:mm a")} – ${format(parseISO(job.endTime), "h:mm a")}`,
                              slotsNeeded: job.slotsNeeded,
                              assignmentCount: job.assignmentCount,
                              volunteerNames: job.volunteerNames,
                              hoursPerGame: job.hoursPerGame,
                            }}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ========== Table View ========== */

function TableView({ jobs, highlightedId, highlightJobId, highlightRef }: { jobs: JobData[]; highlightedId: string | null; highlightJobId: string | null; highlightRef: React.RefObject<HTMLTableRowElement | null> }) {
  return (
    <Card className="rounded-2xl border-border/50">
      {/* Desktop table */}
      <div className="hidden sm:block overflow-visible">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <th className="text-left px-4 py-3 whitespace-nowrap">Date</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Time</th>
              <th className="text-left px-4 py-3">Job</th>
              <th className="text-left px-4 py-3">Team</th>
              <th className="text-left px-4 py-3">Facility</th>
              <th className="text-center px-3 py-3 whitespace-nowrap">Spots</th>
              <th className="text-right px-4 py-3 whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <TableRow key={job.id} job={job} highlighted={job.id === highlightedId} highlightRef={job.id === highlightJobId ? highlightRef : undefined} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile compact list */}
      <div className="sm:hidden divide-y divide-border/50">
        {jobs.map((job) => (
          <MobileTableRow key={job.id} job={job} />
        ))}
      </div>
    </Card>
  );
}

function TableRow({ job, highlighted, highlightRef }: { job: JobData; highlighted?: boolean; highlightRef?: React.Ref<HTMLTableRowElement> }) {
  const [count, setCount] = useState(job.assignmentCount);
  const [names, setNames] = useState(job.volunteerNames);
  const spotsLeft = job.slotsNeeded - count;
  const fillPct = Math.min((count / job.slotsNeeded) * 100, 100);

  return (
    <tr ref={highlightRef} className={cn("border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors", highlighted && "ring-2 ring-primary bg-primary/5")}>
      <td className="px-4 py-3 whitespace-nowrap font-medium">
        {format(parseISO(job.startTime), "MMM d")}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
        {format(parseISO(job.startTime), "h:mm a")}
      </td>
      <td className="px-4 py-3">
        <div className="font-medium truncate">{job.templateName}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground truncate">
            {job.eventTitle}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {job.hoursPerGame}h
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: job.teamColor }}
          />
          <span className="truncate">{job.teamName}</span>
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="truncate block text-muted-foreground">
          {job.facilityName}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-xs font-bold">
            <span className={spotsLeft > 0 ? "text-primary" : "text-emerald-500"}>
              {count}
            </span>
            <span className="text-muted-foreground font-normal">
              /{job.slotsNeeded}
            </span>
          </div>
          <div className="h-1 w-10 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                fillPct >= 100
                  ? "bg-emerald-500"
                  : fillPct >= 50
                    ? "bg-amber-500"
                    : "bg-red-500"
              )}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          {names.length > 0 && (
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 text-center max-w-[120px] truncate">
              {names.join(", ")}
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        {spotsLeft > 0 ? (
          <PublicJobSignup
            jobId={job.id}
            jobName={job.templateName}
            eventTitle={job.eventTitle}
            eventDate={format(parseISO(job.startTime), "EEE, MMM d")}
            eventTime={`${format(parseISO(job.startTime), "h:mm a")} – ${format(parseISO(job.endTime), "h:mm a")}`}
            onSuccess={(name) => {
              setCount((c) => c + 1);
              if (name) setNames((prev) => [...prev, name]);
            }}
          />
        ) : (
          <Badge className="bg-emerald-500/15 text-emerald-500 border-0 rounded-lg text-xs">
            Full
          </Badge>
        )}
      </td>
    </tr>
  );
}

function MobileTableRow({ job }: { job: JobData }) {
  const [count, setCount] = useState(job.assignmentCount);
  const [names, setNames] = useState(job.volunteerNames);
  const spotsLeft = job.slotsNeeded - count;
  const fillPct = Math.min((count / job.slotsNeeded) * 100, 100);

  return (
    <div className="px-3 py-2.5 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm truncate">{job.templateName}</span>
            <Badge
              variant={spotsLeft > 0 ? "secondary" : "default"}
              className="rounded text-[10px] px-1.5 py-0 shrink-0"
            >
              {spotsLeft > 0 ? `${spotsLeft} left` : "Full"}
            </Badge>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground">
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: job.teamColor }}
            />
            <span className="truncate">{job.teamName}</span>
            <span>&middot;</span>
            <span className="shrink-0">{format(parseISO(job.startTime), "MMM d, h:mm a")}</span>
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {job.facilityName} &middot; {job.eventTitle}
          </div>
        </div>
        {spotsLeft > 0 && (
          <div className="shrink-0 pt-0.5">
            <PublicJobSignup
              jobId={job.id}
              jobName={job.templateName}
              eventTitle={job.eventTitle}
              eventDate={format(parseISO(job.startTime), "EEE, MMM d")}
              eventTime={`${format(parseISO(job.startTime), "h:mm a")} – ${format(parseISO(job.endTime), "h:mm a")}`}
              onSuccess={(name) => {
                setCount((c) => c + 1);
                if (name) setNames((prev) => [...prev, name]);
              }}
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              fillPct >= 100
                ? "bg-emerald-500"
                : fillPct >= 50
                  ? "bg-amber-500"
                  : "bg-red-500"
            )}
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground font-medium shrink-0">
          {count}/{job.slotsNeeded}
        </span>
      </div>
    </div>
  );
}
