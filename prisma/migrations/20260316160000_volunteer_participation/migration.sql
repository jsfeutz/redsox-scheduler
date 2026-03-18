-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "requiredVolunteerHours" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "JobAssignment" ADD COLUMN "playerVolunteerId" TEXT;

-- CreateIndex
CREATE INDEX "JobAssignment_playerVolunteerId_idx" ON "JobAssignment"("playerVolunteerId");

-- CreateIndex
CREATE INDEX "PlayerVolunteer_email_idx" ON "PlayerVolunteer"("email");

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_playerVolunteerId_fkey" FOREIGN KEY ("playerVolunteerId") REFERENCES "PlayerVolunteer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
