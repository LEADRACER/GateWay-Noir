"use server";

import bcrypt from "bcryptjs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { reprefixBadgeCode } from "@/lib/badge";

// ─── Agent Management ───

export async function createAgentUser(data: {
  displayName: string;
  role: string;
  badgeCode: string;
}) {
  // SECURITY: creating ANY account (AGT/BUREAU/DET) is BUREAU-only.
  // Previously, anyone could mint AGENT accounts via this action.
  const caller = await getCurrentUser();
  if (!caller || caller.role !== "BUREAU") {
    throw new Error("Unauthorized — only BUREAU users can create accounts");
  }

  const supabase = await createServerSupabaseClient();

  // SECURITY: start the account with a random temporary passcode instead of no
  // password. An unclaimed badge with a NULL passwordHash used to let anyone
  // who guessed the 4-char code claim it (account takeover). The temp passcode
  // is returned once so the admin can hand it over.
  const temporaryPassword = String(Math.floor(10000000 + Math.random() * 90000000));
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const { data: user } = await supabase
    .from('User')
    .insert({
      badgeCode: data.badgeCode,
      displayName: data.displayName?.trim() || data.badgeCode,
      role: data.role || "AGENT",
      isAdmin: false,
      linkedIds: [],
      passwordHash,
    })
    .select()
    .single();

  if (!user) throw new Error("Failed to create user");
  return { ...user, temporaryPassword };
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
  // SECURITY: BUREAU-only listing.
  const caller = await getCurrentUser();
  if (!caller || caller.role !== "BUREAU") return [];

  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('User')
    .select("*")
    .eq("role", role)
    .order("createdAt", { ascending: false });

  return data || [];
}

export async function getAllUsers() {
  // SECURITY: BUREAU-only listing.
  const caller = await getCurrentUser();
  if (!caller || caller.role !== "BUREAU") return [];

  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('User')
    .select("*")
    .order("createdAt", { ascending: false });

  return data || [];
}

// ─── Badge Setup (first admin) ───

export async function setupBureauAdmin(code: string, passwordHash?: string, adminId?: string) {
  const supabase = await createServerSupabaseClient();

  // Check if any BUREAU exists
  const { data: existingBureau } = await supabase
    .from('User')
    .select("id")
    .eq("role", "BUREAU")
    .maybeSingle();

  // If BUREAU already exists, require the caller to be a BUREAU
  if (existingBureau) {
    if (!adminId) {
      return { error: "Admin ID required — setup is locked after first admin" };
    }
    const { data: admin } = await supabase
      .from('User')
      .select("role")
      .eq("id", adminId)
      .maybeSingle();

    if (!admin || admin.role !== "BUREAU") {
      return { error: "Not authorized" };
    }
  }

  if (!code?.trim()) {
    return { error: "Badge code is required" };
  }

  const codeUpper = code.toUpperCase().trim();
  const { data: user } = await supabase
    .from('User')
    .select("*")
    .eq("badgeCode", codeUpper)
    .maybeSingle();

  if (!user) return { error: "Badge code not found. Create a badge first." };

  // If target is already BUREAU, return success
  if (user.role === "BUREAU") {
    return { success: true, newBadgeCode: user.badgeCode, displayName: user.displayName };
  }

  // Only AGENT users can be promoted to BUREAU via this path
  if (user.role !== "AGENT") {
    return { error: "Only AGENT users can be promoted to BUREAU" };
  }

  const newBadgeCode = reprefixBadgeCode(codeUpper, "BUREAU");
  const { data: existing } = await supabase
    .from('User')
    .select("id")
    .eq("badgeCode", newBadgeCode)
    .maybeSingle();

  if (existing && existing.id !== user.id) {
    return { error: "Badge code collision — try with a new DET badge" };
  }

  const updateData: any = {
    role: "BUREAU",
    badgeCode: newBadgeCode,
    isAdmin: true,
  };
  if (passwordHash) updateData.passwordHash = passwordHash;

  await supabase
    .from('User')
    .update(updateData)
    .eq("id", user.id);

  return { success: true, newBadgeCode, displayName: user.displayName };
}

// ─── Backward-compatible aliases (old signatures) ───

export async function getAllAgents() {
  return getUsersByRole("AGENT");
}

export async function promoteToBureau(agentId: string, adminBadgeCode: string, adminUserId: string) {
  if (!adminBadgeCode || !adminUserId) return { error: "Admin badge code and user ID required" };
  return promoteAgentToBureau(agentId, adminBadgeCode, adminUserId);
}

export async function demoteAgent(agentUserId: string) {
  const caller = await getCurrentUser();
  if (!caller || caller.role !== "BUREAU") {
    return { error: "Unauthorized — only BUREAU users can demote agents" };
  }

  const supabase = await createServerSupabaseClient();

  const { data: user } = await supabase
    .from('User')
    .select("*")
    .eq("id", agentUserId)
    .maybeSingle();

  if (!user) return { error: "User not found" };
  if (user.role === "DETECTIVE") return { error: "DETECTIVE users cannot be demoted further" };

  let targetRole: "DETECTIVE" | "AGENT";
  if (user.role === "BUREAU") {
    targetRole = "AGENT";
  } else {
    targetRole = "DETECTIVE";
  }

  const newBadgeCode = reprefixBadgeCode(user.badgeCode, targetRole);

  const updateData: any = {
    role: targetRole,
    badgeCode: newBadgeCode,
    isAdmin: false,
  };
  // Clear handler only when demoting to DETECTIVE
  if (targetRole === "DETECTIVE") updateData.handler = null;

  await supabase
    .from('User')
    .update(updateData)
    .eq("id", agentUserId);

  return { success: true, newBadgeCode, newRole: targetRole };
}

export async function createBureauUser(displayName: string, adminBadgeCode: string) {
  const caller = await getCurrentUser();
  if (!caller || caller.role !== "BUREAU") {
    throw new Error("Unauthorized — only BUREAU users can create Bureau users");
  }
  if (!adminBadgeCode) throw new Error("Admin badge code is required to create a Bureau user");

  const supabase = await createServerSupabaseClient();
  const { generateBadgeCode } = await import("@/lib/badge");
  const newBadgeCode = await generateBadgeCode("BUREAU");

  return createAgentUser({
    displayName,
    role: "BUREAU",
    badgeCode: newBadgeCode,
  });
}
