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

  // SECURITY: agents may only read their own tasks (BUREAU reads all).
  const caller = await getCurrentUser();
  if (!caller) return [];
  if (caller.role !== "BUREAU" && caller.id !== agentId) return [];

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
  // SECURITY: BUREAU-only listing.
  const caller = await getCurrentUser();
  if (!caller || caller.role !== "BUREAU") return [];

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

  // SECURITY: the assigned agent or BUREAU may update a task — nobody else.
  const caller = await getCurrentUser();
  if (!caller) return { error: "Unauthorized" };

  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from('AgentTask')
    .select("agentId")
    .eq("id", taskId)
    .maybeSingle();

  if (!existing) return { error: "Task not found" };
  if (caller.role !== "BUREAU" && existing.agentId !== caller.id) {
    return { error: "Unauthorized — you can only update your own tasks" };
  }

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

export async function addTaskEvidence(
  taskId: string,
  dayNumber: number,
  content: string,
  evidenceUrls: string[] = []
) {
  if (!taskId || !content?.trim()) return { error: "Missing required fields" };
  if (dayNumber < 1) return { error: "Day number must be >= 1" };

  const caller = await getCurrentUser();
  if (!caller) return { error: "Unauthorized" };

  const supabase = await createServerSupabaseClient();

  // Verify task exists and caller is the assigned agent
  const { data: task } = await supabase
    .from('AgentTask')
    .select("agentId")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) return { error: "Task not found" };
  if (task.agentId !== caller.id) {
    return { error: "Unauthorized — only the assigned agent can add evidence" };
  }

  // Check if evidence for this day already exists
  const { data: existing } = await supabase
    .from('AgentTaskEvidence')
    .select("id")
    .eq("taskId", taskId)
    .eq("agentId", caller.id)
    .eq("dayNumber", dayNumber)
    .maybeSingle();

  if (existing) {
    // Update existing
    const { data: updated, error } = await supabase
      .from('AgentTaskEvidence')
      .update({
        content: content.trim(),
        evidenceUrls,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return { error: error.message };
    revalidatePath("/agent/tasks");
    revalidatePath("/admin/tasks");
    return { success: true, evidence: updated };
  }

  // Insert new
  const { data: evidence, error } = await supabase
    .from('AgentTaskEvidence')
    .insert({
      taskId,
      agentId: caller.id,
      dayNumber,
      content: content.trim(),
      evidenceUrls,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/agent/tasks");
  revalidatePath("/admin/tasks");
  return { success: true, evidence };
}

export async function getTaskEvidence(taskId: string) {
  if (!taskId) return [];

  const caller = await getCurrentUser();
  if (!caller) return [];

  const supabase = await createServerSupabaseClient();

  // Verify access - agent can see own, bureau can see all
  const { data: task } = await supabase
    .from('AgentTask')
    .select("agentId")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) return [];
  if (caller.role !== "BUREAU" && task.agentId !== caller.id) {
    return [];
  }

  const { data } = await supabase
    .from('AgentTaskEvidence')
    .select("*")
    .eq("taskId", taskId)
    .order("dayNumber", { ascending: true });

  return data || [];
}
