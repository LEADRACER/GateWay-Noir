BEGIN;

ALTER TABLE public."AgentDiscussion"
  ADD COLUMN IF NOT EXISTS visibility TEXT;

ALTER TABLE public."AgentDiscussion"
  ADD COLUMN IF NOT EXISTS "spectatorVisibility" TEXT;

UPDATE public."AgentDiscussion"
SET visibility = CASE visibility
  WHEN 'all' THEN 'all'
  WHEN 'agents' THEN 'bru_agt'
  WHEN 'invited' THEN 'bru_only'
  ELSE visibility
END
WHERE visibility IN ('all', 'agents', 'invited');

UPDATE public."AgentDiscussion"
SET visibility = 'bru_agt_det'
WHERE visibility IS NULL OR visibility NOT IN ('bru_only', 'bru_agt', 'bru_agt_det', 'all');

UPDATE public."AgentDiscussion"
SET "spectatorVisibility" = 'participants_only'
WHERE "spectatorVisibility" IS NULL
   OR "spectatorVisibility" NOT IN ('participants_only', 'all');

ALTER TABLE public."AgentDiscussion"
  ALTER COLUMN visibility SET NOT NULL,
  ALTER COLUMN visibility SET DEFAULT 'bru_agt_det',
  ALTER COLUMN "spectatorVisibility" SET NOT NULL,
  ALTER COLUMN "spectatorVisibility" SET DEFAULT 'participants_only';

ALTER TABLE public."AgentDiscussion"
  DROP CONSTRAINT IF EXISTS "AgentDiscussion_visibility_check";

ALTER TABLE public."AgentDiscussion"
  DROP CONSTRAINT IF EXISTS "AgentDiscussion_spectatorVisibility_check";

ALTER TABLE public."AgentDiscussion"
  ADD CONSTRAINT "AgentDiscussion_visibility_check"
    CHECK (visibility IN ('bru_only', 'bru_agt', 'bru_agt_det', 'all')),
  ADD CONSTRAINT "AgentDiscussion_spectatorVisibility_check"
    CHECK ("spectatorVisibility" IN ('participants_only', 'all'));

COMMIT;
