import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "AGENT" && user.role !== "BUREAU" && user.role !== "DETECTIVE")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  try {
    // Get total users by role
    const [{ count: totalUsers }] = await Promise.all([
      supabase.from("User").select("*", { count: "exact", head: true }).in("role", ["DETECTIVE", "AGENT", "BUREAU"]),
    ]);

    // Get online users (lastSeenAt within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const [{ count: onlineUsers }, { count: agentsOnline }, { count: bureauOnline }] = await Promise.all([
      supabase
        .from("User")
        .select("*", { count: "exact", head: true })
        .in("role", ["DETECTIVE", "AGENT", "BUREAU"])
        .gte("lastSeenAt", fiveMinutesAgo),
      supabase
        .from("User")
        .select("*", { count: "exact", head: true })
        .eq("role", "AGENT")
        .gte("lastSeenAt", fiveMinutesAgo),
      supabase
        .from("User")
        .select("*", { count: "exact", head: true })
        .eq("role", "BUREAU")
        .gte("lastSeenAt", fiveMinutesAgo),
    ]);

    // Get recent activity (discussions updated in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentActivity } = await supabase
      .from("AgentDiscussion")
      .select("*", { count: "exact", head: true })
      .gte("updatedAt", oneHourAgo);

    return NextResponse.json({
      totalUsers: totalUsers ?? 0,
      onlineUsers: onlineUsers ?? 0,
      agentsOnline: agentsOnline ?? 0,
      bureauOnline: bureauOnline ?? 0,
      recentActivity: recentActivity ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}