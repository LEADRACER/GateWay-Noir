"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function createTask(agentId: string, adminId: string, title: string, description?: string) {
  if (!agentId || !title?.trim()) return { error: "Missing required fields" };

  const supabase = await createServerSupabaseClient();

  const { data: task, error } = await supabase
    .from('AgentTask')
    .insert({
      agentId,
      adminId,
      title: title.trim(),
      description: description?.trim() || null,
      status: "PENDING",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/tasks");
  revalidatePath("/agent/tasks");
  return { success: true, task };
}

export async function getAgentTasks(agentId: string) {
  if (!agentId) return [];

  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('AgentTask')
    .select("*")
    .eq("agentId", agentId)
    .order("status", { ascending: true })
    .order("createdAt", { ascending: false });

  return data || [];
}

export async function getAllTasks() {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('AgentTask')
    .select('*, "User"!agentId(badgeCode, displayName), "User"!adminId(badgeCode, displayName)')
    .order("status", { ascending: true })
    .order("createdAt", { ascending: false });

  return data || [];
}

export async function updateTaskStatus(taskId: string, status: string) {
  if (!taskId) return { error: "Missing task ID" };
  if (!["PENDING", "IN_PROGRESS", "COMPLETED"].includes(status)) {
    return { error: "Invalid status" };
  }

  const supabase = await createServerSupabaseClient();

  const updateData: any = { status };
  if (status === "COMPLETED") {
    updateData.completedAt = new Date().toISOString();
  }

  const { data: task, error } = await supabase
    .from('AgentTask')
    .update(updateData)
    .eq("id", taskId)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/tasks");
  revalidatePath("/agent/tasks");
  return { success: true, task };
}
