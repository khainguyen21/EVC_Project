-- SiteSettings was created after 20260426000000_enable_rls and never had RLS
-- turned on, and neither did Prisma's own _prisma_migrations table. Supabase
-- flags both as readable and writable by anyone through its REST API (anon
-- key). Prisma connects as postgres, which bypasses RLS, so the app is
-- unaffected. Enabling RLS on a table that already has it is a no-op.
ALTER TABLE "SiteSettings"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
