import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { normalizePhone } from "@/lib/phone";
import { getHandlerBadgeInfo } from "@/lib/handler";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { badgeCode, phone } = await request.json();

    if (!badgeCode || !phone) {
      return NextResponse.json({ success: false, error: "badgeCode and phone required" });
    }

    // SECURITY: only a signed-in user may set a phone, and only on their own
    // badge (or as BUREAU). Same uniform-403 treatment as the name route.
    const caller = await getCurrentUser();
    if (!caller) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }
    const ip = clientIp(request);
    if (!checkRateLimit(`phone:ip:${ip}`, 15, 60_000)) {
      return NextResponse.json(
        { success: false, error: "Too many attempts — try again later" },
        { status: 429 }
      );
    }

    // Basic validation + India-first (+91) normalization to E.164
    const normalized = normalizePhone(phone);
    if (!normalized) {
      return NextResponse.json({
        success: false,
        error: "Invalid phone number — use a 10-digit Indian number or +<countrycode><number>",
      });
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

    if (user.badgeCode !== caller.badgeCode && caller.role !== "BUREAU") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    await supabase
      .from('User')
      .update({ phone: normalized, whatsappId: null })
      .eq("badgeCode", badgeCode);

    // Resolve the agent's handler to the handler's BADGE code — the identifier
    // used for display and WA addressing in agent-facing flows.
    let handlerBadge: string | null = null;
    let handlerName: string | null = null;
    if (user.handler) {
      const h = await getHandlerBadgeInfo(supabase, user.handler);
      handlerBadge = h?.badgeCode ?? null;
      handlerName = h?.displayName ?? null;
    }

    revalidatePath("/");
    return NextResponse.json({ success: true, phone: normalized, handlerBadge, handlerName });
  } catch (err) {
    console.error("Badge phone error:", err);
    return NextResponse.json({ success: false, error: "Failed to register phone" });
  }
}
