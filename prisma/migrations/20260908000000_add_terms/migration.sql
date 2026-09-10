-- Academic terms drive the homepage banner and gate the "Available Now" feature.
CREATE TABLE "Term" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- Days within a term when campus tutoring is closed (Labor Day, Thanksgiving, ...).
CREATE TABLE "Holiday" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "termId" INTEGER NOT NULL,
  CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Holiday_termId_date_key" ON "Holiday"("termId", "date");

ALTER TABLE "Holiday"
  ADD CONSTRAINT "Holiday_termId_fkey"
  FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Match the RLS posture of every other table (see 20260426000000_enable_rls):
-- Prisma connects as the table owner and bypasses RLS; this only blocks the
-- Supabase REST API's anon role.
ALTER TABLE "Term"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Holiday" ENABLE ROW LEVEL SECURITY;
