import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * Shared dashboard schedule links (?view=&date=&team=&q=…) should work for guests:
 * same filters on the public /schedule page (no login).
 */
function redirectGuestDashboardSchedulesToPublicSchedule(
  req: NextRequest
): NextResponse | null {
  if (req.nextUrl.pathname !== "/dashboard/schedules") return null;

  const src = req.nextUrl.searchParams;
  const dest = new URL("/schedule", req.nextUrl.origin);

  if (src.toString() === "") {
    return NextResponse.redirect(dest);
  }

  for (const key of ["view", "date", "team", "subFacility", "q", "type"]) {
    const v = src.get(key);
    if (v) dest.searchParams.set(key, v);
  }

  // Dashboard defaults to hiding away games unless includeAway=true; public defaults to showing them.
  if (src.get("includeAway") === "true") {
    // leave showAway unset → public API default true
  } else {
    dest.searchParams.set("showAway", "false");
  }

  return NextResponse.redirect(dest);
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname === "/api/invitations/accept") {
    return NextResponse.next();
  }

  /** Public schedule page + JSON/ICS APIs — never require login */
  if (pathname === "/schedule" || pathname.startsWith("/api/schedule/")) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const guestPublic = redirectGuestDashboardSchedulesToPublicSchedule(req);
    if (guestPublic) return guestPublic;

    const base = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    const loginUrl = new URL("/login", base);
    const returnTo = `${req.nextUrl.pathname}${req.nextUrl.search}`;
    loginUrl.searchParams.set("callbackUrl", returnTo);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/schedule",
    "/dashboard/:path*",
    "/api/facilities/:path*",
    "/api/teams/:path*",
    "/api/seasons/:path*",
    "/api/schedules/:path*",
    "/api/schedule/:path*",
    "/api/volunteers/manage/:path*",
    "/api/invitations/:path*",
    "/api/coaches/:path*",
  ],
};
