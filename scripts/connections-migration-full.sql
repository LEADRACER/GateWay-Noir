-- ═══════════════════════════════════════════════════════════════════════════
-- USER CONNECTIONS SYSTEM — FULL MIGRATION SCRIPT
-- Run this entire script in Supabase SQL Editor to update your database.
-- Safe to run multiple times (idempotent).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ENSURE UserConnection TABLE EXISTS (new schema)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "public"."UserConnection" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "public"."User"(id) ON DELETE CASCADE,
  "connectedUserId" TEXT NOT NULL REFERENCES "public"."User"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'following' CHECK (status IN ('following', 'mutual', 'rejected')),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE("userId", "connectedUserId")
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ENSURE ALL COLUMNS EXIST WITH CORRECT TYPES
-- ═══════════════════════════════════════════════════════════════════════════

-- Ensure status column exists (skip if table was just created above)
DO $$
DECLARE
  status_column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'UserConnection'
      AND column_name = 'status'
  ) INTO status_column_exists;

  IF NOT status_column_exists THEN
    ALTER TABLE "public"."UserConnection"
      ADD COLUMN status TEXT NOT NULL DEFAULT 'following';
  ELSE
    ALTER TABLE "public"."UserConnection"
      ALTER COLUMN status SET DEFAULT 'following';
  END IF;
END $$;

-- Ensure metadata column exists
ALTER TABLE "public"."UserConnection"
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. BACKFILL EXISTING DATA
-- ═══════════════════════════════════════════════════════════════════════════

-- Bidirectional pending pairs → mutual
UPDATE "public"."UserConnection"
SET status = 'mutual'
WHERE status = 'pending'
  AND EXISTS (
    SELECT 1
    FROM "public"."UserConnection" AS reverse_connection
    WHERE reverse_connection."userId" = "UserConnection"."connectedUserId"
      AND reverse_connection."connectedUserId" = "UserConnection"."userId"
  );

-- Remaining single-direction pending → following
UPDATE "public"."UserConnection"
SET status = 'following'
WHERE status = 'pending';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. FIX CHECK CONSTRAINT
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'UserConnection_status_check'
      AND table_name = 'UserConnection'
  ) THEN
    ALTER TABLE "public"."UserConnection"
      DROP CONSTRAINT "UserConnection_status_check";
  END IF;
  ALTER TABLE "public"."UserConnection"
    ADD CONSTRAINT "UserConnection_status_check"
    CHECK (status IN ('following', 'mutual', 'rejected'));
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ENSURE INDEXES EXIST
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_user_connection_user ON "public"."UserConnection"("userId");
CREATE INDEX IF NOT EXISTS idx_user_connection_connected ON "public"."UserConnection"("connectedUserId");
CREATE INDEX IF NOT EXISTS idx_user_connection_status ON "public"."UserConnection"(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. ENSURE User.connectionPrivacy EXISTS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "public"."User"
  ADD COLUMN IF NOT EXISTS "connectionPrivacy" TEXT NOT NULL DEFAULT 'open'
    CHECK ("connectionPrivacy" IN ('open', 'mutual_only', 'closed'));

CREATE INDEX IF NOT EXISTS idx_user_connection_privacy ON "public"."User"("connectionPrivacy");

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. VERIFICATION (run this query after the script completes):
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT status, COUNT(*) FROM "public"."UserConnection" GROUP BY status;
-- Expected: only 'following', 'mutual', 'rejected'
-- Should NOT see: 'pending', 'accepted'

COMMIT;
