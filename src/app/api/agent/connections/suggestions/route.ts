import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

const DISCUSSION_ROLES = new Set(["DETECTIVE", "AGENT", "BUREAU"]);

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "AGENT" && user.role !== "BUREAU")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

  const supabase = await createServerSupabaseClient();

  const { data: myConnections } = await supabase
    .from("UserConnection")
    .select("connectedUserId")
    .eq("userId", user.id);

  const connectedIds = new Set((myConnections || []).map(c => c.connectedUserId));
  connectedIds.add(user.id);

  const { data: mutualData } = await supabase
    .from("UserConnection")
    .select("connectedUserId, userId")
    .in("userId", [...connectedIds].filter(id => id !== user.id));

  const mutualCounts = new Map<string, number>();
  for (const row of mutualData || []) {
    if (!connectedIds.has(row.connectedUserId)) {
      mutualCounts.set(row.connectedUserId, (mutualCounts.get(row.connectedUserId) || 0) + 1);
    }
  }

  const candidateIds = [...mutualCounts.keys()];
  if (candidateIds.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const { data: candidates } = await supabase
    .from("User")
    .select("id, badgeCode, displayName, role, connectionPrivacy")
    .in("id", candidateIds)
    .in("role", ["AGENT", "BUREAU"])
    .neq("connectionPrivacy", "closed");

  const suggestions = (candidates || [])
    .filter(c => c.connectionPrivacy !== "mutual_only" || (mutualCounts.get(c.id) || 0) > 0)
    .sort((a, b) => (mutualCounts.get(b.id) || 0) - (mutualCounts.get(a.id) || 0))
    .slice(0, limit)
    .map(c => ({
      id: c.id,
      badgeCode: c.badgeCode,
      displayName: c.displayName,
      role: c.role,
      mutualConnections: mutualCounts.get(c.id) || 0,
    }));

  return NextResponse.json({ suggestions });
}