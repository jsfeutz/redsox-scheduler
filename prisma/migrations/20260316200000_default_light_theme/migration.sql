-- Change default theme mode from dark to light
ALTER TABLE "Organization" ALTER COLUMN "themeMode" SET DEFAULT 'light';

-- Update existing orgs that still have the old default
UPDATE "Organization" SET "themeMode" = 'light' WHERE "themeMode" = 'dark';
