-- CreateEnum
CREATE TYPE "NotifScope" AS ENUM ('ALL_EVENTS', 'MY_TEAMS', 'SPECIFIC_TEAM');

-- AlterEnum
ALTER TYPE "NotifyTrigger" ADD VALUE 'CLUB_EVENT_CHANGED';
ALTER TYPE "NotifyTrigger" ADD VALUE 'SLOT_REQUEST';

-- AlterTable
ALTER TABLE "NotificationSubscription" ADD COLUMN "scope" "NotifScope" NOT NULL DEFAULT 'MY_TEAMS';
