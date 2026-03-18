-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('JOB_REMINDER', 'SCHEDULE_CHANGE', 'SIGNUP_CONFIRM', 'CANCELLATION');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED');

-- AlterTable Organization
ALTER TABLE "Organization" ADD COLUMN "smsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN "reminderHoursBefore" TEXT NOT NULL DEFAULT '24,2';

-- AlterTable User
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "smsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable JobAssignment
ALTER TABLE "JobAssignment" ADD COLUMN "phone" TEXT;

-- CreateTable NotificationLog
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipientPhone" TEXT,
    "recipientEmail" TEXT,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "error" TEXT,
    "relatedEventId" TEXT,
    "relatedJobId" TEXT,
    "relatedAssignId" TEXT,
    "reminderKey" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationLog_type_idx" ON "NotificationLog"("type");
CREATE INDEX "NotificationLog_relatedEventId_idx" ON "NotificationLog"("relatedEventId");
CREATE INDEX "NotificationLog_relatedJobId_idx" ON "NotificationLog"("relatedJobId");
CREATE INDEX "NotificationLog_relatedAssignId_idx" ON "NotificationLog"("relatedAssignId");
CREATE INDEX "NotificationLog_reminderKey_idx" ON "NotificationLog"("reminderKey");
CREATE INDEX "NotificationLog_sentAt_idx" ON "NotificationLog"("sentAt");
