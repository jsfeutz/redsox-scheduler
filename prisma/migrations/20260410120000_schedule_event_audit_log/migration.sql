-- CreateEnum
CREATE TYPE "ScheduleEventAuditAction" AS ENUM ('CREATE', 'UPDATE', 'REMOVE', 'DELETE', 'SERIES_CANCEL', 'BUMP_PENDING', 'TEAM_TRANSFER');

-- CreateTable
CREATE TABLE "ScheduleEventAuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "scheduleEventId" TEXT,
    "recurrenceGroupId" TEXT,
    "action" "ScheduleEventAuditAction" NOT NULL,
    "actorUserId" TEXT,
    "actorLabel" TEXT NOT NULL,
    "summary" TEXT,
    "before" JSONB,
    "after" JSONB,
    "meta" JSONB,

    CONSTRAINT "ScheduleEventAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleEventAuditLog_organizationId_createdAt_idx" ON "ScheduleEventAuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ScheduleEventAuditLog_scheduleEventId_idx" ON "ScheduleEventAuditLog"("scheduleEventId");

-- AddForeignKey
ALTER TABLE "ScheduleEventAuditLog" ADD CONSTRAINT "ScheduleEventAuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
