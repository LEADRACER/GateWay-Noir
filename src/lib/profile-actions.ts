"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function updateAgentProfile(userId: string, data: { displayName?: string; bio?: string; phone?: string }) {
  const supabase = await createServerSupabaseClient();

  const { data: user } = await supabase
    .from('User')
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!user) return { error: "User not found" };
  if (user.role === "DETECTIVE") return { error: "Only AGENT+ users have profiles" };

  const updateData: any = {};
  if (data.displayName !== undefined) updateData.displayName = data.displayName.trim();
  if (data.bio !== undefined) updateData.bio = data.bio.trim();
  if (data.phone !== undefined) updateData.phone = data.phone.trim();

  const { data: updated, error } = await supabase
    .from('User')
    .update(updateData)
    .eq("id", userId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, user: updated };
}

export async function getAgentProfile(userId: string) {
  if (!userId) return null;

  const supabase = await createServerSupabaseClient();

  const { data: user } = await supabase
    .from('User')
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!user) return null;

  // Get handler info if exists
  let handlerInfo = null;
  if (user.handler) {
    const { data: handler } = await supabase
      .from('User')
      .select("badgeCode, displayName, id")
      .eq("id", user.handler)
      .maybeSingle();
    if (handler) handlerInfo = handler;
  }

  // Get vote and comment counts
  const [{ count: voteCount }, { count: commentCount }] = await Promise.all([
    supabase.from('Vote').select("*", { count: "exact", head: true }).eq("userId", userId),
    supabase.from('Comment').select("*", { count: "exact", head: true }).eq("userId", userId),
  ]);

  // Get task counts
  const { data: tasks } = await supabase
    .from('AgentTask')
    .select("status")
    .eq("agentId", userId);

  const taskStatusCounts: Record<string, number> = {};
  for (const t of tasks || []) {
    taskStatusCounts[t.status] = (taskStatusCounts[t.status] || 0) + 1;
  }

  return {
    ...user,
    handlerInfo,
    voteCount: voteCount ?? 0,
    commentCount: commentCount ?? 0,
    taskCounts: taskStatusCounts,
  };
}
