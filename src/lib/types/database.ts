// ─── Noir:GateWay Database Types ───
// Auto-generated from database schema (Supabase OpenAPI spec + code audit).
// Matches the actual database structure, NOT the outdated schema.sql.

export interface User {
  id: string;
  badgeCode: string;
  displayName: string;
  role: "DETECTIVE" | "AGENT" | "BUREAU";
  telegramId: string | null;
  discordId: string | null;
  whatsappId: string | null;
  linkedIds: string[];
  phone: string | null;
  handler: string | null;
  passwordHash: string | null;
  isAdmin: boolean;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  updatedAt: string;
  connectionPrivacy: "open" | "mutual_only" | "closed";
}

export interface AgentDiscussion {
  id: string;
  title: string;
  description: string | null;
  isOpen: boolean;
  visibility: "bru_only" | "bru_agt" | "bru_agt_det" | "all";
  spectatorVisibility: "participants_only" | "all";
  summary: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentDiscussionMessage {
  id: string;
  discussionId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface DiscussionParticipant {
  id: string;
  discussionId: string;
  userId: string;
  invitedBy: string | null;
  joinedAt: string;
}

export interface UserConnection {
  id: string;
  userId: string;
  connectedUserId: string;
  createdAt: string;
  status: "pending" | "accepted" | "rejected";
  metadata: Record<string, unknown>;
}

export interface Topic {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  evidence: string | null;
  status: "ACTIVE" | "CONCLUDED" | "ARCHIVED" | "UPCOMING";
  durationDays: number;
  createdAt: string;
  endsAt: string | null;
  verdict: "SOLVED" | "CONFIRMED" | "UNSOLVED" | "BUSTED" | "TRUE" | "INCONCLUSIVE" | null;
  summary: string | null;
  createdBy: string | null;
  categoryId: string | null;
  updatedAt: string;
  announced: boolean;
}

export interface Comment {
  id: string;
  topicId: string;
  anonymousId: string;
  userId: string | null;
  displayName: string;
  content: string;  // NOTE: DB column is "content", not "body"
  evidenceUrls: string[] | null;
  isFlagged: boolean;
  parentId: string | null;
  createdAt: string;
}

export interface Vote {
  id: string;
  topicId: string;
  anonymousId: string;
  userId: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  createdAt: string;
}

export interface ElevationRequest {
  id: string;
  userId: string;
  adminId: string | null;
  requestedRole: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  message: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  notified: boolean;
}

export interface AgentTask {
  id: string;
  agentId: string | null;
  adminId: string | null;
  title: string;
  description: string | null;
  status: "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  notified: boolean;
}

export interface AgentTaskEvidence {
  id: string;
  taskId: string;
  agentId: string;
  dayNumber: number;
  content: string;
  evidenceUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// Row helpers for Supabase inserts/updates
export type DbInsert<T> = Omit<T, "id" | "createdAt" | "updatedAt">;
export type DbUpdate<T> = Partial<DbInsert<T>>;

// Joins
export interface TopicWithCategory extends Topic {
  category: Category;
  votes?: { count: number }[];
  comments?: { count: number }[];
}

export interface UserWithStats extends User {
  voteCount?: number;
  commentCount?: number;
  taskCount?: number;
}
