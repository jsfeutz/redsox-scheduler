-- CreateEnum
CREATE TYPE "BlackoutScope" AS ENUM ('ORG_WIDE', 'FACILITY');

-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'CLUB_EVENT';

-- AlterTable: make teamId and subFacilityId optional, add new fields
ALTER TABLE "ScheduleEvent" ALTER COLUMN "teamId" DROP NOT NULL;
ALTER TABLE "ScheduleEvent" ALTER COLUMN "subFacilityId" DROP NOT NULL;
ALTER TABLE "ScheduleEvent" ADD COLUMN "customLocation" TEXT;
ALTER TABLE "ScheduleEvent" ADD COLUMN "customLocationUrl" TEXT;
ALTER TABLE "ScheduleEvent" ADD COLUMN "cancelledByBumpId" TEXT;

-- AlterTable: add googleMapsUrl to Facility
ALTER TABLE "Facility" ADD COLUMN "googleMapsUrl" TEXT;

-- CreateTable
CREATE TABLE "BlackoutDate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "scope" "BlackoutScope" NOT NULL,
    "facilityId" TEXT,
    "organizationId" TEXT NOT NULL,
    "eventTypes" TEXT NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlackoutDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulingRule" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "subFacilityId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'ALL',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchedulingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlackoutDate_organizationId_idx" ON "BlackoutDate"("organizationId");
CREATE INDEX "BlackoutDate_facilityId_idx" ON "BlackoutDate"("facilityId");
CREATE INDEX "BlackoutDate_startDate_endDate_idx" ON "BlackoutDate"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "SchedulingRule_organizationId_idx" ON "SchedulingRule"("organizationId");
CREATE INDEX "SchedulingRule_teamId_idx" ON "SchedulingRule"("teamId");
CREATE INDEX "SchedulingRule_dayOfWeek_idx" ON "SchedulingRule"("dayOfWeek");

-- AddForeignKey
ALTER TABLE "BlackoutDate" ADD CONSTRAINT "BlackoutDate_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlackoutDate" ADD CONSTRAINT "BlackoutDate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingRule" ADD CONSTRAINT "SchedulingRule_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchedulingRule" ADD CONSTRAINT "SchedulingRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
