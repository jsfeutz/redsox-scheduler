import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isOrgAdmin } from "@/lib/auth-helpers";

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isOrgAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { teamJobsCountHours, teamJobsPublicSignup, requiredVolunteerHours, primaryColor, themeMode, smsEnabled, reminderHoursBefore } = body;

  const data: Record<string, unknown> = {};
  if (typeof teamJobsCountHours === "boolean") {
    data.teamJobsCountHours = teamJobsCountHours;
  }
  if (typeof teamJobsPublicSignup === "boolean") {
    data.teamJobsPublicSignup = teamJobsPublicSignup;
  }
  if (typeof requiredVolunteerHours === "number") {
    data.requiredVolunteerHours = Math.max(0, requiredVolunteerHours);
  }
  if (typeof primaryColor === "string" && /^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
    data.primaryColor = primaryColor;
  }
  if (typeof themeMode === "string" && ["light", "dark", "system"].includes(themeMode)) {
    data.themeMode = themeMode;
  }
  if (typeof smsEnabled === "boolean") {
    data.smsEnabled = smsEnabled;
  }
  if (typeof reminderHoursBefore === "string") {
    data.reminderHoursBefore = reminderHoursBefore;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const org = await prisma.organization.update({
    where: { id: user.organizationId },
    data,
    select: { id: true, teamJobsCountHours: true, teamJobsPublicSignup: true, requiredVolunteerHours: true, primaryColor: true, themeMode: true, smsEnabled: true, reminderHoursBefore: true },
  });

  return NextResponse.json(org);
}
