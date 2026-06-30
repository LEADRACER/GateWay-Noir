-- ============================================================================
-- Noir:GateWay — Complete Database Schema
-- ============================================================================
-- This is the canonical schema definition matching the current database
-- structure and the TypeScript types in src/lib/types/database.ts.
-- Auto-generated from Supabase OpenAPI spec + code audit.
-- ============================================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- User
-- Core identity. Every participant has a unique badge code and role.
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."User" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "badgeCode" TEXT NOT NULL UNIQUE,
  "displayName" TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'DETECTIVE'
    CHECK (role IN ('DETECTIVE', 'AGENT', 'BUREAU', 'ADMIN')),
  "telegramId" TEXT UNIQUE,
  "discordId" TEXT UNIQUE,
  "whatsappId" TEXT UNIQUE,
  "linkedIds" JSONB DEFAULT '[]'::jsonb,
  phone TEXT,
  handler TEXT,
  "passwordHash" TEXT,
  "isAdmin" BOOLEAN NOT NULL DEFAULT false,
  bio TEXT,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  "lastSeenAt" TIMESTAMP WITHOUT TIME ZONE,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- Topic
-- Investigation topics posted by detectives and agents.
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."Topic" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  "imageUrl" TEXT,
  evidence TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'CONCLUDED', 'ARCHIVED')),
  "durationDays" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  "endsAt" TIMESTAMP WITHOUT TIME ZONE,
  verdict TEXT,
  summary TEXT,
  "createdBy" TEXT REFERENCES "public"."User"(id) ON DELETE SET NULL,
  "categoryId" TEXT REFERENCES "public"."Category"(id) ON DELETE SET NULL,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- Comment
-- Discussion thread on a topic. Supports anonymous and verified comments.
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."Comment" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "topicId" TEXT REFERENCES "public"."Topic"(id) ON DELETE CASCADE,
  "anonymousId" TEXT NOT NULL,
  "userId" TEXT REFERENCES "public"."User"(id) ON DELETE SET NULL,
  "displayName" TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  "evidenceUrls" TEXT[] DEFAULT NULL,
  "isFlagged" BOOLEAN NOT NULL DEFAULT false,
  "parentId" TEXT REFERENCES "public"."Comment"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- Vote
-- Verdict votes on topics. Anonymous before badge claim, linked after.
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."Vote" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "topicId" TEXT REFERENCES "public"."Topic"(id) ON DELETE CASCADE,
  "anonymousId" TEXT NOT NULL,
  "userId" TEXT REFERENCES "public"."User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE("topicId", "anonymousId")
);

-- ============================================================================
-- Category
-- Topic categories for organization and filtering.
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."Category" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'scale',
  color TEXT NOT NULL DEFAULT '#d97706',
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- ElevationRequest
-- User requests to be promoted to a higher role (DET → AGT → BRU).
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."ElevationRequest" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT REFERENCES "public"."User"(id) ON DELETE CASCADE,
  "adminId" TEXT REFERENCES "public"."User"(id) ON DELETE SET NULL,
  "requestedRole" TEXT NOT NULL DEFAULT 'AGENT',
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  message TEXT,
  "adminNote" TEXT,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- AgentTask
-- Tasks assigned to agents by bureau admins.
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."AgentTask" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "agentId" TEXT REFERENCES "public"."User"(id) ON DELETE SET NULL,
  "adminId" TEXT REFERENCES "public"."User"(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  "completedAt" TIMESTAMP WITHOUT TIME ZONE,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- AgentDiscussion
-- Discussion threads in the Bureau (agent-only conversations).
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."AgentDiscussion" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT REFERENCES "public"."User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- AgentDiscussionMessage
-- Messages within agent discussion threads.
-- ============================================================================
CREATE TABLE IF NOT EXISTS "public"."AgentDiscussionMessage" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "discussionId" TEXT REFERENCES "public"."AgentDiscussion"(id) ON DELETE CASCADE,
  "userId" TEXT REFERENCES "public"."User"(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- User
CREATE INDEX IF NOT EXISTS idx_user_badge_code ON "public"."User"("badgeCode");
CREATE INDEX IF NOT EXISTS idx_user_role ON "public"."User"(role);

-- Topic
CREATE INDEX IF NOT EXISTS idx_topic_slug ON "public"."Topic"(slug);
CREATE INDEX IF NOT EXISTS idx_topic_status ON "public"."Topic"(status);
CREATE INDEX IF NOT EXISTS idx_topic_category ON "public"."Topic"("categoryId");
CREATE INDEX IF NOT EXISTS idx_topic_created_by ON "public"."Topic"("createdBy");

-- Comment
CREATE INDEX IF NOT EXISTS idx_comment_topic ON "public"."Comment"("topicId");
CREATE INDEX IF NOT EXISTS idx_comment_anonymous ON "public"."Comment"("anonymousId");

-- Vote
CREATE INDEX IF NOT EXISTS idx_vote_topic ON "public"."Vote"("topicId");
CREATE INDEX IF NOT EXISTS idx_vote_anonymous ON "public"."Vote"("anonymousId");

-- ElevationRequest
CREATE INDEX IF NOT EXISTS idx_elevation_user ON "public"."ElevationRequest"("userId");
CREATE INDEX IF NOT EXISTS idx_elevation_status ON "public"."ElevationRequest"(status);

-- AgentTask
CREATE INDEX IF NOT EXISTS idx_agent_task_agent ON "public"."AgentTask"("agentId");
CREATE INDEX IF NOT EXISTS idx_agent_task_status ON "public"."AgentTask"(status);

-- AgentDiscussion
CREATE INDEX IF NOT EXISTS idx_discussion_created_by ON "public"."AgentDiscussion"("createdById");

-- AgentDiscussionMessage
CREATE INDEX IF NOT EXISTS idx_discussion_message_discussion ON "public"."AgentDiscussionMessage"("discussionId");

-- ============================================================================
-- Row-Level Security (Optional — disabled by default for simplicity)
-- Enable per-table with: ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
-- Then create policies as needed for anon vs authenticated access.
-- ============================================================================

-- Grant permissions (run separately if needed)
-- GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
