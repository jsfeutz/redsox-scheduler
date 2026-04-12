export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { VolunteerReport } from "@/components/volunteers/volunteer-report";
import { VolunteerParticipation } from "@/components/volunteers/volunteer-participation";
import { JobFillReport } from "@/components/volunteers/job-fill-report";
import { CancelledEventsReport } from "@/components/reports/cancelled-events-report";
import { EventAuditReport } from "@/components/reports/event-audit-report";
import { ReportsTabs } from "@/components/reports/reports-tabs";
import { getCurrentUser, canViewEventAudit } from "@/lib/auth-helpers";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const showEventAudit = canViewEventAudit(user.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Volunteer participation, job fill rates, and cancelled events.
          {showEventAudit ? (
            <>
              {" "}
              Open the{" "}
              <span className="text-foreground font-medium">Event audit</span> tab for the
              searchable schedule change log (adds, edits, removals, transfers).
            </>
          ) : null}
        </p>
      </div>

      <ReportsTabs
        participation={<VolunteerParticipation />}
        hours={<VolunteerReport />}
        fill={<JobFillReport />}
        cancelled={<CancelledEventsReport />}
        eventAudit={showEventAudit ? <EventAuditReport /> : null}
      />
    </div>
  );
}

