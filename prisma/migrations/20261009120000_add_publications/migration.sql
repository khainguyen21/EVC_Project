-- Publish: copies a term's shift planner onto the public schedule.
-- Additive only: main keeps running against the same database while this ships.

-- Last time William changed a tutor on Manage Staff. Publish rebuilds student
-- tutors from the planner, so its review screen names any changed since.
ALTER TABLE "Tutor" ADD COLUMN "editedOnManageStaffAt" TIMESTAMP(3);

-- One row per Publish. "replaced" keeps the student tutors it removed, so a
-- mistaken publish can be put back; "published" is what it created.
CREATE TABLE "Publication" (
  "id" SERIAL NOT NULL,
  "termId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "replaced" JSONB NOT NULL,
  "published" JSONB NOT NULL,
  CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Publication_termId_idx" ON "Publication"("termId");

-- Deleting a term removes its publications.
ALTER TABLE "Publication"
  ADD CONSTRAINT "Publication_termId_fkey"
  FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Match the RLS posture of every other table (see 20260426000000_enable_rls).
ALTER TABLE "Publication" ENABLE ROW LEVEL SECURITY;
