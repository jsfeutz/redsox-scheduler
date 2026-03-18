import { NextResponse } from "next/server";

// This route exists only in builds that include Home/Away, Staff tab, and dropdown fixes.
// If you get 200 and this body, you're on the latest deploy (scheduler-v2.2+).
export async function GET() {
  return NextResponse.json({
    version: "scheduler-v3.3",
    features: ["gameVenue", "staffTab", "dropdownLabels"],
    built: "2026-03-17",
  });
}
