-- Enable Row Level Security on all tables.
-- Prisma connects as the postgres superuser which bypasses RLS, so existing
-- server-side access is unaffected. This blocks unauthenticated Supabase
-- REST API (PostgREST) access via the anon role.
ALTER TABLE "User"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tutor"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subject"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Schedule" ENABLE ROW LEVEL SECURITY;
