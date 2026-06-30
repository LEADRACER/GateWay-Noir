import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { badgeCode, phone } = await request.json();

    if (!badgeCode || !phone) {
      return NextResponse.json({ success: false, error: "badgeCode and phone required" });
    }

    // Basic validation
    const cleaned = phone.replace(/[\s\-\(\)\.\,\*\#]/g, "");
    if (!/^\+?[0-9]{7,15}$/.test(cleaned)) {
      return NextResponse.json({ success: false, error: "Invalid phone number format" });
    }

    const supabase = await createServerSupabaseClient();

    const { data: user } = await supabase
      .from('User')
      .select("*")
      .eq("badgeCode", badgeCode)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ success: false, error: "Badge not found" });
    }

    await supabase
      .from('User')
      .update({ phone: cleaned })
      .eq("badgeCode", badgeCode);

    revalidatePath("/");
    return NextResponse.json({ success: true, phone: cleaned });
  } catch (err) {
    console.error("Badge phone error:", err);
    return NextResponse.json({ success: false, error: "Failed to register phone" });
  }
}
