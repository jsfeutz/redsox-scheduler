-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('HEAD_COACH', 'ASSISTANT_COACH', 'TEAM_MANAGER');

-- CreateEnum
CREATE TYPE "JobScope" AS ENUM ('ORG', 'TEAM', 'FACILITY');

-- AlterTable
ALTER TABLE "GameJob" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slotsNeeded" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "teamId" TEXT,
ADD COLUMN     "teamRole" "TeamRole";

-- AlterTable
ALTER TABLE "JobTemplate" ADD COLUMN     "facilityId" TEXT,
ADD COLUMN     "scope" "JobScope" NOT NULL DEFAULT 'ORG',
ADD COLUMN     "teamId" TEXT;

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonJobConfig" (
    "id" TEXT NOT NULL,
    "seasonTeamId" TEXT NOT NULL,
    "jobTemplateId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "slotsNeeded" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonJobConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityJobConfig" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "jobTemplateId" TEXT NOT NULL,
    "slotsNeeded" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityJobConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "SeasonJobConfig_seasonTeamId_idx" ON "SeasonJobConfig"("seasonTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonJobConfig_seasonTeamId_jobTemplateId_eventType_key" ON "SeasonJobConfig"("seasonTeamId", "jobTemplateId", "eventType");

-- CreateIndex
CREATE INDEX "FacilityJobConfig_facilityId_idx" ON "FacilityJobConfig"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityJobConfig_facilityId_jobTemplateId_key" ON "FacilityJobConfig"("facilityId", "jobTemplateId");

-- CreateIndex
CREATE INDEX "GameJob_isPublic_idx" ON "GameJob"("isPublic");

-- CreateIndex
CREATE INDEX "JobTemplate_teamId_idx" ON "JobTemplate"("teamId");

-- CreateIndex
CREATE INDEX "JobTemplate_facilityId_idx" ON "JobTemplate"("facilityId");

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonJobConfig" ADD CONSTRAINT "SeasonJobConfig_seasonTeamId_fkey" FOREIGN KEY ("seasonTeamId") REFERENCES "SeasonTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonJobConfig" ADD CONSTRAINT "SeasonJobConfig_jobTemplateId_fkey" FOREIGN KEY ("jobTemplateId") REFERENCES "JobTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityJobConfig" ADD CONSTRAINT "FacilityJobConfig_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityJobConfig" ADD CONSTRAINT "FacilityJobConfig_jobTemplateId_fkey" FOREIGN KEY ("jobTemplateId") REFERENCES "JobTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTemplate" ADD CONSTRAINT "JobTemplate_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTemplate" ADD CONSTRAINT "JobTemplate_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
