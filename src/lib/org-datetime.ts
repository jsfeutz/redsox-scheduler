/**
 * Central org-timezone formatting for all server-side human-readable event times.
 *
 * Every email, SMS, cron reminder, and queue handler that renders an event
 * wall-clock string MUST use helpers from this module so that the displayed
 * time matches the organization's physical location (default: America/Chicago).
 */

const DEFAULT_TZ = "America/Chicago";

export function getOrgTimeZone(): string {
  return process.env.ORG_TIMEZONE || DEFAULT_TZ;
}

/** "Sat, Apr 15 at 6:00 PM" — used for most notification copy. */
export function formatEventDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const tz = getOrgTimeZone();

  const weekday = d.toLocaleDateString("en-US", { timeZone: tz, weekday: "short" });
  const month = d.toLocaleDateString("en-US", { timeZone: tz, month: "short" });
  const day = d.toLocaleDateString("en-US", { timeZone: tz, day: "numeric" });
  const time = d.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });

  return `${weekday}, ${month} ${day} at ${time}`;
}

/** "Saturday, April 15 at 6:00 PM" — used for signup confirmations. */
export function formatEventDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const tz = getOrgTimeZone();

  const weekday = d.toLocaleDateString("en-US", { timeZone: tz, weekday: "long" });
  const month = d.toLocaleDateString("en-US", { timeZone: tz, month: "long" });
  const day = d.toLocaleDateString("en-US", { timeZone: tz, day: "numeric" });
  const time = d.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });

  return `${weekday}, ${month} ${day} at ${time}`;
}

/** "Saturday, April 15, 2026 at 6:00 PM" — used where year matters. */
export function formatEventDateFull(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const tz = getOrgTimeZone();

  const weekday = d.toLocaleDateString("en-US", { timeZone: tz, weekday: "long" });
  const month = d.toLocaleDateString("en-US", { timeZone: tz, month: "long" });
  const day = d.toLocaleDateString("en-US", { timeZone: tz, day: "numeric" });
  const year = d.toLocaleDateString("en-US", { timeZone: tz, year: "numeric" });
  const time = d.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });

  return `${weekday}, ${month} ${day}, ${year} at ${time}`;
}

/** "Sat Apr 15, 6:00 PM" — compact line for digest lists. */
export function formatEventDateCompact(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const tz = getOrgTimeZone();

  const weekday = d.toLocaleDateString("en-US", { timeZone: tz, weekday: "short" });
  const month = d.toLocaleDateString("en-US", { timeZone: tz, month: "short" });
  const day = d.toLocaleDateString("en-US", { timeZone: tz, day: "numeric" });
  const time = d.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });

  return `${weekday} ${month} ${day}, ${time}`;
}

/** "Saturday, April 15, 2026" — date only, no time. */
export function formatEventDateOnly(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const tz = getOrgTimeZone();

  return d.toLocaleDateString("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "6:00 PM" — time only. */
export function formatEventTimeOnly(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const tz = getOrgTimeZone();

  return d.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Human-friendly timezone label for Settings display,
 * e.g. "Central Daylight Time" or "Central Standard Time".
 */
export function getOrgTimeZoneLabel(): string {
  const tz = getOrgTimeZone();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "long",
  }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}
