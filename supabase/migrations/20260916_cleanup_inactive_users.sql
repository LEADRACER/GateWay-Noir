-- Migration: Enable pg_cron and schedule inactive user cleanup
-- Run this in Supabase Dashboard SQL Editor (or via psql if allowlisted)
-- Requires pg_cron extension (available in Supabase)

BEGIN;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 3:00 AM UTC
-- Calls the API endpoint via pg_net (requires pg_net extension)
-- Alternative: Use a database function directly (see below)

-- Option 1: Using pg_net to call HTTP endpoint (requires pg_net extension)
-- CREATE EXTENSION IF NOT EXISTS pg_net;
-- SELECT cron.schedule(
--   'cleanup-inactive-users-daily',
--   '0 3 * * *', -- 3:00 AM UTC daily
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/api/cron/cleanup-inactive-users',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.cron_secret'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{"days": 30}'::jsonb
--   );
--   $$
-- );

-- Option 2: Pure SQL function (recommended - no external HTTP call needed)
-- Create a database function that does the cleanup directly

CREATE OR REPLACE FUNCTION cleanup_inactive_users(days_inactive INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
  inactive_user_ids UUID[];
  deleted_count INTEGER := 0;
  deleted_users JSONB := '[]'::JSONB;
BEGIN
  cutoff_date := NOW() - (days_inactive || ' days')::INTERVAL;

  -- Find inactive DETECTIVE and AGENT users
  SELECT ARRAY_AGG(id) INTO inactive_user_ids
  FROM public."User"
  WHERE role IN ('DETECTIVE', 'AGENT')
    AND ("lastSeenAt" IS NULL OR "lastSeenAt" < cutoff_date)
    AND "createdAt" < cutoff_date;

  IF inactive_user_ids IS NULL OR array_length(inactive_user_ids, 1) = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'deleted_count', 0,
      'deleted_users', '[]'::JSONB
    );
  END IF;

  -- Collect user info before deletion
  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'badgeCode', "badgeCode",
    'displayName', "displayName",
    'role', role,
    'lastSeenAt', "lastSeenAt"
  )) INTO deleted_users
  FROM public."User"
  WHERE id = ANY(inactive_user_ids);

  -- Delete related data (foreign key constraints)
  DELETE FROM public."Vote" WHERE "userId" = ANY(inactive_user_ids);
  DELETE FROM public."Comment" WHERE "userId" = ANY(inactive_user_ids);
  DELETE FROM public."AgentTaskEvidence" WHERE "agentId" = ANY(inactive_user_ids);
  DELETE FROM public."AgentDiscussionMessage" WHERE "userId" = ANY(inactive_user_ids);
  DELETE FROM public."DiscussionParticipant" WHERE "userId" = ANY(inactive_user_ids);
  DELETE FROM public."ElevationRequest" WHERE "userId" = ANY(inactive_user_ids);
  DELETE FROM public."AgentTask" WHERE "agentId" = ANY(inactive_user_ids) OR "adminId" = ANY(inactive_user_ids);

  -- Delete users
  DELETE FROM public."User" WHERE id = ANY(inactive_user_ids);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'deleted_users', deleted_users
  );
END;
$$;

-- Schedule the function to run daily at 3:00 AM UTC
SELECT cron.schedule(
  'cleanup-inactive-users-daily',
  '0 3 * * *', -- 3:00 AM UTC daily
  'SELECT cleanup_inactive_users(30);'
);

-- Optional: Also schedule a weekly preview report at 2:00 AM UTC on Mondays
-- SELECT cron.schedule(
--   'cleanup-inactive-users-preview-weekly',
--   '0 2 * * 1', -- 2:00 AM UTC every Monday
--   'SELECT cleanup_inactive_users(30);' -- Same function, but you could create a preview variant
-- );

COMMIT;

-- To unschedule later:
-- SELECT cron.unschedule('cleanup-inactive-users-daily');
-- SELECT cron.unschedule('cleanup-inactive-users-preview-weekly');