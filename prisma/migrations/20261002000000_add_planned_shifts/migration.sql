-- The shift planner: William places approved tutors' shifts into buildings.
-- Additive only: main keeps running against the same database while this ships.

-- William's usual weekly hours per tutor. Null until he sets it on the planner.
ALTER TABLE "SiteSettings" ADD COLUMN "usualWeeklyHours" DOUBLE PRECISION;

CREATE TABLE "PlannedShift" (
  "id" TEXT NOT NULL,
  "submissionId" INTEGER NOT NULL,
  "day" TEXT NOT NULL,
  "building" TEXT NOT NULL,
  "start" INTEGER NOT NULL,
  "end" INTEGER NOT NULL,
  CONSTRAINT "PlannedShift_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlannedShift_submissionId_idx" ON "PlannedShift"("submissionId");

-- Deleting a submission removes its shifts.
ALTER TABLE "PlannedShift"
  ADD CONSTRAINT "PlannedShift_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "AvailabilitySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Match the RLS posture of every other table (see 20260426000000_enable_rls).
ALTER TABLE "PlannedShift" ENABLE ROW LEVEL SECURITY;
