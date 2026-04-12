-- Add facility color for facility-based schedule coloring
ALTER TABLE "Facility" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#64748b';

