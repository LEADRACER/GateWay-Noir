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

  const { data: connections, error } = await supabase
    .from("UserConnection")
    .select(`
      id,
      "connectedUserId",
      "createdAt",
      connectedUser:User!UserConnection_connectedUserId_fkey(
        id,
        badgeCode,
        displayName,
        role,
        lastSeenAt
      )
    `)
    .eq("userId", user.id)
    .eq("status", "mutual")
    .order("createdAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load connected users" }, { status: 500 });
  }

  const users = (connections || []).map((connection) => {
    const connectedUser = Array.isArray(connection.connectedUser)
      ? connection.connectedUser[0]
      : connection.connectedUser;

    return {
      id: connectedUser?.id ?? connection.connectedUserId,
      badgeCode: connectedUser?.badgeCode ?? "?",
      displayName: connectedUser?.displayName ?? "Unknown",
      role: connectedUser?.role ?? "UNKNOWN",
      lastSeenAt: connectedUser?.lastSeenAt ?? null,
      connectedAt: connection.createdAt,
    };
  });

  return NextResponse.json({ users });
}
