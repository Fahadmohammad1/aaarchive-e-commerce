-- Typo-tolerant product search (PRD §5.4). pg_trgm ships with Postgres and is
-- available on Supabase's free tier. IF NOT EXISTS: Supabase projects may
-- already have it (in the "extensions" schema, which is on the search_path).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops);
