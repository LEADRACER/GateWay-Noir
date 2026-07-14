-- Migration: WhatsApp notification queue columns
-- Run this in Supabase Dashboard SQL Editor (or via psql if allowlisted)
-- Adds tracking columns for the WhatsApp announcer cron

BEGIN;

-- Topic: track whether a concluded topic has been announced via WhatsApp
ALTER TABLE "public"."Topic"
  ADD COLUMN IF NOT EXISTS "announced" BOOLEAN NOT NULL DEFAULT false;

-- ElevationRequest: track whether WhatsApp notification has been sent
ALTER TABLE "public"."ElevationRequest"
  ADD COLUMN IF NOT EXISTS "notified" BOOLEAN NOT NULL DEFAULT false;

-- AgentTask: track whether WhatsApp notification has been sent
-- Two separate columns: one for assignment, one for completion
ALTER TABLE "public"."AgentTask"
  ADD COLUMN IF NOT EXISTS "notified_assigned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "notified_completed" BOOLEAN NOT NULL DEFAULT false;

-- Drop old single 'notified' column if it exists (from previous migration)
-- ALTER TABLE "public"."AgentTask" DROP COLUMN IF EXISTS "notified";

COMMIT;