import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { logAuditWithRequest } from "@/lib/audit";

const CONNECTION_ROLES = new Set(["AGENT", "BUREAU"]);
const CONNECTION_LIMITS = { AGENT: 100, BUREAU: 200 };

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
      connectedUserId,
      createdAt,
      status,
      metadata,
      connectedUser:User!UserConnection_connectedUserId_fkey(badgeCode, displayName, role)
    `)
    .eq("userId", user.id)
    .eq("status", "accepted")
    .order("createdAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load connections" }, { status: 500 });
  }

  return NextResponse.json({ connections: connections || [] });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !CONNECTION_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const requestBody = body as Record<string, unknown>;
  const targetBadgeCode = typeof requestBody.badgeCode === "string"
    ? requestBody.badgeCode.trim().toUpperCase()
    : "";

  if (!targetBadgeCode) {
    return NextResponse.json({ error: "Badge code is required" }, { status: 400 });
  }

  if (targetBadgeCode === user.badgeCode) {
    return NextResponse.json({ error: "Cannot connect to yourself" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: targetUser, error: targetError } = await supabase
    .from("User")
    .select("id, badgeCode, displayName, role")
    .eq("badgeCode", targetBadgeCode)
    .maybeSingle();

  if (targetError || !targetUser || !CONNECTION_ROLES.has(targetUser.role)) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const privacyResult = await supabase
    .from("User")
    .select("connectionPrivacy")
    .eq("id", targetUser.id)
    .maybeSingle();

  const targetPrivacy = privacyResult.data?.connectionPrivacy || "open";
  if (targetPrivacy === "closed") {
    return NextResponse.json({ error: "User is not accepting connections" }, { status: 403 });
  }

  if (targetPrivacy === "mutual_only") {
    const { data: mutual } = await supabase
      .from("UserConnection")
      .select("id")
      .eq("userId", targetUser.id)
      .eq("connectedUserId", user.id)
      .eq("status", "accepted")
      .maybeSingle();

    if (!mutual) {
      return NextResponse.json({ error: "User only accepts connections from mutual contacts" }, { status: 403 });
    }
  }

  const limit = CONNECTION_LIMITS[user.role as keyof typeof CONNECTION_LIMITS] ?? 100;
  const { count } = await supabase
    .from("UserConnection")
    .select("*", { count: "exact", head: true })
    .eq("userId", user.id)
    .eq("status", "accepted");

  if (count && count >= limit) {
    return NextResponse.json({ error: `Connection limit reached (${limit})` }, { status: 400 });
  }

  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase
      .from("UserConnection")
      .select("id, status")
      .eq("userId", user.id)
      .eq("connectedUserId", targetUser.id)
      .maybeSingle(),
    supabase
      .from("UserConnection")
      .select("id, status")
      .eq("userId", targetUser.id)
      .eq("connectedUserId", user.id)
      .maybeSingle(),
  ]);

  if (outgoing?.status === "pending") {
    return NextResponse.json({ error: "Request already sent" }, { status: 409 });
  }

  if (outgoing?.status === "accepted" || incoming?.status === "accepted") {
    return NextResponse.json({ error: "Already connected" }, { status: 409 });
  }

  if (incoming?.status === "pending") {
    return NextResponse.json({ error: "A request from this user is waiting for your response" }, { status: 409 });
  }

  const metadata = typeof requestBody.metadata === "object" && requestBody.metadata !== null && !Array.isArray(requestBody.metadata)
    ? requestBody.metadata as Record<string, unknown>
    : {};

  const requestRow = {
    userId: user.id,
    connectedUserId: targetUser.id,
    status: "pending" as const,
    metadata,
  };

  let requestId = outgoing?.id;

  if (outgoing?.status === "rejected") {
    const { error } = await supabase
      .from("UserConnection")
      .update(requestRow)
      .eq("id", outgoing.id);

    if (error) {
      return NextResponse.json({ error: "Failed to resend connection request" }, { status: 500 });
    }
  } else {
    const { data, error } = await supabase
      .from("UserConnection")
      .insert(requestRow)
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Failed to send connection request" }, { status: 500 });
    }

    requestId = data.id;
  }

  void logAuditWithRequest(
    {
      action: "connection_request_sent",
      resource: "UserConnection",
      resourceId: requestId,
      metadata: {
        requesterId: user.id,
        requesterBadgeCode: user.badgeCode,
        targetUserId: targetUser.id,
        targetBadgeCode: targetUser.badgeCode,
        isResend: outgoing?.status === "rejected",
      },
    },
    { ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined, userAgent: req.headers.get("user-agent") || undefined },
  );

  return NextResponse.json(
    {
      request: {
        id: requestId,
        connectedUserId: targetUser.id,
        badgeCode: targetUser.badgeCode,
        displayName: targetUser.displayName,
        role: targetUser.role,
        status: "pending",
      },
    },
    { status: 201 },
  );
}