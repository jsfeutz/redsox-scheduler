-- AlterEnum (add OTHER to EventType)
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'OTHER';

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- AlterTable Organization
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "teamJobsCountHours" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "teamJobsPublicSignup" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable Team
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable ScheduleEvent
ALTER TABLE "ScheduleEvent" ADD COLUMN IF NOT EXISTS "recurrenceGroupId" TEXT;

-- AlterTable JobTemplate
ALTER TABLE "JobTemplate" ADD COLUMN IF NOT EXISTS "hoursPerGame" DOUBLE PRECISION NOT NULL DEFAULT 2;
ALTER TABLE "JobTemplate" ADD COLUMN IF NOT EXISTS "maxSlots" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "JobTemplate" ADD COLUMN IF NOT EXISTS "forEventType" TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE "JobTemplate" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable GameJob
ALTER TABLE "GameJob" ADD COLUMN IF NOT EXISTS "overrideName" TEXT;
ALTER TABLE "GameJob" ADD COLUMN IF NOT EXISTS "overrideDescription" TEXT;
ALTER TABLE "GameJob" ADD COLUMN IF NOT EXISTS "overrideHoursPerGame" DOUBLE PRECISION;

-- AlterTable JobAssignment
ALTER TABLE "JobAssignment" ADD COLUMN IF NOT EXISTS "playerName" TEXT;
ALTER TABLE "JobAssignment" ADD COLUMN IF NOT EXISTS "hoursEarned" DOUBLE PRECISION;
ALTER TABLE "JobAssignment" ADD COLUMN IF NOT EXISTS "cancelToken" TEXT;
ALTER TABLE "JobAssignment" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

-- Backfill cancelToken with unique cuids for existing rows
UPDATE "JobAssignment" SET "cancelToken" = gen_random_uuid()::TEXT WHERE "cancelToken" IS NULL;

-- Now make cancelToken NOT NULL and UNIQUE
ALTER TABLE "JobAssignment" ALTER COLUMN "cancelToken" SET NOT NULL;

-- CreateTable EmailVerification
CREATE TABLE IF NOT EXISTS "EmailVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable TeamJobOverride
CREATE TABLE IF NOT EXISTS "TeamJobOverride" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "jobTemplateId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TeamJobOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable SlotRequest
CREATE TABLE IF NOT EXISTS "SlotRequest" (
    "id" TEXT NOT NULL,
    "scheduleEventId" TEXT NOT NULL,
    "requestingTeamId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "respondedById" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "JobAssignment_cancelToken_key" ON "JobAssignment"("cancelToken");
CREATE INDEX IF NOT EXISTS "JobAssignment_email_idx" ON "JobAssignment"("email");
CREATE INDEX IF NOT EXISTS "JobAssignment_cancelToken_idx" ON "JobAssignment"("cancelToken");
CREATE INDEX IF NOT EXISTS "ScheduleEvent_recurrenceGroupId_idx" ON "ScheduleEvent"("recurrenceGroupId");
CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerification_token_key" ON "EmailVerification"("token");
CREATE INDEX IF NOT EXISTS "EmailVerification_token_idx" ON "EmailVerification"("token");
CREATE INDEX IF NOT EXISTS "EmailVerification_email_idx" ON "EmailVerification"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "TeamJobOverride_teamId_jobTemplateId_key" ON "TeamJobOverride"("teamId", "jobTemplateId");
CREATE INDEX IF NOT EXISTS "TeamJobOverride_teamId_idx" ON "TeamJobOverride"("teamId");
CREATE INDEX IF NOT EXISTS "SlotRequest_scheduleEventId_idx" ON "SlotRequest"("scheduleEventId");
CREATE INDEX IF NOT EXISTS "SlotRequest_requestingTeamId_idx" ON "SlotRequest"("requestingTeamId");
CREATE INDEX IF NOT EXISTS "SlotRequest_requestedById_idx" ON "SlotRequest"("requestedById");
CREATE INDEX IF NOT EXISTS "SlotRequest_status_idx" ON "SlotRequest"("status");

-- AddForeignKey
ALTER TABLE "TeamJobOverride" ADD CONSTRAINT "TeamJobOverride_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamJobOverride" ADD CONSTRAINT "TeamJobOverride_jobTemplateId_fkey" FOREIGN KEY ("jobTemplateId") REFERENCES "JobTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SlotRequest" ADD CONSTRAINT "SlotRequest_scheduleEventId_fkey" FOREIGN KEY ("scheduleEventId") REFERENCES "ScheduleEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SlotRequest" ADD CONSTRAINT "SlotRequest_requestingTeamId_fkey" FOREIGN KEY ("requestingTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SlotRequest" ADD CONSTRAINT "SlotRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SlotRequest" ADD CONSTRAINT "SlotRequest_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
