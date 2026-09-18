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

  const { data: sentFollows, error: sentError } = await supabase
    .from("UserConnection")
    .select(`
      id,
      connectedUserId,
      createdAt,
      status,
      connectedUser:User!UserConnection_connectedUserId_fkey(id, badgeCode, displayName, role)
    `)
    .eq("userId", user.id)
    .eq("status", "following")
    .order("createdAt", { ascending: false });

  if (sentError) {
    return NextResponse.json({ error: "Failed to load sent follows" }, { status: 500 });
  }

  const { data: receivedFollows, error: receivedError } = await supabase
    .from("UserConnection")
    .select(`
      id,
      userId,
      connectedUserId,
      createdAt,
      status,
      user:User!UserConnection_userId_fkey(id, badgeCode, displayName, role)
    `)
    .eq("connectedUserId", user.id)
    .eq("status", "following")
    .order("createdAt", { ascending: false });

  if (receivedError) {
    return NextResponse.json({ error: "Failed to load received follows" }, { status: 500 });
  }

  const sent = (sentFollows || []).map((row) => {
    const connectedUser = Array.isArray(row.connectedUser) ? row.connectedUser[0] : row.connectedUser;
    return {
      id: row.id,
      connectedUserId: row.connectedUserId,
      createdAt: row.createdAt,
      status: row.status,
      connectedUser: connectedUser ?? { id: row.connectedUserId, badgeCode: "?", displayName: "Unknown", role: "AGENT" as const },
    };
  });

  const received = (receivedFollows || []).map((row) => {
    const userField = Array.isArray(row.user) ? row.user[0] : row.user;
    return {
      id: row.id,
      userId: row.userId,
      connectedUserId: row.connectedUserId,
      createdAt: row.createdAt,
      status: row.status,
      connectedUser: userField ?? { id: row.userId, badgeCode: "?", displayName: "Unknown", role: "AGENT" as const },
    };
  });

  return NextResponse.json({
    sent,
    received,
  });
}
