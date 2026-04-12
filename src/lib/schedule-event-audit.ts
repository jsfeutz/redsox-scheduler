import type { Prisma, ScheduleEventAuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SCHEDULE_EVENT_AUDIT_RETENTION_DAYS } from "@/lib/schedule-event-audit-constants";

export { SCHEDULE_EVENT_AUDIT_RETENTION_DAYS } from "@/lib/schedule-event-audit-constants";

export type ScheduleEventAuditDb = Prisma.TransactionClient | typeof prisma;

/** Delete audit log rows with createdAt before the rolling retention window (UTC). */
export async function purgeExpiredScheduleEventAuditLogs(): Promise<{
  deleted: number;
}> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - SCHEDULE_EVENT_AUDIT_RETENTION_DAYS);
  const result = await prisma.scheduleEventAuditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return { deleted: result.count };
}

type EventSnapshotInput = {
  id: string;
  title: string;
  type: string;
  priority?: string;
  startTime: Date;
  endTime: Date;
  notes: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  recurrenceGroupId: string | null;
  teamId: string | null;
  subFacilityId: string | null;
  seasonId: string | null;
  customLocation: string | null;
  customLocationUrl: string | null;
  gameVenue: string | null;
  noJobs?: boolean;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancelledByBumpId: string | null;
};

export function snapshotScheduleEvent(
  e: EventSnapshotInput
): Prisma.InputJsonValue {
  return {
    id: e.id,
    title: e.title,
    type: e.type,
    priority: e.priority ?? undefined,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    notes: e.notes,
    isRecurring: e.isRecurring,
    recurrenceRule: e.recurrenceRule,
    recurrenceGroupId: e.recurrenceGroupId,
    teamId: e.teamId,
    subFacilityId: e.subFacilityId,
    seasonId: e.seasonId,
    customLocation: e.customLocation,
    customLocationUrl: e.customLocationUrl,
    gameVenue: e.gameVenue,
    noJobs: e.noJobs,
    cancelledAt: e.cancelledAt?.toISOString() ?? null,
    cancelledBy: e.cancelledBy,
    cancelledByBumpId: e.cancelledByBumpId,
  };
}

export async function logScheduleEventAudit(
  db: ScheduleEventAuditDb,
  params: {
    organizationId: string;
    scheduleEventId?: string | null;
    recurrenceGroupId?: string | null;
    action: ScheduleEventAuditAction;
    actorUserId: string;
    actorLabel: string;
    summary?: string | null;
    before?: Prisma.InputJsonValue | null;
    after?: Prisma.InputJsonValue | null;
    meta?: Prisma.InputJsonValue | null;
  }
): Promise<void> {
  try {
    await db.scheduleEventAuditLog.create({
      data: {
        organizationId: params.organizationId,
        scheduleEventId: params.scheduleEventId ?? null,
        recurrenceGroupId: params.recurrenceGroupId ?? null,
        action: params.action,
        actorUserId: params.actorUserId,
        actorLabel: params.actorLabel,
        summary: params.summary ?? null,
        before: params.before ?? undefined,
        after: params.after ?? undefined,
        meta: params.meta ?? undefined,
      },
    });
  } catch (err) {
    console.error("[schedule-event-audit] Failed to write audit row:", err);
  }
}
