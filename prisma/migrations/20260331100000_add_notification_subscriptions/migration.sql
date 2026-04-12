-- CreateEnum
CREATE TYPE "NotifyTrigger" AS ENUM ('EVENT_ADDED', 'EVENT_CANCELLED', 'EVENT_TIME_CHANGED', 'JOB_SIGNUP_CANCELLED');

-- AlterTable
ALTER TABLE "JobAssignment" ADD COLUMN "reminderHoursBefore" INTEGER;

-- CreateTable
CREATE TABLE "NotificationSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "trigger" "NotifyTrigger" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "userId" TEXT,
    "teamId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationSubscription_organizationId_trigger_idx" ON "NotificationSubscription"("organizationId", "trigger");

-- CreateIndex
CREATE INDEX "NotificationSubscription_userId_idx" ON "NotificationSubscription"("userId");

-- AddForeignKey
ALTER TABLE "NotificationSubscription" ADD CONSTRAINT "NotificationSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSubscription" ADD CONSTRAINT "NotificationSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSubscription" ADD CONSTRAINT "NotificationSubscription_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
