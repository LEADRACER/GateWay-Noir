import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { setSessionCookie } from "@/lib/session-cookie";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";
import {
  getBadgeProfileRequirements,
  isDefaultBadgeName,
} from "@/lib/badge-profile";

function profilePayload(user: { displayName: string; phone: string | null | undefined }) {
  const requirements = getBadgeProfileRequirements(user as { displayName: string; phone: string | undefined });
  return {
    needsName: requirements.needsName,
    needsPhone: requirements.needsPhone,
    profileComplete: !requirements.needsName && !requirements.needsPhone,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const badgeCode = typeof body.badgeCode === "string" ? body.badgeCode : "";
    const anonymousId = typeof body.anonymousId === "string" ? body.anonymousId : "";
    const password = typeof body.password === "string" ? body.password : "";
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const phoneInput = typeof body.phone === "string" ? body.phone : "";

    if (!badgeCode || !anonymousId) {
      return NextResponse.json(
        { success: false, error: "badgeCode and anonymousId are required" },
        { status: 400 },
      );
    }

    if (!password.trim() || !/^\d{8}$/.test(password.trim())) {
      return NextResponse.json(
        { success: false, error: "Passcode must be exactly 8 digits (0-9)" },
        { status: 400 },
      );
    }

    const pwd = password.trim();
    const cleaned = badgeCode.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    const ip = clientIp(request);
    const rateLimitResult1 = await checkRateLimit(`claim:ip:${ip}`, 20, 60_000);
    if (!rateLimitResult1.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many attempts — try again later" },
        { status: 429 },
      );
    }
    const rateLimitResult2 = await checkRateLimit(`claim:code:${cleaned}`, 5, 60_000);
    if (!rateLimitResult2.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many attempts for this badge — try again later" },
        { status: 429 },
      );
    }

    const supabase = await createServerSupabaseClient();
    let user;
    if (cleaned.length === 4) {
      const { data } = await supabase
        .from("User")
        .select("*")
        .like("badgeCode", `%-${cleaned}`)
        .maybeSingle();
      user = data;
    } else {
      const { data } = await supabase
        .from("User")
        .select("*")
        .eq("badgeCode", cleaned)
        .maybeSingle();
      user = data;
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid badge code — check the 4-character suffix or full code" },
        { status: 404 },
      );
    }

    const requirements = getBadgeProfileRequirements(user);
    const profileUpdates: Record<string, string> = {};
    const profileErrors: string[] = [];

    if (requirements.needsName) {
      if (!displayName || displayName.length > 40 || isDefaultBadgeName(displayName)) {
        profileErrors.push("Choose a display name for this badge");
      } else {
        profileUpdates.displayName = displayName;
      }
    }

    if (requirements.needsPhone) {
      const normalizedPhone = normalizePhone(phoneInput);
      if (!normalizedPhone) {
        profileErrors.push("Enter a valid phone number, with or without +91");
      } else {
        profileUpdates.phone = normalizedPhone;
      }
    }

    if (profileErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: profileErrors[0],
          requiresProfile: true,
          ...profilePayload(user),
        },
        { status: 400 },
      );
    }

    const linkedIds: string[] = Array.isArray(user.linkedIds) ? user.linkedIds : [];
    const alreadyClaimed = linkedIds.includes(anonymousId) && Boolean(user.passwordHash);

    if (!user.passwordHash && !linkedIds.includes(anonymousId)) {
      return NextResponse.json(
        { success: false, error: "This badge is not linked to this device. Use the device that generated it." },
        { status: 403 },
      );
    }

    if (user.passwordHash) {
      const valid = await bcrypt.compare(pwd, user.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { success: false, error: "Incorrect passcode for this badge" },
          { status: 401 },
        );
      }
    }

    if (!linkedIds.includes(anonymousId)) {
      const { data: otherUsers } = await supabase
        .from("User")
        .select("id, linkedIds")
        .filter("linkedIds", "ov", `{${anonymousId}}`);

      for (const otherUser of otherUsers || []) {
        const otherIds: string[] = Array.isArray(otherUser.linkedIds) ? otherUser.linkedIds : [];
        await supabase
          .from("User")
          .update({ linkedIds: otherIds.filter((id: string) => id !== anonymousId) })
          .eq("id", otherUser.id);
      }
      linkedIds.push(anonymousId);
    }

    const updateData: Record<string, unknown> = { linkedIds };
    if (!user.passwordHash) {
      updateData.passwordHash = await bcrypt.hash(pwd, 10);
    }
    Object.assign(updateData, profileUpdates);

    const { error: updateError } = await supabase
      .from("User")
      .update(updateData)
      .eq("id", user.id);
    if (updateError) throw updateError;

    await supabase
      .from("Vote")
      .update({ userId: user.id })
      .filter("anonymousId", "eq", anonymousId)
      .filter("userId", "is", null);

    await supabase
      .from("Comment")
      .update({ userId: user.id })
      .filter("anonymousId", "eq", anonymousId)
      .filter("userId", "is", null);

    const updatedUser = {
      ...user,
      ...profileUpdates,
      phone: profileUpdates.phone ?? user.phone,
      displayName: profileUpdates.displayName ?? user.displayName,
    };
    const res = NextResponse.json({
      success: true,
      alreadyClaimed,
      requiresProfile: false,
      votesMerged: true,
      user: {
        id: updatedUser.id,
        badgeCode: updatedUser.badgeCode,
        displayName: updatedUser.displayName,
        role: updatedUser.role,
        phone: updatedUser.phone,
        hasPassword: true,
        isAdmin: updatedUser.isAdmin,
        ...profilePayload(updatedUser),
      },
    });
    res.headers.set("Set-Cookie", setSessionCookie(updatedUser.badgeCode));
    return res;
  } catch (err) {
    console.error("Badge claim error:", err);
    return NextResponse.json({ success: false, error: "Failed to claim badge" }, { status: 500 });
  }
}
