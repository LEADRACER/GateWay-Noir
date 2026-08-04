import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { setSessionCookie } from "@/lib/session-cookie";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { badgeCode, anonymousId, password } = await request.json();

    if (!badgeCode || !anonymousId) {
      return NextResponse.json(
        { success: false, error: "badgeCode and anonymousId are required" },
        { status: 400 }
      );
    }

    if (!password?.trim() || !/^\d{8}$/.test(password.trim())) {
      return NextResponse.json(
        { success: false, error: "Passcode must be exactly 8 digits (0-9)" },
        { status: 400 }
      );
    }

    const pwd = password.trim();
    const cleaned = badgeCode.toUpperCase().replace(/[^A-Z0-9-]/g, "");

    // Rate limit claims (anti-enumeration + anti-brute-force)
    const ip = clientIp(request);
    if (!checkRateLimit(`claim:ip:${ip}`, 20, 60_000)) {
      return NextResponse.json(
        { success: false, error: "Too many attempts — try again later" },
        { status: 429 }
      );
    }
    if (!checkRateLimit(`claim:code:${cleaned}`, 5, 60_000)) {
      return NextResponse.json(
        { success: false, error: "Too many attempts for this badge — try again later" },
        { status: 429 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Find user — suffix (4 chars, no dash) or full badge code (with dash)
    let user;
    if (cleaned.length === 4) {
      const { data } = await supabase
        .from('User')
        .select("*")
        .like("badgeCode", `%-${cleaned}`)
        .maybeSingle();
      user = data;
    } else {
      const { data } = await supabase
        .from('User')
        .select("*")
        .eq("badgeCode", cleaned)
        .maybeSingle();
      user = data;
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid badge code — check the 4-character suffix or full code" },
        { status: 404 }
      );
    }

    const linkedIds: string[] = Array.isArray(user.linkedIds) ? user.linkedIds : [];

    // SECURITY: an unclaimed badge (no passcode set yet) may only be claimed by
    // the anonymousId that generated/received it (linkedIds). Admin-created
    // badges ship with a temporary passcode, so a stranger who guesses the
    // 4-char code can never set a password on them — kills enumeration takeover.
    if (!user.passwordHash && !linkedIds.includes(anonymousId)) {
      return NextResponse.json(
        { success: false, error: "This badge is not linked to this device. Use the device that generated it." },
        { status: 403 }
      );
    }

    // If already linked to this anonymousId, return success
    // (but only if they also have a password set — otherwise fall through to set it)
    if (linkedIds.includes(anonymousId) && user.passwordHash) {
      const res = NextResponse.json({
        success: true,
        alreadyClaimed: true,
        user: {
          id: user.id,
          badgeCode: user.badgeCode,
          displayName: user.displayName,
          role: user.role,
          hasPassword: true,
          isAdmin: user.isAdmin,
        },
      });
      res.headers.set("Set-Cookie", setSessionCookie(user.badgeCode));
      return res;
    }

    // Remove this anonymousId from any other user that has it
    const { data: otherUsers } = await supabase
      .from('User')
      .select("id, linkedIds")
      .filter("linkedIds", "ov", `{${anonymousId}}`);

    for (const otherUser of otherUsers || []) {
      const otherIds: string[] = Array.isArray(otherUser.linkedIds) ? otherUser.linkedIds : [];
      await supabase
        .from('User')
        .update({ linkedIds: otherIds.filter((id: string) => id !== anonymousId) })
        .eq("id", otherUser.id);
    }

    // Link the anonymousId to this user
    linkedIds.push(anonymousId);

    // Password: verify existing OR set new
    let hasPassword = !!user.passwordHash;
    if (user.passwordHash) {
      const valid = await bcrypt.compare(pwd, user.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { success: false, error: "Incorrect passcode for this badge" },
          { status: 401 }
        );
      }
      await supabase
        .from('User')
        .update({ linkedIds })
        .eq("id", user.id);
    } else {
      const passwordHash = await bcrypt.hash(pwd, 10);
      await supabase
        .from('User')
        .update({ linkedIds, passwordHash })
        .eq("id", user.id);
      hasPassword = true; // we just set it
    }

    // Merge votes
    await supabase
      .from('Vote')
      .update({ userId: user.id })
      .filter("anonymousId", "eq", anonymousId)
      .filter("userId", "is", null);

    // Merge comments
    await supabase
      .from('Comment')
      .update({ userId: user.id })
      .filter("anonymousId", "eq", anonymousId)
      .filter("userId", "is", null);

    const res = NextResponse.json({
      success: true,
      alreadyClaimed: false,
      votesMerged: true,
      user: {
        id: user.id,
        badgeCode: user.badgeCode,
        displayName: user.displayName,
        role: user.role,
        hasPassword,
        isAdmin: user.isAdmin,
      },
    });
    res.headers.set("Set-Cookie", setSessionCookie(user.badgeCode));
    return res;
  } catch (err) {
    console.error("Badge claim error:", err);
    return NextResponse.json({ success: false, error: "Failed to claim badge" }, { status: 500 });
  }
}
