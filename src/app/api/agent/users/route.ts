import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "AGENT" && user.role !== "BUREAU" && user.role !== "DETECTIVE")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: agents } = await supabase
    .from('User')
    .select("id, badgeCode, displayName, role")
    .in("role", ["AGENT", "BUREAU", "DETECTIVE"])
    .order("badgeCode", { ascending: true });

  return NextResponse.json({ agents: agents || [] });
}