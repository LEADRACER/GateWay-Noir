"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateBadgeCode } from "@/lib/badge";
import { getCurrentUser } from "@/lib/get-current-user";

export async function requestElevation(userId: string, message?: string) {
  if (!userId) return { error: "Missing user ID" };

  const supabase = await createServerSupabaseClient();

  // Check if user already has a pending request
  const { data: existing } = await supabase
    .from('ElevationRequest')
    .select("id")
    .eq("userId", userId)
    .eq("status", "PENDING")
    .maybeSingle();

  if (existing) return { error: "You already have a pending elevation request" };

  // Check user role
  const { data: user } = await supabase
    .from('User')
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!user) return { error: "User not found" };
  if (user.role !== "DETECTIVE") return { error: "Only DETECTIVE users can request elevation" };
  if (!user.passwordHash) return { error: "Set a passcode before requesting elevation" };

  const { data: request, error } = await supabase
    .from('ElevationRequest')
    .insert({ userId, message: message?.trim() || null, status: "PENDING", requestedRole: "AGENT" })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, request };
}

export async function getPendingElevations() {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('ElevationRequest')
    .select('*, User(badgeCode, displayName, createdAt)')
    .eq("status", "PENDING")
    .order("createdAt", { ascending: false });

  // Supabase join returns nested objects — adapt as needed
  return data || [];
}

export async function getApprovedElevations() {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('ElevationRequest')
    .select('*, User(badgeCode, displayName, createdAt)')
    .eq("status", "APPROVED")
    .order("updatedAt", { ascending: false })
    .limit(10);

  return data || [];
}

export async function getRejectedElevations() {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('ElevationRequest')
    .select('*, User(badgeCode, displayName, createdAt)')
    .eq("status", "REJECTED")
    .order("updatedAt", { ascending: false })
    .limit(10);

  return data || [];
}

export async function getMyElevationStatus(userId: string) {
  if (!userId) return null;

  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('ElevationRequest')
    .select("*")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(1);

  return data?.[0] || null;
}

export async function approveElevation(requestId: string, adminId: string) {
  const caller = await getCurrentUser();
  if (!caller || caller.role !== "BUREAU") return { error: "Unauthorized" };
  if (!requestId) return { error: "Missing request ID" };

  const supabase = await createServerSupabaseClient();

  const { data: request } = await supabase
    .from('ElevationRequest')
    .select('*, User(*)')
    .eq("id", requestId)
    .maybeSingle();

  if (!request) return { error: "Request not found" };
  if (request.status !== "PENDING") return { error: "Request already processed" };

  const user = request.User as any;
  const newBadgeCode = await generateBadgeCode("AGENT", user.badgeCode);

  // Update user role and badge code
  await supabase
    .from('User')
    .update({ role: "AGENT", badgeCode: newBadgeCode, handler: adminId })
    .eq("id", request.userId);

  // Mark request as approved
  await supabase
    .from('ElevationRequest')
    .update({ status: "APPROVED", adminId })
    .eq("id", requestId);

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, newBadgeCode };
}

export async function rejectElevation(requestId: string, adminNote?: string) {
  const caller = await getCurrentUser();
  if (!caller || caller.role !== "BUREAU") return { error: "Unauthorized" };
  if (!requestId) return { error: "Missing request ID" };

  const supabase = await createServerSupabaseClient();

  const { data: request } = await supabase
    .from('ElevationRequest')
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) return { error: "Request not found" };
  if (request.status !== "PENDING") return { error: "Request already processed" };

  await supabase
    .from('ElevationRequest')
    .update({ status: "REJECTED", adminNote: adminNote?.trim() || null })
    .eq("id", requestId);

  revalidatePath("/admin");
  return { success: true };
}
