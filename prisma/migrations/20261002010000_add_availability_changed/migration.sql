-- The planner's "Availability changed" badge: set when a tutor resubmits while
-- they have planner shifts, cleared when William approves or declines them.
-- Additive only: main keeps running against the same database while this ships.
ALTER TABLE "AvailabilitySubmission" ADD COLUMN "availabilityChanged" BOOLEAN NOT NULL DEFAULT false;
