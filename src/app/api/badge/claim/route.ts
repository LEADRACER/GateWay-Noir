import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

    // Find user by badge code
    const user = await prisma.user.findUnique({
      where: { badgeCode: badgeCode.toUpperCase() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid badge code" },
        { status: 404 }
      );
    }

    // Parse existing linked IDs
    const rawIds = user.linkedIds as unknown;
    const linkedIds: string[] = Array.isArray(rawIds) ? (rawIds as string[]) : JSON.parse(String(rawIds || "[]"));

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

    // ═══ PRECLAIM GUARD ═══
    // If this badge already has linkedIds (claimed on another device),
    // require passcode verification before allowing a new device to claim it.
    const hasOtherClaims = linkedIds.length > 0;
    if (hasOtherClaims) {
      // If the badge has a passcode, require verification
      if (user.passwordHash) {
        return NextResponse.json({
          success: false,
          error: "This badge is protected by a passcode. Use the original device or verify with your passcode to claim on this device.",
          needsPasscode: true,
          badgeCode: user.badgeCode,
        });
      }
      // No passcode set — allow the claim but warn
      // (user can set a passcode later for security)
    }

    // Remove this anonymousId from any other user that has it
    const otherUsers = await prisma.user.findMany({
      where: {
        id: { not: user.id },
        linkedIds: { array_contains: anonymousId },
      },
    });
    for (const otherUser of otherUsers) {
      const rawOtherIds = otherUser.linkedIds as unknown;
      const otherIds: string[] = Array.isArray(rawOtherIds) ? (rawOtherIds as string[]) : JSON.parse(String(rawOtherIds || "[]"));
      await prisma.user.update({
        where: { id: otherUser.id },
        data: {
          linkedIds: otherIds.filter((id) => id !== anonymousId),
        },
      });
    }

    // Link the anonymousId to this user
    linkedIds.push(anonymousId);

    // Password: verify existing OR set new
    if (user.passwordHash) {
      // Badge already has a passcode — verify it
      const valid = await bcrypt.compare(pwd, user.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { success: false, error: "Incorrect passcode for this badge" },
          { status: 401 }
        );
      }
      // Don't overwrite the existing password — just link the device
      await prisma.user.update({
        where: { id: user.id },
        data: { linkedIds },
      });
    } else {
      // First-time password set
      const passwordHash = await bcrypt.hash(pwd, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { linkedIds, passwordHash },
      });
    }

    // Merge votes: update anonymousId to use userId
    await prisma.vote.updateMany({
      where: { anonymousId, userId: null },
      data: { userId: user.id },
    });

    // Merge comments
    await prisma.comment.updateMany({
      where: { anonymousId, userId: null },
      data: { userId: user.id },
    });

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
