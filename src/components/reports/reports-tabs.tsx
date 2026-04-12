"use client";

import { useSearchParams } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const VALID_TABS = [
  "participation",
  "hours",
  "fill",
  "cancelled",
  "event-audit",
] as const;

export function ReportsTabs({
  participation,
  hours,
  fill,
  cancelled,
  eventAudit,
}: {
  participation: React.ReactNode;
  hours: React.ReactNode;
  fill: React.ReactNode;
  cancelled: React.ReactNode;
  eventAudit: React.ReactNode | null;
}) {
  const params = useSearchParams();
  const tabParam = params.get("tab");
  let defaultTab =
    tabParam && VALID_TABS.includes(tabParam as (typeof VALID_TABS)[number])
      ? tabParam
      : "participation";
  if (defaultTab === "event-audit" && !eventAudit) {
    defaultTab = "participation";
  }

  return (
    <Tabs key={defaultTab} defaultValue={defaultTab}>
      <TabsList className="flex-wrap">
        <TabsTrigger value="participation">Family Participation</TabsTrigger>
        <TabsTrigger value="hours">Volunteer Hours for Player</TabsTrigger>
        <TabsTrigger value="fill">Job Fill Rates</TabsTrigger>
        <TabsTrigger value="cancelled">Cancelled Events</TabsTrigger>
        {eventAudit ? (
          <TabsTrigger value="event-audit">Event audit</TabsTrigger>
        ) : null}
      </TabsList>

      <TabsContent value="participation" className="mt-4">
        {participation}
      </TabsContent>
      <TabsContent value="hours" className="mt-4">
        {hours}
      </TabsContent>
      <TabsContent value="fill" className="mt-4">
        {fill}
      </TabsContent>
      <TabsContent value="cancelled" className="mt-4">
        {cancelled}
      </TabsContent>
      {eventAudit ? (
        <TabsContent value="event-audit" className="mt-4">
          {eventAudit}
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
