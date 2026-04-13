export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  canInviteUsers,
  canManageSchedule,
} from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { getOrgTimeZone, getOrgTimeZoneLabel } from "@/lib/org-datetime";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId },
  });

  if (!organization) redirect("/login");

  const isAdmin = canInviteUsers(user.role);
  const canManage = canManageSchedule(user.role);

  const [templates, facilities, teams] = await Promise.all([
    prisma.jobTemplate.findMany({
      where: {
        organizationId: user.organizationId,
        teamId: null,
      },
      include: {
        _count: { select: { gameJobs: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.facility.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.team.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Organization settings, users, and job configuration
        </p>
      </div>

      <SettingsTabs
        organizationName={organization.name}
        organizationId={organization.id}
        organizationTimeZone={getOrgTimeZone()}
        organizationTimeZoneLabel={getOrgTimeZoneLabel()}
        teamJobsCountHours={organization.teamJobsCountHours}
        teamJobsPublicSignup={organization.teamJobsPublicSignup}
        requiredVolunteerHours={organization.requiredVolunteerHours}
        primaryColor={organization.primaryColor}
        themeMode={organization.themeMode}
        brandingIconVersion={organization.brandingIconVersion}
        smsEnabled={organization.smsEnabled}
        reminderHoursBefore={organization.reminderHoursBefore}
        cancelCutoffHours={organization.cancelCutoffHours}
        isAdmin={isAdmin}
        canManage={canManage}
        templates={templates}
        facilities={facilities}
        teams={teams}
      />
    </div>
  );
}
