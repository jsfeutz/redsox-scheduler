-- CreateEnum
CREATE TYPE "AdminNotifyEvent" AS ENUM ('JOB_CANCELLATION', 'UNFILLED_JOBS_24H', 'UNFILLED_JOBS_WEEK');

-- CreateEnum
CREATE TYPE "AdminNotifyChannel" AS ENUM ('EMAIL', 'SMS', 'BOTH');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ADMIN_ALERT';

-- AlterTable
ALTER TABLE "JobTemplate" ADD COLUMN "askComfortLevel" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "JobAssignment" ADD COLUMN "comfortLevel" TEXT;

-- CreateTable
CREATE TABLE "AdminNotificationPref" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "event" "AdminNotifyEvent" NOT NULL,
    "channel" "AdminNotifyChannel" NOT NULL DEFAULT 'EMAIL',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminNotificationPref_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminNotificationPref_userId_event_key" ON "AdminNotificationPref"("userId", "event");

-- CreateIndex
CREATE INDEX "AdminNotificationPref_userId_idx" ON "AdminNotificationPref"("userId");

-- AddForeignKey
ALTER TABLE "AdminNotificationPref" ADD CONSTRAINT "AdminNotificationPref_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
