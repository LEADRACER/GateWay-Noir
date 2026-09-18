import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { logAuditWithRequest } from "@/lib/audit";

const CONNECTION_ROLES = new Set(["AGENT", "BUREAU"]);

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !CONNECTION_ROLES.has(user.role)) {
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

  const isRequester = connection.userId === user.id;

  void logAuditWithRequest(
    {
      action: "connection_removed",
      resource: "UserConnection",
      resourceId: id,
      metadata: {
        actorId: user.id,
        isRequester,
        otherUserId: isRequester ? connection.connectedUserId : connection.userId,
        wasAccepted: connection.status === "accepted",
      },
    },
    { ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined, userAgent: req.headers.get("user-agent") || undefined },
  );

  if (connection.status === "accepted") {
    // Delete both directions for accepted connections using parameterized queries
    // to avoid string interpolation into PostgREST filter strings.
    const { error: deleteAError } = await supabase
      .from("UserConnection")
      .delete()
      .eq("userId", user.id)
      .eq("connectedUserId", connection.connectedUserId);
    if (deleteAError) {
      return NextResponse.json({ error: "Failed to delete connection" }, { status: 500 });
    }

    const { error: deleteBError } = await supabase
      .from("UserConnection")
      .delete()
      .eq("userId", connection.connectedUserId)
      .eq("connectedUserId", user.id);
    if (deleteBError) {
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