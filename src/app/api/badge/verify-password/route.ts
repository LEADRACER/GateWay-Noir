import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { setSessionCookie } from "@/lib/session-cookie";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { badgeCode, password } = await request.json();

    if (!badgeCode || !password) {
      return NextResponse.json(
        { success: false, error: "badgeCode and passcode are required" },
        { status: 400 }
      );
    }

    if (!/^\d{8}$/.test(password)) {
      return NextResponse.json(
        { success: false, error: "Passcode must be exactly 8 digits (0-9)" },
        { status: 400 }
      );
    }

    // Rate limit login attempts (brute-force protection)
    const ip = clientIp(request);
    if (!checkRateLimit(`login:ip:${ip}`, 30, 60_000)) {
      return NextResponse.json(
        { success: false, error: "Too many attempts — try again later" },
        { status: 429 }
      );
    }
    if (!checkRateLimit(`login:code:${badgeCode.toUpperCase()}`, 5, 60_000)) {
      return NextResponse.json(
        { success: false, error: "Too many attempts for this badge — try again later" },
        { status: 429 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: user } = await supabase
      .from('User')
      .select("*")
      .eq("badgeCode", badgeCode.toUpperCase())
      .maybeSingle();

    if (!user || !user.passwordHash) {
      // SECURITY: uniform error — no existence oracle. (404 "User not found"
      // vs 400 "No password set" vs 401 "Invalid password" lets attackers
      // enumerate valid badge codes.)
      return NextResponse.json(
        { success: false, error: "Invalid badge code or passcode" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid badge code or passcode" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        badgeCode: user.badgeCode,
        displayName: user.displayName,
        role: user.role,
        phone: user.phone,
        handler: user.handler,
        hasPassword: !!user.passwordHash,
      },
    });
    res.headers.set("Set-Cookie", setSessionCookie(user.badgeCode));
    return res;
  } catch (err) {
    console.error("Verify password error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to verify password" },
      { status: 500 }
    );
  }
}
