"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

export async function createTask(agentId: string, title: string, description?: string) {
  if (!agentId || !title?.trim()) return { error: "Missing required fields" };

  // Get current admin user from session
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "BUREAU") {
    return { error: "Unauthorized: Only BUREAU admins can assign tasks" };
  }

  const supabase = await createServerSupabaseClient();

  const { data: task, error } = await supabase
    .from('AgentTask')
    .insert({
      agentId,
      adminId: currentUser.id,
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

  const { data, error } = await supabase
    .from('AgentTask')
    .select(`
      *,
      agent:User!agentId(badgeCode, displayName),
      admin:User!adminId(badgeCode, displayName)
    `)
    .order("status", { ascending: true })
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("getAllTasks error:", error);
    return [];
  }

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
