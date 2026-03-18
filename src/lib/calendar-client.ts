export function googleCalendarUrl(opts: {
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
}): string {
  const toGoogleDate = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${toGoogleDate(opts.startTime)}/${toGoogleDate(opts.endTime)}`,
    location: opts.location,
    details: opts.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function appleCalendarUrl(cancelToken: string): string {
  return `/api/signup/calendar/${cancelToken}.ics`;
}
