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

  // Get sent requests (pending)
  const { data: sentRequests, error: sentError } = await supabase
    .from("UserConnection")
    .select(`
      id,
      connectedUserId,
      createdAt,
      status,
      metadata,
      connectedUser:User!UserConnection_connectedUserId_fkey(badgeCode, displayName, role)
    `)
    .eq("userId", user.id)
    .eq("status", "pending")
    .order("createdAt", { ascending: false });

  if (sentError) {
    return NextResponse.json({ error: "Failed to load sent requests" }, { status: 500 });
  }

  // Get received requests (pending)
  const { data: receivedRequests, error: receivedError } = await supabase
    .from("UserConnection")
    .select(`
      id,
      userId,
      createdAt,
      status,
      metadata,
      user:User!UserConnection_userId_fkey(badgeCode, displayName, role)
    `)
    .eq("connectedUserId", user.id)
    .eq("status", "pending")
    .order("createdAt", { ascending: false });

  if (receivedError) {
    return NextResponse.json({ error: "Failed to load received requests" }, { status: 500 });
  }

  return NextResponse.json({
    sent: sentRequests || [],
    received: receivedRequests || [],
  });
}