import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

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
    const base = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    const loginUrl = new URL("/login", base);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
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
