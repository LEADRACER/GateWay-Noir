-- SEAL & SUMMARIZE: when a discussion is REOPENED, the old comments are wiped
-- and converted into a short read-only summary stored on the discussion row.
-- Original comments become unreadable; only the summary remains retrievable.
--
-- Apply with:
--   supabase link --project-ref bovsdzvkhtcilsvkayec && supabase db push
-- or paste into the Supabase SQL editor (Dashboard → SQL Editor).

ALTER TABLE public."AgentDiscussion" ADD COLUMN IF NOT EXISTS summary TEXT;
