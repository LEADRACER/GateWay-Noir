import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const DEFAULT_NAMES = ["Detective", "Agent", "Field Agent", "Bureau Chief", "Anonymous"];

export async function POST(request: NextRequest) {
  try {
    const { badgeCode, displayName } = await request.json();

    if (!badgeCode || !displayName?.trim()) {
      return NextResponse.json(
        { success: false, error: "badgeCode and displayName are required" },
        { status: 400 }
      );
    }

    const name = displayName.trim();

    if (name.length < 1 || name.length > 40) {
      return NextResponse.json(
        { success: false, error: "Display name must be 1–40 characters" },
        { status: 400 }
      );
    }

    if (DEFAULT_NAMES.includes(name)) {
      return NextResponse.json(
        { success: false, error: "Choose a unique name, not the default" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: user, error: findError } = await supabase
      .from('User')
      .select("id")
      .eq("badgeCode", badgeCode)
      .maybeSingle();

    if (findError || !user) {
      return NextResponse.json(
        { success: false, error: "Badge not found" },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabase
      .from('User')
      .update({ displayName: name })
      .eq("id", user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, displayName: name });
  } catch (err) {
    console.error("Badge name update error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update display name" },
      { status: 500 }
    );
  }
}
