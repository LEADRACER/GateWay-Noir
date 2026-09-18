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

  if (connection.userId !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  void logAuditWithRequest(
    {
      action: "connection_unfollowed",
      resource: "UserConnection",
      resourceId: id,
      metadata: {
        unfollowerId: user.id,
        unfollowerBadgeCode: user.badgeCode,
        targetUserId: connection.connectedUserId,
      },
    },
    { ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined, userAgent: req.headers.get("user-agent") || undefined },
  );

  const { data: reverseConnection } = await supabase
    .from("UserConnection")
    .select("id, status")
    .eq("userId", connection.connectedUserId)
    .eq("connectedUserId", user.id)
    .maybeSingle();

  await supabase.from("UserConnection").delete().eq("id", id);

  if (reverseConnection?.status === "mutual") {
    await supabase
      .from("UserConnection")
      .update({ status: "following" })
      .eq("id", reverseConnection.id);
  }

  return NextResponse.json({ success: true });
}
