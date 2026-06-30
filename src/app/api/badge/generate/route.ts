import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateBadgeCode } from "@/lib/badge";

export async function POST(request: NextRequest) {
  try {
    const { role, displayName, anonymousId } = await request.json();
    const validRole = "DETECTIVE";
    const resolvedRole = role || "DETECTIVE";
    if (resolvedRole !== validRole) {
      return NextResponse.json({ success: false, error: "Only DETECTIVE role can be self-assigned" }, { status: 400 });
    }
    const supabase = await createServerSupabaseClient();
    const badgeCode = await generateBadgeCode(resolvedRole);

    const { data: user, error } = await supabase
      .from('User')
      .insert({
        badgeCode,
        displayName: displayName || "Detective",
        role: role || "DETECTIVE",
        linkedIds: anonymousId ? [anonymousId] : [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        badgeCode: user.badgeCode,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Badge generate error:", err);
    return NextResponse.json({ success: false, error: "Failed to generate badge" }, { status: 500 });
  }
}
