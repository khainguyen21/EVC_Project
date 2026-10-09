-- William thinks of fair weekly hours per tutor as a range, so the planner's
-- usual hours become a minimum and a maximum. A number already set becomes a
-- range of that one number. usualWeeklyHours only ever existed on the planner
-- branch, so main never reads it.
ALTER TABLE "SiteSettings" ADD COLUMN "usualHoursMin" DOUBLE PRECISION;
ALTER TABLE "SiteSettings" ADD COLUMN "usualHoursMax" DOUBLE PRECISION;

UPDATE "SiteSettings"
SET "usualHoursMin" = "usualWeeklyHours", "usualHoursMax" = "usualWeeklyHours"
WHERE "usualWeeklyHours" IS NOT NULL;

ALTER TABLE "SiteSettings" DROP COLUMN "usualWeeklyHours";
