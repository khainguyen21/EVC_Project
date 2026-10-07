-- Each building's hours per term, for the availability form, the shift
-- planner and the rules page. Additive only: main keeps running against the
-- same database while this ships.

CREATE TABLE "BuildingHours" (
  "id" SERIAL NOT NULL,
  "termId" INTEGER NOT NULL,
  "building" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "open" INTEGER NOT NULL,
  "close" INTEGER NOT NULL,
  CONSTRAINT "BuildingHours_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BuildingHours_termId_building_day_key" ON "BuildingHours"("termId", "building", "day");

-- Deleting a term removes its hours.
ALTER TABLE "BuildingHours"
  ADD CONSTRAINT "BuildingHours_termId_fkey"
  FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Match the RLS posture of every other table (see 20260426000000_enable_rls).
ALTER TABLE "BuildingHours" ENABLE ROW LEVEL SECURITY;

-- Every existing term starts with the Fall 2026 hours William confirmed (VPA
-- is a guess). He changes them on the Terms page; new terms copy the last
-- term's. Times are minutes after midnight: 480 is 8 am, 1200 is 8 pm.
INSERT INTO "BuildingHours" ("termId", "building", "day", "open", "close")
SELECT t."id", h."building", h."day", h."open", h."close"
FROM "Term" t
CROSS JOIN (VALUES
  ('MS-112',      'Monday',    480, 1080),
  ('MS-112',      'Tuesday',   480, 1200),
  ('MS-112',      'Wednesday', 480, 1200),
  ('MS-112',      'Thursday',  480, 1200),
  ('MS-112',      'Friday',    480, 1020),
  ('LE-237',      'Monday',    540, 1020),
  ('LE-237',      'Tuesday',   540, 1020),
  ('LE-237',      'Wednesday', 540, 1020),
  ('LE-237',      'Thursday',  540, 1020),
  ('LE-237',      'Friday',    540,  780),
  ('SQ-231',      'Monday',    540,  960),
  ('SQ-231',      'Tuesday',   540,  900),
  ('SQ-231',      'Wednesday', 540,  900),
  ('SQ-231',      'Thursday',  540,  900),
  ('SQ-231',      'Friday',    540,  780),
  ('VPA-109/111', 'Monday',    660,  900),
  ('VPA-109/111', 'Tuesday',   660,  900),
  ('VPA-109/111', 'Wednesday', 660,  900),
  ('VPA-109/111', 'Thursday',  660,  900),
  ('VPA-109/111', 'Friday',    660,  900)
) AS h("building", "day", "open", "close");
