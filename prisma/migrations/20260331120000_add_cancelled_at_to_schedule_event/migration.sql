-- AlterTable
ALTER TABLE "ScheduleEvent" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "ScheduleEvent" ADD COLUMN "cancelledBy" TEXT;

-- CreateIndex
CREATE INDEX "ScheduleEvent_cancelledAt_idx" ON "ScheduleEvent"("cancelledAt");
