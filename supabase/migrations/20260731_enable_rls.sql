-- SECURITY: enable Row Level Security on every table.
-- The app talks to Postgres through the SERVICE ROLE key (see src/lib/supabase/server.ts),
-- which bypasses RLS, so the app keeps working. The public anon key — which previously
-- had full read/write access (proven in DEBUG-2026-07-31.md: User table dump incl.
-- badgeCode/phone/bcrypt passwordHash, plus arbitrary Comment inserts) — is now denied
-- everything: no policies exist, so anon gets zero rows.
--
-- Apply with:
--   supabase link --project-ref bovsdzvkhtcilsvkayec && supabase db push
-- or paste into the Supabase SQL editor (Dashboard → SQL Editor).

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Topic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Vote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ElevationRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgentTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgentDiscussion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgentDiscussionMessage" ENABLE ROW LEVEL SECURITY;

-- Belt and braces: revoke anything the anon role might have been granted.
REVOKE ALL ON public."User" FROM anon;
REVOKE ALL ON public."Topic" FROM anon;
REVOKE ALL ON public."Comment" FROM anon;
REVOKE ALL ON public."Vote" FROM anon;
REVOKE ALL ON public."Category" FROM anon;
REVOKE ALL ON public."ElevationRequest" FROM anon;
REVOKE ALL ON public."AgentTask" FROM anon;
REVOKE ALL ON public."AgentDiscussion" FROM anon;
REVOKE ALL ON public."AgentDiscussionMessage" FROM anon;
