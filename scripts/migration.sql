-- ============================================================================
-- Noir:GateWay — Database Migration
-- ============================================================================
-- Run this against the Supabase PostgreSQL database to fix permissions,
-- add missing columns, and complete the schema.
--
-- HOW TO RUN:
--   Option A — Supabase Dashboard SQL Editor:
--     1. Go to https://supabase.com/dashboard/project/bovsdzvkhtcilsvkayec/sql/new
--     2. Paste this entire file
--     3. Click "Run"
--
--   Option B — psql direct (from an allowlisted IP):
--     PGPASSWORD='password' psql -h db.bovsdzvkhtcilsvkayec.supabase.co -p 5432 -U postgres -d postgres -f migration.sql
--
--   Option C — supabase CLI (from an allowlisted IP):
--     supabase db push --db-url "postgresql://postgres:password%40host@db.bovsdzvkhtcilsvkayec.supabase.co:6543/postgres"
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. FIX SCHEMA PERMISSIONS (Critical — unblocks all query access)
-- ═══════════════════════════════════════════════════════════════════════════

-- Grant schema USAGE to all roles that need to access public tables
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant table access
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Ensure future tables also get these grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ADD MISSING COLUMNS
-- ═══════════════════════════════════════════════════════════════════════════

-- User: add updatedAt (used by code)
ALTER TABLE "public"."User"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();

-- Topic: add updatedAt (used by code)
ALTER TABLE "public"."Topic"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();

-- AgentTask: add updatedAt (used by code)
ALTER TABLE "public"."AgentTask"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();

-- Comment: add parentId (forward-looking, for threaded replies)
ALTER TABLE "public"."Comment"
  ADD COLUMN IF NOT EXISTS "parentId" TEXT REFERENCES "public"."Comment"(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ADD MISSING INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_user_badge_code ON "public"."User"("badgeCode");
CREATE INDEX IF NOT EXISTS idx_user_role ON "public"."User"(role);
CREATE INDEX IF NOT EXISTS idx_topic_slug ON "public"."Topic"(slug);
CREATE INDEX IF NOT EXISTS idx_topic_status ON "public"."Topic"(status);
CREATE INDEX IF NOT EXISTS idx_topic_category ON "public"."Topic"("categoryId");
CREATE INDEX IF NOT EXISTS idx_topic_created_by ON "public"."Topic"("createdBy");
CREATE INDEX IF NOT EXISTS idx_comment_topic ON "public"."Comment"("topicId");
CREATE INDEX IF NOT EXISTS idx_comment_anonymous ON "public"."Comment"("anonymousId");
CREATE INDEX IF NOT EXISTS idx_comment_parent ON "public"."Comment"("parentId");
CREATE INDEX IF NOT EXISTS idx_vote_topic ON "public"."Vote"("topicId");
CREATE INDEX IF NOT EXISTS idx_vote_anonymous ON "public"."Vote"("anonymousId");
CREATE INDEX IF NOT EXISTS idx_elevation_user ON "public"."ElevationRequest"("userId");
CREATE INDEX IF NOT EXISTS idx_elevation_status ON "public"."ElevationRequest"(status);
CREATE INDEX IF NOT EXISTS idx_agent_task_agent ON "public"."AgentTask"("agentId");
CREATE INDEX IF NOT EXISTS idx_agent_task_status ON "public"."AgentTask"(status);
CREATE INDEX IF NOT EXISTS idx_discussion_created_by ON "public"."AgentDiscussion"("createdById");
CREATE INDEX IF NOT EXISTS idx_discussion_message_discussion ON "public"."AgentDiscussionMessage"("discussionId");

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. FIX MISSING DEFAULTS ON PRIMARY KEY COLUMNS
-- ═══════════════════════════════════════════════════════════════════════════
-- Several tables were created without DEFAULT gen_random_uuid() on the id
-- column, so INSERTs that omit id fail with null violation.
-- This is idempotent — setting an existing default is a no-op.

ALTER TABLE "public"."User"              ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "public"."Topic"             ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "public"."Comment"           ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "public"."Vote"              ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "public"."Category"          ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "public"."ElevationRequest"  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "public"."AgentTask"         ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "public"."AgentDiscussion"   ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "public"."AgentDiscussionMessage" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. SEED DATA — Default categories
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO "public"."Category" (name, slug, description, icon, color)
VALUES
  ('Forensic Science', 'forensic-science', 'Scientific evidence, forensics, and research analysis', 'flask-conical', '#06b6d4'),
  ('Cold Case', 'cold-case', 'Historical events, figures, and reopened investigations', 'book-open', '#f59e0b'),
  ('X-Files', 'x-files', 'Paranormal, UFOs, cryptids, and unexplained phenomena', 'ghost', '#8b5cf6'),
  ('Cyber Crimes', 'cyber-crimes', 'Tech conspiracies, digital forensics, and online fraud', 'cpu', '#10b981'),
  ('GovCorruption', 'gov-corruption', 'Political conspiracies, cover-ups, and government secrets', 'landmark', '#ef4444'),
  ('Medical Crimes', 'medical-crimes', 'Medical controversies, health fraud, and drug investigations', 'heart-pulse', '#ec4899'),
  ('Celebrity & Media', 'celebrity-media', 'Celebrity conspiracies, entertainment secrets, and fan theories', 'film', '#f97316'),
  ('Sports Integrity', 'sports-integrity', 'Sports conspiracies, match-fixing, and doping investigations', 'trophy', '#22c55e'),
  ('Organized Crime', 'organized-crime', 'Deep conspiracies, secret societies, and global criminal networks', 'eye-off', '#e11d48')
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. DATA TYPE FIXES (optional — if linkedIds needs to be JSONB)
-- ═══════════════════════════════════════════════════════════════════════════
-- The User.linkedIds column is currently TEXT[] in the old schema.sql
-- but the database has it as JSONB. If you need to change TEXT[] to JSONB:
--   ALTER TABLE "public"."User" ALTER COLUMN "linkedIds" TYPE JSONB
--   USING CASE
--     WHEN "linkedIds" IS NULL THEN '[]'::jsonb
--     ELSE to_jsonb("linkedIds")
--   END;
-- However, this should already be JSONB in the current DB.

COMMIT;
