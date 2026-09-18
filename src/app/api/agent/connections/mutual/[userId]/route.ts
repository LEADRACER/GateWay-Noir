import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

const CONNECTION_ROLES = new Set(["AGENT", "BUREAU"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const user = await getCurrentUser();
  if (!user || !CONNECTION_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (userId === user.id) {
    return NextResponse.json({ error: "Cannot check mutual with yourself" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const [{ data: myConnections }, { data: theirConnections }] = await Promise.all([
    supabase
      .from("UserConnection")
      .select("connectedUserId")
      .eq("userId", user.id)
      .eq("status", "mutual"),
    supabase
      .from("UserConnection")
      .select("connectedUserId")
      .eq("userId", userId)
      .eq("status", "mutual"),
  ]);

  const myIds = new Set((myConnections || []).map(c => c.connectedUserId));
  const theirIds = new Set((theirConnections || []).map(c => c.connectedUserId));

  const mutualIds = [...myIds].filter(id => theirIds.has(id));

  if (mutualIds.length === 0) {
    return NextResponse.json({ mutual: [], count: 0 });
  }

  const { data: mutualUsers } = await supabase
    .from("User")
    .select("id, badgeCode, displayName, role")
    .in("id", mutualIds);

  return NextResponse.json({
    mutual: mutualUsers || [],
    count: mutualIds.length,
  });
}
