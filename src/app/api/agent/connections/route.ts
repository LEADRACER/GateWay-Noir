import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

const DISCUSSION_ROLES = new Set(["DETECTIVE", "AGENT", "BUREAU"]);
const CONNECTION_LIMITS = { AGENT: 100, BUREAU: 200 };

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !DISCUSSION_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: connections, error } = await supabase
    .from("UserConnection")
    .select(`
      id,
      connectedUserId,
      createdAt,
      metadata,
      connectedUser:User!UserConnection_connectedUserId_fkey(badgeCode, displayName, role, connectionPrivacy)
    `)
    .eq("userId", user.id)
    .order("createdAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load connections" }, { status: 500 });
  }

  return NextResponse.json({ connections: connections || [] });
}

export async function POST(req: NextRequest) {
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

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const requestBody = body as Record<string, unknown>;
  const targetBadgeCode = typeof requestBody.badgeCode === "string" ? requestBody.badgeCode.trim().toUpperCase() : "";
  if (!targetBadgeCode) {
    return NextResponse.json({ error: "Badge code is required" }, { status: 400 });
  }

  if (targetBadgeCode === user.badgeCode) {
    return NextResponse.json({ error: "Cannot connect to yourself" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: targetUser, error: targetError } = await supabase
    .from("User")
    .select("id, badgeCode, displayName, role, connectionPrivacy")
    .eq("badgeCode", targetBadgeCode)
    .maybeSingle();

  if (targetError || !targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (targetUser.role === "DETECTIVE") {
    return NextResponse.json({ error: "Cannot connect to Detectives" }, { status: 403 });
  }

  if (targetUser.connectionPrivacy === "closed") {
    return NextResponse.json({ error: "User is not accepting connections" }, { status: 403 });
  }

  if (targetUser.connectionPrivacy === "mutual_only") {
    const { data: mutual } = await supabase
      .from("UserConnection")
      .select("id")
      .eq("userId", targetUser.id)
      .eq("connectedUserId", user.id)
      .maybeSingle();

    if (!mutual) {
      return NextResponse.json({ error: "User only accepts connections from mutual contacts" }, { status: 403 });
    }
  }

  const limit = CONNECTION_LIMITS[user.role as keyof typeof CONNECTION_LIMITS] ?? 50;
  const { count } = await supabase
    .from("UserConnection")
    .select("*", { count: "exact", head: true })
    .eq("userId", user.id);

  if (count && count >= limit) {
    return NextResponse.json({ error: `Connection limit reached (${limit})` }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("UserConnection")
    .select("id")
    .eq("userId", user.id)
    .eq("connectedUserId", targetUser.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Already connected" }, { status: 409 });
  }

  const metadata = (typeof requestBody.metadata === "object" && requestBody.metadata !== null)
    ? requestBody.metadata as Record<string, unknown>
    : {};

  const { error: insertError } = await supabase
    .from("UserConnection")
    .insert([
      { userId: user.id, connectedUserId: targetUser.id, metadata },
      { userId: targetUser.id, connectedUserId: user.id, metadata: {} },
    ]);

  if (insertError) {
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 });
  }

  return NextResponse.json(
    { connection: { connectedUserId: targetUser.id, badgeCode: targetUser.badgeCode, displayName: targetUser.displayName, role: targetUser.role } },
    { status: 201 }
  );
}