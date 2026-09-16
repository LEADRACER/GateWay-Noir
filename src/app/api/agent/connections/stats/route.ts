import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

const DISCUSSION_ROLES = new Set(["DETECTIVE", "AGENT", "BUREAU"]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !DISCUSSION_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  const [{ count: totalConnections }, { data: myConnections }] = await Promise.all([
    supabase.from("UserConnection").select("*", { count: "exact", head: true }).eq("userId", user.id),
    supabase.from("UserConnection").select("connectedUserId").eq("userId", user.id),
  ]);

  let mutualConnections = 0;
  if (myConnections?.length) {
    const ids = myConnections.map(c => c.connectedUserId);
    const { count } = await supabase
      .from("UserConnection")
      .select("*", { count: "exact", head: true })
      .in("userId", ids)
      .eq("connectedUserId", user.id);
    mutualConnections = count || 0;
  }

  const { data: connections } = await supabase
    .from("UserConnection")
    .select("connectedUser:User!UserConnection_connectedUserId_fkey(role)")
    .eq("userId", user.id);

  const roleBreakdown = (connections || []).reduce((acc, c) => {
    const role = (c.connectedUser as { role?: string }[])?.find(x => x?.role)?.role || "UNKNOWN";
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({
    totalConnections: totalConnections || 0,
    mutualConnections,
    roleBreakdown,
  });
}