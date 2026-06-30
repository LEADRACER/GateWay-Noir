"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { reprefixBadgeCode } from "@/lib/badge";

// ─── Agent Management ───

export async function createAgentUser(data: {
  displayName: string;
  role: string;
  badgeCode: string;
}) {
  if (data.role === "BUREAU") {
    const caller = await getCurrentUser();
    if (!caller || caller.role !== "BUREAU") {
      throw new Error("Unauthorized — only BUREAU users can create BUREAU users");
    }
  }

  const supabase = await createServerSupabaseClient();

  const { data: user } = await supabase
    .from('User')
    .insert({
      badgeCode: data.badgeCode,
      displayName: data.displayName?.trim() || data.badgeCode,
      role: data.role || "AGENT",
      isAdmin: false,
      linkedIds: [],
    })
    .select()
    .single();

  if (!user) throw new Error("Failed to create user");
  return user;
}

export async function promoteAgentToBureau(agentUserId: string, adminBadgeCode: string, adminUserId: string) {
  const caller = await getCurrentUser();
  if (!caller || caller.role !== "BUREAU") {
    return { error: "Unauthorized — only BUREAU users can promote agents" };
  }

  const supabase = await createServerSupabaseClient();

  const { data: user } = await supabase
    .from('User')
    .select("*")
    .eq("id", agentUserId)
    .maybeSingle();

  if (!user) return { error: "User not found" };
  if (user.role === "BUREAU") return { error: "User is already BUREAU" };

  const newBadgeCode = reprefixBadgeCode(user.badgeCode, "BUREAU");

  // Check for collision
  const { data: existing } = await supabase
    .from('User')
    .select("id")
    .eq("badgeCode", newBadgeCode)
    .maybeSingle();

  if (existing && existing.id !== agentUserId) {
    return { error: "Badge code collision — try again" };
  }

  await supabase
    .from('User')
    .update({
      role: "BUREAU",
      badgeCode: newBadgeCode,
      isAdmin: true,
      handler: caller.id,
    })
    .eq("id", agentUserId);

  return { success: true, newBadgeCode };
}

export async function getUsersByRole(role: string) {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('User')
    .select("*")
    .eq("role", role)
    .order("createdAt", { ascending: false });

  return data || [];
}

export async function getAllUsers() {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('User')
    .select("*")
    .order("createdAt", { ascending: false });

  return data || [];
}

// ─── Badge Setup (first admin) ───

export async function setupBureauAdmin(code: string, passwordHash: string) {
  const supabase = await createServerSupabaseClient();

  // Check if any BUREAU exists
  const { data: existingBureau } = await supabase
    .from('User')
    .select("id")
    .eq("role", "BUREAU")
    .maybeSingle();

  // If BUREAU exists, check if caller is one
  if (existingBureau) {
    const { data: admin } = await supabase
      .from('User')
      .select("*")
      .eq("badgeCode", code)
      .maybeSingle();

    if (!admin || admin.role !== "BUREAU") {
      return { error: "BUREAU already exists. Login with existing BUREAU badge." };
    }
    return { success: true, user: admin };
  }

  // No BUREAU exists — bootstrap
  const codeUpper = code.toUpperCase().trim();
  const { data: user } = await supabase
    .from('User')
    .select("*")
    .eq("badgeCode", codeUpper)
    .maybeSingle();

  if (!user) return { error: "Badge code not found. Create a badge first." };

  const newBadgeCode = reprefixBadgeCode(codeUpper, "BUREAU");
  const { data: existing } = await supabase
    .from('User')
    .select("id")
    .eq("badgeCode", newBadgeCode)
    .maybeSingle();

  if (existing && existing.id !== user.id) {
    return { error: "Badge code collision" };
  }

  await supabase
    .from('User')
    .update({
      role: "BUREAU",
      badgeCode: newBadgeCode,
      isAdmin: true,
      passwordHash,
    })
    .eq("id", user.id);

  return { success: true, newBadgeCode };
}

// ─── Backward-compatible aliases (old signatures) ───

export async function getAllAgents() {
  return getUsersByRole("AGENT");
}

export async function promoteToBureau(agentId: string, adminBadgeCode: string, adminUserId: string) {
  if (!adminBadgeCode || !adminUserId) return { error: "Admin badge code and user ID required" };
  return promoteAgentToBureau(agentId, adminBadgeCode, adminUserId);
}

export async function createBureauUser(displayName: string, adminBadgeCode: string) {
  const caller = await getCurrentUser();
  if (!caller || caller.role !== "BUREAU") {
    throw new Error("Unauthorized — only BUREAU users can create Bureau users");
  }
  if (!adminBadgeCode) throw new Error("Admin badge code is required to create a Bureau user");
  return createAgentUser({
    displayName,
    role: "BUREAU",
    badgeCode: adminBadgeCode,
  });
}
