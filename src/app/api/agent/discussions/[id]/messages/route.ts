import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import {
  canDiscussDiscussion,
  canViewDiscussion,
  isDiscussionAudience,
  isSpectatorVisibility,
} from "@/lib/discussion-access";

const DISCUSSION_ROLES = new Set(["DETECTIVE", "AGENT", "BUREAU"]);

async function isParticipant(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  discussionId: string,
) {
  const { data } = await supabase
    .from("DiscussionParticipant")
    .select("id")
    .eq("discussionId", discussionId)
    .eq("userId", userId)
    .maybeSingle();
  return Boolean(data);
}

async function getUserConnections(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("UserConnection")
    .select("connectedUserId")
    .eq("userId", userId)
    .eq("status", "mutual");
  return new Set((data || []).map((c) => c.connectedUserId));
}

function canView(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
  discussion: {
    visibility: unknown;
    spectatorVisibility: unknown;
    createdById: string;
    id: string;
  },
  participant: boolean,
) {
  return canViewDiscussion({
    role: user?.role ?? null,
    audience: isDiscussionAudience(discussion.visibility) ? discussion.visibility : "bru_agt_det",
    _spectatorVisibility: isSpectatorVisibility(discussion.spectatorVisibility)
      ? discussion.spectatorVisibility
      : "participants_only",
    isParticipant: participant,
    isCreator: discussion.createdById === user?.id,
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (user && !DISCUSSION_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: discussion, error: discussionError } = await supabase
    .from("AgentDiscussion")
    .select(
      `id, title, description, "isOpen", visibility, "spectatorVisibility", summary, "createdById", "updatedAt", "createdAt"`,
    )
    .eq("id", id)
    .maybeSingle();

  if (discussionError || !discussion) {
    return NextResponse.json(
      { error: discussionError ? "Failed to load discussion" : "Discussion not found" },
      { status: discussionError ? 500 : 404 },
    );
  }

  const participant = user ? await isParticipant(supabase, user.id, id) : false;
  if (!canView(user, discussion, participant)) {
    return NextResponse.json({ error: "Not authorized to view this discussion" }, { status: 403 });
  }

  const connectedUserIds = user ? await getUserConnections(supabase, user.id) : new Set();

  const { data: messages, error: messagesError } = await supabase
    .from("AgentDiscussionMessage")
    .select("*, user:User(badgeCode, displayName, role)")
    .eq("discussionId", id)
    .order("createdAt", { ascending: true });

  if (messagesError) {
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }

  const enrichedMessages = (messages || []).map((msg) => {
    const msgUser = Array.isArray(msg.user) ? msg.user[0] : msg.user;
    const isConnected = msgUser && connectedUserIds.has(msgUser.id);
    return {
      ...msg,
      user: msgUser
        ? {
            badgeCode: msgUser.badgeCode,
            displayName: isConnected ? msgUser.displayName : msgUser.badgeCode,
            role: msgUser.role,
            isConnected,
          }
        : { badgeCode: "?", displayName: "Unknown", role: "UNKNOWN", isConnected: false },
    };
  });

  return NextResponse.json({
    discussion,
    messages: enrichedMessages,
    canDiscuss: user
      ? canDiscussDiscussion({
          role: user.role,
          audience: isDiscussionAudience(discussion.visibility)
            ? discussion.visibility
            : "bru_agt_det",
          isParticipant: participant,
          isCreator: discussion.createdById === user.id,
        })
      : false,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !DISCUSSION_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: discussion, error: discussionError } = await supabase
    .from("AgentDiscussion")
    .select(`id, "isOpen", visibility, "spectatorVisibility", "createdById"`)
    .eq("id", id)
    .maybeSingle();

  if (discussionError || !discussion) {
    return NextResponse.json(
      { error: discussionError ? "Failed to load discussion" : "Discussion not found" },
      { status: discussionError ? 500 : 404 },
    );
  }

  const participant = await isParticipant(supabase, user.id, id);
  if (
    !canDiscussDiscussion({
      role: user.role,
      audience: isDiscussionAudience(discussion.visibility)
        ? discussion.visibility
        : "bru_agt_det",
      isParticipant: participant,
      isCreator: discussion.createdById === user.id,
    })
  ) {
    return NextResponse.json({ error: "Not authorized to post in this discussion" }, { status: 403 });
  }

  if (!discussion.isOpen) {
    return NextResponse.json({ error: "Discussion is closed" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const requestBody = body as Record<string, unknown>;
  const rawContent = requestBody.content;
  const content = typeof rawContent === "string" ? rawContent.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (content.length > 5000) {
    return NextResponse.json({ error: "Message too long (max 5000 chars)" }, { status: 400 });
  }

  const { data: message, error: insertError } = await supabase
    .from("AgentDiscussionMessage")
    .insert({
      discussionId: id,
      content,
      userId: user.id,
    })
    .select("*, user:User(badgeCode, displayName, role)")
    .single();

  if (insertError || !message) {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  await supabase
    .from("AgentDiscussion")
    .update({ updatedAt: new Date().toISOString() })
    .eq("id", id);

  const connectedUserIds = await getUserConnections(supabase, user.id);
  const msgUser = Array.isArray(message.user) ? message.user[0] : message.user;
  const isConnected = msgUser && connectedUserIds.has(msgUser.id);
  const enrichedMessage = {
    ...message,
    user: msgUser
      ? {
          badgeCode: msgUser.badgeCode,
          displayName: isConnected ? msgUser.displayName : msgUser.badgeCode,
          role: msgUser.role,
          isConnected,
        }
      : { badgeCode: "?", displayName: "Unknown", role: "UNKNOWN", isConnected: false },
  };

  return NextResponse.json({ message: enrichedMessage }, { status: 201 });
}
