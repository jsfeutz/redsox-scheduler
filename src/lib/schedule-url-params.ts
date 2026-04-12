import { format, isValid, parse } from "date-fns";

export type ScheduleViewMode = "month" | "week" | "agenda";

/** Stable query string for comparison (sorted keys). */
export function stableQueryString(params: URLSearchParams): string {
  return [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

function parseLocalDate(value: string | null): Date | null {
  if (!value) return null;
  const d = parse(value, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : null;
}

/** Public /schedule page — team, facility, type, away toggle, view, date anchor, agenda search. */
export function parsePublicScheduleUrl(searchParams: URLSearchParams): {
  viewMode: ScheduleViewMode;
  currentDate: Date;
  filterTeamId: string;
  filterSubFacilityId: string;
  filterType: string;
  showAway: boolean;
  agendaSearch: string;
} {
  const view = searchParams.get("view");
  const viewMode: ScheduleViewMode =
    view === "week" || view === "agenda" ? view : "month";

  const dateFromUrl = parseLocalDate(searchParams.get("date"));
  const currentDate = dateFromUrl ?? new Date();

  return {
    viewMode,
    currentDate,
    filterTeamId: searchParams.get("team") ?? "",
    filterSubFacilityId: searchParams.get("subFacility") ?? "",
    filterType: (() => {
      const t = searchParams.get("type") ?? "";
      if (!t || t === "ALL") return "";
      return t;
    })(),
    showAway: searchParams.get("showAway") !== "false",
    agendaSearch: searchParams.get("q") ?? "",
  };
}

export function buildPublicScheduleUrlParams(opts: {
  viewMode: ScheduleViewMode;
  currentDate: Date;
  filterTeamId: string;
  filterSubFacilityId: string;
  filterType: string;
  showAway: boolean;
  agendaSearch: string;
}): URLSearchParams {
  const p = new URLSearchParams();
  if (opts.viewMode !== "month") p.set("view", opts.viewMode);
  p.set("date", format(opts.currentDate, "yyyy-MM-dd"));
  if (opts.filterTeamId) p.set("team", opts.filterTeamId);
  if (opts.filterSubFacilityId) p.set("subFacility", opts.filterSubFacilityId);
  if (opts.filterType) p.set("type", opts.filterType);
  if (!opts.showAway) p.set("showAway", "false");
  const q = opts.agendaSearch.trim();
  if (q) p.set("q", q);
  return p;
}

/** Dashboard / team schedule — facility, view, date, search, team (when not locked), venue / includeAway. */
export function parseAdminScheduleUrl(
  searchParams: URLSearchParams,
  lockedTeamId: string | undefined
): {
  viewMode: ScheduleViewMode;
  currentDate: Date;
  filterTeamId: string;
  filterSubFacilityId: string;
  showAwayGames: boolean;
  gameVenueFilter: "all" | "home" | "away";
  agendaSearch: string;
} {
  const view = searchParams.get("view");
  const viewMode: ScheduleViewMode =
    view === "week" || view === "agenda" ? view : "month";

  const dateFromUrl = parseLocalDate(searchParams.get("date"));
  const currentDate = dateFromUrl ?? new Date();

  const venue = searchParams.get("venue");
  const gameVenueFilter: "all" | "home" | "away" =
    venue === "home" || venue === "away" ? venue : "all";

  let filterTeamId = searchParams.get("team") ?? "";
  if (lockedTeamId) filterTeamId = lockedTeamId;

  return {
    viewMode,
    currentDate,
    filterTeamId,
    filterSubFacilityId: searchParams.get("subFacility") ?? "",
    showAwayGames: searchParams.get("includeAway") === "true",
    gameVenueFilter,
    agendaSearch: searchParams.get("q") ?? "",
  };
}

export function buildAdminScheduleUrlParams(opts: {
  viewMode: ScheduleViewMode;
  currentDate: Date;
  filterTeamId: string;
  filterSubFacilityId: string;
  showAwayGames: boolean;
  gameVenueFilter: "all" | "home" | "away";
  agendaSearch: string;
  lockedTeamId?: string;
}): URLSearchParams {
  const p = new URLSearchParams();
  if (opts.viewMode !== "month") p.set("view", opts.viewMode);
  p.set("date", format(opts.currentDate, "yyyy-MM-dd"));
  if (!opts.lockedTeamId && opts.filterTeamId)
    p.set("team", opts.filterTeamId);
  if (opts.filterSubFacilityId) p.set("subFacility", opts.filterSubFacilityId);
  if (opts.lockedTeamId && opts.gameVenueFilter !== "all") {
    p.set("venue", opts.gameVenueFilter);
  }
  if (!opts.lockedTeamId && opts.showAwayGames) p.set("includeAway", "true");
  const q = opts.agendaSearch.trim();
  if (q) p.set("q", q);
  return p;
}
