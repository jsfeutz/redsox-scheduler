-- AlterEnum
ALTER TYPE "ScheduleEventAuditAction" ADD VALUE 'JOB_CREATE';
ALTER TYPE "ScheduleEventAuditAction" ADD VALUE 'JOB_UPDATE';
ALTER TYPE "ScheduleEventAuditAction" ADD VALUE 'JOB_DISABLE';
ALTER TYPE "ScheduleEventAuditAction" ADD VALUE 'ASSIGNMENT_ADD';
ALTER TYPE "ScheduleEventAuditAction" ADD VALUE 'ASSIGNMENT_REMOVE';
ALTER TYPE "ScheduleEventAuditAction" ADD VALUE 'SLOT_SIGNUP';
