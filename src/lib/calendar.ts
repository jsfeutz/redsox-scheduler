const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";

export interface CalendarEventOpts {
  title: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  location: string;
  description: string;
}

function toGoogleDateFormat(isoString: string): string {
  return new Date(isoString)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(opts: CalendarEventOpts): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${toGoogleDateFormat(opts.startTime)}/${toGoogleDateFormat(opts.endTime)}`,
    location: opts.location,
    details: opts.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function appleCalendarUrl(cancelToken: string): string {
  return `${APP_URL}/api/signup/calendar/${cancelToken}.ics`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toICSDate(isoString: string): string {
  const d = new Date(isoString);
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function generateICS(opts: CalendarEventOpts & { uid: string }): string {
  return generateMultiICS([opts]);
}

interface FeedOptions {
  calendarName?: string;
  refreshIntervalMinutes?: number;
}

export function generateMultiICS(
  events: (CalendarEventOpts & { uid: string })[],
  feedOpts?: FeedOptions
): string {
  const stamp = toICSDate(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rubicon Redsox//Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  if (feedOpts?.calendarName) {
    lines.push(`X-WR-CALNAME:${escapeICS(feedOpts.calendarName)}`);
  }
  if (feedOpts?.refreshIntervalMinutes) {
    const dur = `PT${feedOpts.refreshIntervalMinutes}M`;
    lines.push(`REFRESH-INTERVAL;VALUE=DURATION:${dur}`);
    lines.push(`X-PUBLISHED-TTL:${dur}`);
  }

  for (const evt of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${evt.uid}@rubiconredsox`,
      `DTSTART:${toICSDate(evt.startTime)}`,
      `DTEND:${toICSDate(evt.endTime)}`,
      `SUMMARY:${escapeICS(evt.title)}`,
      `LOCATION:${escapeICS(evt.location)}`,
      `DESCRIPTION:${escapeICS(evt.description)}`,
      `DTSTAMP:${stamp}`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
