import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

const DISCUSSION_ROLES = new Set(["AGENT", "BUREAU"]);
const CONNECTION_LIMITS = { AGENT: 100, BUREAU: 200 };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !DISCUSSION_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = (body as Record<string, unknown>).action;
  if (action !== "accept" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: request, error: fetchError } = await supabase
    .from("UserConnection")
    .select("userId, connectedUserId, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (request.connectedUserId !== user.id) {
    return NextResponse.json({ error: "Not authorized to respond to this request" }, { status: 403 });
  }

  if (request.status !== "pending") {
    return NextResponse.json({ error: "Request already processed" }, { status: 400 });
  }

  if (action === "reject") {
    const { error } = await supabase
      .from("UserConnection")
      .update({ status: "rejected" })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to reject request" }, { status: 500 });
    }

    return NextResponse.json({ success: true, action: "rejected" });
  }

  const requesterRoleResult = await supabase
    .from("User")
    .select("role")
    .eq("id", request.userId)
    .maybeSingle();

  if (requesterRoleResult.error || !requesterRoleResult.data) {
    return NextResponse.json({ error: "Requester not found" }, { status: 404 });
  }

  const requesterLimit = CONNECTION_LIMITS[requesterRoleResult.data.role as keyof typeof CONNECTION_LIMITS] ?? 100;
  const recipientLimit = CONNECTION_LIMITS[user.role as keyof typeof CONNECTION_LIMITS] ?? 100;

  const [{ count: requesterCount }, { count: recipientCount }] = await Promise.all([
    supabase
      .from("UserConnection")
      .select("*", { count: "exact", head: true })
      .eq("userId", request.userId)
      .eq("status", "accepted"),
    supabase
      .from("UserConnection")
      .select("*", { count: "exact", head: true })
      .eq("userId", user.id)
      .eq("status", "accepted"),
  ]);

  if ((requesterCount || 0) >= requesterLimit || (recipientCount || 0) >= recipientLimit) {
    return NextResponse.json({ error: "Connection limit reached" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("UserConnection")
    .update({ status: "accepted" })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to accept request" }, { status: 500 });
  }

  const { error: upsertError } = await supabase
    .from("UserConnection")
    .upsert(
      {
        userId: user.id,
        connectedUserId: request.userId,
        status: "accepted",
        metadata: {},
      },
      { onConflict: "userId,connectedUserId" },
    );

  if (upsertError) {
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 });
  }

  const { data: newConnection } = await supabase
    .from("UserConnection")
    .select("id")
    .eq("userId", user.id)
    .eq("connectedUserId", request.userId)
    .eq("status", "accepted")
    .maybeSingle();

  return NextResponse.json({ success: true, action: "accepted", connectionId: newConnection?.id });
}