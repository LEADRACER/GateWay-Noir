import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

interface BureauUser {
  id: string;
  badgeCode: string;
  displayName: string;
  avatarUrl: string | null;
}

interface AgentUser {
  id: string;
  badgeCode: string;
  displayName: string;
  avatarUrl: string | null;
}

interface BureauHall {
  bureaus: BureauUser[];
  agents: AgentUser[];
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !["DETECTIVE", "AGENT", "BUREAU"].includes(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: allUsers, error } = await supabase
    .from("User")
    .select("id, badgeCode, displayName, role, handler, avatarUrl, createdAt")
    .in("role", ["BUREAU", "AGENT"])
    .order("role", { ascending: false })
    .order("createdAt", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load bureau data" }, { status: 500 });
  }

  const bureaus = (allUsers || []).filter((u) => u.role === "BUREAU");
  const agents = (allUsers || []).filter((u) => u.role === "AGENT");

  // Group bureaus into halls of max 3
  const bureauHalls: BureauHall[] = [];
  for (let i = 0; i < bureaus.length; i += 3) {
    const hallBureaus = bureaus.slice(i, i + 3);
    const bureauIds = new Set(hallBureaus.map((b) => b.id));
    const hallAgents = agents.filter((a) => a.handler && bureauIds.has(a.handler));
    
    bureauHalls.push({
      bureaus: hallBureaus.map((b) => ({
        id: b.id,
        badgeCode: b.badgeCode,
        displayName: b.displayName,
        avatarUrl: b.avatarUrl,
      })),
      agents: hallAgents.map((a) => ({
        id: a.id,
        badgeCode: a.badgeCode,
        displayName: a.displayName,
        avatarUrl: a.avatarUrl,
      })),
    });
  }

  // Unassigned agents as a hall with no bureaus
  const unassignedAgents = agents.filter((a) => !a.handler || !bureaus.some((b) => b.id === a.handler));
  if (unassignedAgents.length > 0) {
    bureauHalls.push({
      bureaus: [],
      agents: unassignedAgents.map((a) => ({
        id: a.id,
        badgeCode: a.badgeCode,
        displayName: a.displayName,
        avatarUrl: a.avatarUrl,
      })),
    });
  }

  return NextResponse.json({ halls: bureauHalls });
}