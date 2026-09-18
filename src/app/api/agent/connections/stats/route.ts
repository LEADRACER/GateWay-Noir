import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

const CONNECTION_ROLES = new Set(["AGENT", "BUREAU"]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !CONNECTION_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  const [{ count: totalConnections }, { count: pendingSent }, { count: pendingReceived }] = await Promise.all([
    supabase
      .from("UserConnection")
      .select("*", { count: "exact", head: true })
      .eq("userId", user.id)
      .eq("status", "accepted"),
    supabase
      .from("UserConnection")
      .select("*", { count: "exact", head: true })
      .eq("userId", user.id)
      .eq("status", "pending"),
    supabase
      .from("UserConnection")
      .select("*", { count: "exact", head: true })
      .eq("connectedUserId", user.id)
      .eq("status", "pending"),
  ]);

  const { data: connections } = await supabase
    .from("UserConnection")
    .select("connectedUserId")
    .eq("userId", user.id)
    .eq("status", "accepted");

  const connectedIds = (connections || []).map((connection) => connection.connectedUserId);
  let mutualConnections = 0;
  if (connectedIds.length) {
    const { count } = await supabase
      .from("UserConnection")
      .select("*", { count: "exact", head: true })
      .in("userId", connectedIds)
      .eq("connectedUserId", user.id)
      .eq("status", "accepted");
    mutualConnections = count || 0;
  }

  const { data: users } = await supabase
    .from("User")
    .select("id, role")
    .in("id", connectedIds);

  const roleBreakdown = (users || []).reduce<Record<string, number>>((acc, connectedUser) => {
    acc[connectedUser.role] = (acc[connectedUser.role] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    totalConnections: totalConnections || 0,
    pendingSent: pendingSent || 0,
    pendingReceived: pendingReceived || 0,
    mutualConnections,
    roleBreakdown,
  });
}