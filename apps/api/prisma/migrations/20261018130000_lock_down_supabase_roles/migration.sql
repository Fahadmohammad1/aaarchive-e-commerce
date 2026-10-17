-- Security hardening (docs/rules.md §6, §8). No schema changes.
--
-- 1. Prisma creates _prisma_migrations itself, so the RLS lines in earlier
--    migrations never covered it.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- 2. Supabase grants its public API roles (anon, authenticated) full access to
--    everything in the public schema by default. This app never uses them —
--    only the API, connecting as the table owner, touches the database — so
--    take every privilege away, now and for objects created later.
--    Wrapped in a check so the migration also runs on plain Postgres (CI,
--    local dev), where these roles do not exist.
DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
    END IF;
  END LOOP;
END
$$;
