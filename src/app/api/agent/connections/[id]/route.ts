import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

const DISCUSSION_ROLES = new Set(["DETECTIVE", "AGENT", "BUREAU"]);

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !DISCUSSION_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: connection, error: fetchError } = await supabase
    .from("UserConnection")
    .select("userId, connectedUserId, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  // User can delete/cancel if they are the requester (userId) OR the recipient (connectedUserId)
  // For accepted connections, delete both directions
  // For pending requests, only delete the single row

  if (connection.userId !== user.id && connection.connectedUserId !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (connection.status === "accepted") {
    // Delete both directions for accepted connections
    const { error: deleteError } = await supabase
      .from("UserConnection")
      .delete()
      .or(`and(userId.eq.${user.id},connectedUserId.eq.${connection.connectedUserId}),and(userId.eq.${connection.connectedUserId},connectedUserId.eq.${user.id})`);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete connection" }, { status: 500 });
    }
  } else {
    // For pending/rejected, just delete this row
    const { error: deleteError } = await supabase
      .from("UserConnection")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to cancel request" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}