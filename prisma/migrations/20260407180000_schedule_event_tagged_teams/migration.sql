-- CreateTable
CREATE TABLE "ScheduleEventTaggedTeam" (
    "id" TEXT NOT NULL,
    "scheduleEventId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleEventTaggedTeam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleEventTaggedTeam_scheduleEventId_teamId_key" ON "ScheduleEventTaggedTeam"("scheduleEventId", "teamId");

-- CreateIndex
CREATE INDEX "ScheduleEventTaggedTeam_teamId_idx" ON "ScheduleEventTaggedTeam"("teamId");

-- AddForeignKey
ALTER TABLE "ScheduleEventTaggedTeam" ADD CONSTRAINT "ScheduleEventTaggedTeam_scheduleEventId_fkey" FOREIGN KEY ("scheduleEventId") REFERENCES "ScheduleEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEventTaggedTeam" ADD CONSTRAINT "ScheduleEventTaggedTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
