import { NextResponse } from "next/server";
import {
  processUnfilledJobs24hNotifications,
  processUnfilledJobsWeeklyDigest,
} from "@/lib/notify";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret") || req.headers.get("x-cron-secret");

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [h24, week] = await Promise.all([
    processUnfilledJobs24hNotifications(),
    processUnfilledJobsWeeklyDigest(),
  ]);

  return NextResponse.json({
    unfilled24h: h24,
    unfilledWeek: week,
  });
}
