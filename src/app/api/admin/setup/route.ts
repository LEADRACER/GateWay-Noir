import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBadgePrefix } from "@/lib/badge";

export async function POST(req: NextRequest) {
  try {
    const { badgeCode, adminId } = await req.json();
    const supabase = await createServerSupabaseClient();

    // One-time bootstrap guard: if a BUREAU user already exists, require admin auth
    const { data: existingBureau } = await supabase
      .from('User')
      .select("id")
      .eq("role", "BUREAU")
      .maybeSingle();

    if (existingBureau) {
      if (!adminId) {
        return NextResponse.json({ error: "Admin ID required — setup is locked after first admin" }, { status: 401 });
      }
      const { data: admin } = await supabase
        .from('User')
        .select("role")
        .eq("id", adminId)
        .maybeSingle();

      if (!admin || admin.role !== "BUREAU") {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    }

    if (!badgeCode?.trim()) {
      return NextResponse.json({ error: "Badge code is required" }, { status: 400 });
    }

    const code = badgeCode.trim().toUpperCase();
    const { data: user } = await supabase
      .from('User')
      .select("*")
      .eq("badgeCode", code)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: "No user found with this badge code" }, { status: 404 });
    }

    if (user.role === "BUREAU") {
      return NextResponse.json({
        success: true,
        message: "Already BUREAU",
        badgeCode: user.badgeCode,
        displayName: user.displayName,
      });
    }

    // Only AGENT users can be promoted to BUREAU via this endpoint
    if (user.role !== "AGENT") {
      return NextResponse.json({ error: "Only AGENT users can be promoted to BUREAU" }, { status: 400 });
    }

    // Re-prefix badge code
    const prefix = getBadgePrefix("BUREAU");
    const suffix = user.badgeCode.split("-")[1] || user.badgeCode.slice(-4);
    const newBadgeCode = `${prefix}-${suffix}`;

    const { data: existing } = await supabase
      .from('User')
      .select("id")
      .eq("badgeCode", newBadgeCode)
      .maybeSingle();

    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: "Badge code collision — try with a new DET badge" }, { status: 409 });
    }

    await supabase
      .from('User')
      .update({ role: "BUREAU", badgeCode: newBadgeCode, isAdmin: true })
      .eq("id", user.id);

    return NextResponse.json({
      success: true,
      badgeCode: newBadgeCode,
      displayName: user.displayName,
    });
  } catch (err) {
    console.error("Setup bureau error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
