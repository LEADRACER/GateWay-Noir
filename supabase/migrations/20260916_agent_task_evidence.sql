-- Migration: Agent Task Evidence table for daily progress logs
-- Run this in Supabase Dashboard SQL Editor (or via psql if allowlisted)

BEGIN;

-- AgentTaskEvidence: daily evidence entries by agents for their tasks
CREATE TABLE IF NOT EXISTS public."AgentTaskEvidence" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "taskId" TEXT NOT NULL REFERENCES public."AgentTask"(id) ON DELETE CASCADE,
  "agentId" UUID NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "dayNumber" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "evidenceUrls" TEXT[] DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("taskId", "agentId", "dayNumber")
);

-- Enable RLS
ALTER TABLE public."AgentTaskEvidence" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."AgentTaskEvidence" FROM anon;

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_agent_task_evidence_task ON public."AgentTaskEvidence"("taskId");
CREATE INDEX IF NOT EXISTS idx_agent_task_evidence_agent ON public."AgentTaskEvidence"("agentId");

COMMIT;