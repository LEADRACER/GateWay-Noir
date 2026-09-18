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

  const { data: myOutgoing, error: outError } = await supabase
    .from("UserConnection")
    .select(`
      id,
      connectedUserId,
      createdAt,
      status,
      connectedUser:User!UserConnection_connectedUserId_fkey(id, badgeCode, displayName, role)
    `)
    .eq("userId", user.id)
    .in("status", ["following", "mutual"])
    .order("createdAt", { ascending: false });

  if (outError) {
    return NextResponse.json({ error: "Failed to load connections" }, { status: 500 });
  }

  const { data: myIncoming, error: inError } = await supabase
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
    .in("status", ["following", "mutual"])
    .order("createdAt", { ascending: false });

  if (inError) {
    return NextResponse.json({ error: "Failed to load connections" }, { status: 500 });
  }

  const outgoing = ((myOutgoing || []) as any[]).map((row) => {
    const connectedUser = Array.isArray(row.connectedUser) ? row.connectedUser[0] : row.connectedUser;
    return {
      id: row.id,
      userId: row.userId,
      connectedUserId: row.connectedUserId,
      status: row.status,
      connectedUser: connectedUser ?? { id: row.connectedUserId, badgeCode: "?", displayName: "Unknown", role: "AGENT" as const },
      createdAt: row.createdAt,
    };
  });

  const incoming = (myIncoming || []).map((row: { id: string; userId: string; connectedUserId: string; createdAt: string; status: string; user: { id: string; badgeCode: string; displayName: string; role: string } | { id: string; badgeCode: string; displayName: string; role: string }[] | null }) => {
    const userField = Array.isArray(row.user) ? row.user[0] : row.user;
    return {
      id: row.id,
      userId: row.userId,
      connectedUserId: row.connectedUserId,
      status: row.status,
      connectedUser: userField ?? { id: row.userId, badgeCode: "?", displayName: "Unknown", role: "AGENT" as const },
      createdAt: row.createdAt,
    };
  });

  const mutual: typeof outgoing = [];
  const outgoingIds = new Set(outgoing.map((o) => o.connectedUserId));
  for (const inc of incoming) {
    if (outgoingIds.has(inc.userId)) {
      mutual.push(inc);
    }
  }

  const mutualUserIds = new Set(mutual.map((m) => m.userId));
  const filteredOutgoing = outgoing.filter((o) => !mutualUserIds.has(o.connectedUserId));
  const filteredIncoming = incoming.filter((i) => !mutualUserIds.has(i.userId));

  return NextResponse.json({
    outgoing: filteredOutgoing,
    incoming: filteredIncoming,
    mutual,
  });
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
      .eq("status", "mutual")
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
    .eq("status", "mutual");

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

  if (outgoing?.status === "following" || outgoing?.status === "mutual") {
    if (outgoing.status === "mutual") {
      return NextResponse.json({ error: "Already connected" }, { status: 409 });
    }
    return NextResponse.json({ error: "Follow already sent" }, { status: 409 });
  }

  if (incoming?.status === "mutual") {
    return NextResponse.json({ error: "Already connected" }, { status: 409 });
  }

  const metadata = typeof requestBody.metadata === "object" && requestBody.metadata !== null && !Array.isArray(requestBody.metadata)
    ? requestBody.metadata as Record<string, unknown>
    : {};

  const followRow = {
    userId: user.id,
    connectedUserId: targetUser.id,
    status: "following" as const,
    metadata,
  };

  let requestId: string;

  if (incoming?.status === "following") {
    const { error: updateError } = await supabase
      .from("UserConnection")
      .update({ status: "mutual" })
      .eq("id", incoming.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to create connection" }, { status: 500 });
    }

    const { error: updateOutError } = await supabase
      .from("UserConnection")
      .update({ status: "mutual" })
      .eq("userId", user.id)
      .eq("connectedUserId", targetUser.id);

    if (updateOutError) {
      return NextResponse.json({ error: "Failed to create connection" }, { status: 500 });
    }

    const { data: existing } = await supabase
      .from("UserConnection")
      .select("id")
      .eq("userId", user.id)
      .eq("connectedUserId", targetUser.id)
      .eq("status", "mutual")
      .maybeSingle();

    requestId = existing?.id ?? incoming.id;
  } else if (outgoing?.status === "rejected") {
    const { error: updateError } = await supabase
      .from("UserConnection")
      .update(followRow)
      .eq("id", outgoing.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to follow" }, { status: 500 });
    }
    requestId = outgoing.id;
  } else {
    const { data, error } = await supabase
      .from("UserConnection")
      .insert(followRow)
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Failed to follow" }, { status: 500 });
    }
    requestId = data.id;
  }

  void logAuditWithRequest(
    {
      action: "connection_followed",
      resource: "UserConnection",
      resourceId: requestId,
      metadata: {
        followerId: user.id,
        followerBadgeCode: user.badgeCode,
        targetUserId: targetUser.id,
        targetBadgeCode: targetUser.badgeCode,
      },
    },
    { ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined, userAgent: req.headers.get("user-agent") || undefined },
  );

  return NextResponse.json(
    {
      connection: {
        id: requestId,
        userId: user.id,
        connectedUserId: targetUser.id,
        status: "following",
        connectedUser: {
          id: targetUser.id,
          badgeCode: targetUser.badgeCode,
          displayName: targetUser.displayName,
          role: targetUser.role,
        },
      },
    },
    { status: 201 },
  );
}
