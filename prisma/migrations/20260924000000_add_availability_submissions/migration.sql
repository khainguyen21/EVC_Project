-- Tutors send their term availability through a public form instead of
-- replying to William's email. Additive only: main keeps running against the
-- same database while this ships.

-- Set while a term's availability form is open; it is the key in the emailed link.
ALTER TABLE "Term" ADD COLUMN "availabilityCode" TEXT;
CREATE UNIQUE INDEX "Term_availabilityCode_key" ON "Term"("availabilityCode");

CREATE TABLE "AvailabilitySubmission" (
  "id" SERIAL NOT NULL,
  "termId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "units" DOUBLE PRECISION NOT NULL,
  "trainingDone" BOOLEAN NOT NULL,
  "subjectsRaw" TEXT NOT NULL,
  "subjectCodes" TEXT[],
  "availability" JSONB NOT NULL,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "resubmittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AvailabilitySubmission_pkey" PRIMARY KEY ("id")
);

-- One submission per student per term; resubmitting replaces it.
CREATE UNIQUE INDEX "AvailabilitySubmission_termId_studentId_key"
  ON "AvailabilitySubmission"("termId", "studentId");

ALTER TABLE "AvailabilitySubmission"
  ADD CONSTRAINT "AvailabilitySubmission_termId_fkey"
  FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Per-IP rate limiting for the public form (hashed IPs, never raw ones).
CREATE TABLE "SubmissionAttempt" (
  "id" SERIAL NOT NULL,
  "ipHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubmissionAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubmissionAttempt_ipHash_createdAt_idx"
  ON "SubmissionAttempt"("ipHash", "createdAt");

-- Match the RLS posture of every other table (see 20260426000000_enable_rls).
-- Submissions hold student IDs and emails, so the Supabase REST API's anon
-- role must not be able to read them.
ALTER TABLE "AvailabilitySubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubmissionAttempt"      ENABLE ROW LEVEL SECURITY;
