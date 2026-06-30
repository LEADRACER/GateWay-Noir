import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
    const rawCode = badgeCode.toUpperCase().replace(/[^A-Z0-9]/g, "");

    const supabase = await createServerSupabaseClient();

    // Find user — suffix (4 chars) or full badge code
    let user;
    if (rawCode.length === 4) {
      const { data } = await supabase
        .from('User')
        .select("*")
        .like("badgeCode", `%-${rawCode}`)
        .maybeSingle();
      user = data;
    } else {
      const { data } = await supabase
        .from('User')
        .select("*")
        .eq("badgeCode", rawCode)
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

    // If already linked to this anonymousId, return success
    if (linkedIds.includes(anonymousId)) {
      return NextResponse.json({
        success: true,
        alreadyClaimed: true,
        user: {
          id: user.id,
          badgeCode: user.badgeCode,
          displayName: user.displayName,
          role: user.role,
          hasPassword: !!user.passwordHash,
          isAdmin: user.isAdmin,
        },
      });
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

    return NextResponse.json({
      success: true,
      alreadyClaimed: false,
      votesMerged: true,
      user: {
        id: user.id,
        badgeCode: user.badgeCode,
        displayName: user.displayName,
        role: user.role,
        hasPassword: !!user.passwordHash,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    console.error("Badge claim error:", err);
    return NextResponse.json({ success: false, error: "Failed to claim badge" }, { status: 500 });
  }
}
