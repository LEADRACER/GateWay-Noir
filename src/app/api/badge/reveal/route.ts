import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { setSessionCookie } from "@/lib/session-cookie";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const anonymousId = searchParams.get("anonymousId");

  if (!anonymousId) {
    return NextResponse.json(
      { success: false, error: "anonymousId is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { data: linkedUser } = await supabase
      .from('User')
      .select("*")
      .filter("linkedIds", "ov", `{${anonymousId}}`)
      .maybeSingle();

    if (!linkedUser) {
      return NextResponse.json({
        success: true,
        hasBadge: false,
      });
    }

    const [{ count: voteCount }, { count: commentCount }] = await Promise.all([
      supabase.from('Vote').select("*", { count: "exact", head: true }).eq("userId", linkedUser.id),
      supabase.from('Comment').select("*", { count: "exact", head: true }).eq("userId", linkedUser.id),
    ]);

    const res = NextResponse.json({
      success: true,
      hasBadge: true,
      user: {
        id: linkedUser.id,
        badgeCode: linkedUser.badgeCode,
        displayName: linkedUser.displayName,
        role: linkedUser.role,
        phone: linkedUser.phone,
        handler: linkedUser.handler,
        hasPassword: !!linkedUser.passwordHash,
        isAdmin: linkedUser.isAdmin,
        voteCount,
        commentCount,
        createdAt: linkedUser.createdAt,
      },
    });
    res.headers.set("Set-Cookie", setSessionCookie(linkedUser.badgeCode));
    return res;
  } catch (err) {
    console.error("Badge status error:", err);
    return NextResponse.json({ success: false, error: "Failed to check badge" }, { status: 500 });
  }
}
