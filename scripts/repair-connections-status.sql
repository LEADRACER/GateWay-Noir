-- Standalone SQL to fix UserConnection status for the follow/followback system.
-- Run this in Supabase SQL Editor if you have an existing database with old status values.
-- Safe to run multiple times (idempotent).

-- Step 1: Add status column if missing
DO $$
DECLARE
  status_column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = '"UserConnection"'::regclass
      AND attname = 'status'
      AND NOT attisdropped
  ) INTO status_column_exists;

  IF NOT status_column_exists THEN
    ALTER TABLE "public"."UserConnection"
      ADD COLUMN status TEXT NOT NULL DEFAULT 'following';
  END IF;
END $$;

-- Step 2: Backfill old bidirectional 'pending' rows as 'mutual'
UPDATE "public"."UserConnection"
SET status = 'mutual'
WHERE status = 'pending'
  AND EXISTS (
    SELECT 1
    FROM "public"."UserConnection" AS reverse_connection
    WHERE reverse_connection."userId" = "UserConnection"."connectedUserId"
      AND reverse_connection."connectedUserId" = "UserConnection"."userId"
  );

-- Step 3: Convert remaining single-direction 'pending' rows to 'following'
UPDATE "public"."UserConnection"
SET status = 'following'
WHERE status = 'pending';

-- Step 4: Update CHECK constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'UserConnection_status_check'
      AND conrelid = '"UserConnection"'::regclass
  ) THEN
    ALTER TABLE "public"."UserConnection"
      DROP CONSTRAINT "UserConnection_status_check";
  END IF;
  ALTER TABLE "public"."UserConnection"
    ADD CONSTRAINT "UserConnection_status_check"
    CHECK (status IN ('following', 'mutual', 'rejected'));
END $$;

-- Step 5: Set default
ALTER TABLE "public"."UserConnection"
  ALTER COLUMN status SET DEFAULT 'following';

-- Step 6: Verify - run this to check results:
-- SELECT status, COUNT(*) FROM "public"."UserConnection" GROUP BY status;
