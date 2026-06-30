import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { setSessionCookie } from "@/lib/session-cookie";

export async function POST(request: NextRequest) {
  try {
    const { badgeCode, password, anonymousId } = await request.json();

    if (!badgeCode || !password || !anonymousId) {
      return NextResponse.json(
        { success: false, error: "badgeCode, password, and anonymousId are required" },
        { status: 400 }
      );
    }

    if (!/^\d{8}$/.test(password)) {
      return NextResponse.json(
        { success: false, error: "Passcode must be exactly 8 digits (0-9)" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: user } = await supabase
      .from('User')
      .select("*")
      .eq("badgeCode", badgeCode.toUpperCase())
      .maybeSingle();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const linkedIds: string[] = Array.isArray(user.linkedIds) ? user.linkedIds : [];

    if (!linkedIds.includes(anonymousId)) {
      return NextResponse.json(
        { success: false, error: "You don't own this badge" },
        { status: 403 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await supabase
      .from('User')
      .update({ passwordHash })
      .eq("id", user.id);

    revalidatePath("/admin");

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        badgeCode: user.badgeCode,
        displayName: user.displayName,
        role: user.role,
      },
    });
    res.headers.set("Set-Cookie", setSessionCookie(user.badgeCode));
    return res;
  } catch (err) {
    console.error("Set password error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to set password" },
      { status: 500 }
    );
  }
}
