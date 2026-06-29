import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { badgeCode, anonymousId } = await request.json();

    if (!badgeCode || !anonymousId) {
      return NextResponse.json(
        { success: false, error: "badgeCode and anonymousId are required" },
        { status: 400 }
      );
    }

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
    const linkedIds: string[] = JSON.parse(user.linkedIds || "[]");

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
    const allUsers = await prisma.user.findMany();
    for (const otherUser of allUsers) {
      if (otherUser.id === user.id) continue;
      try {
        const otherIds: string[] = JSON.parse(otherUser.linkedIds || "[]");
        if (otherIds.includes(anonymousId)) {
          await prisma.user.update({
            where: { id: otherUser.id },
            data: {
              linkedIds: JSON.stringify(otherIds.filter((id) => id !== anonymousId)),
            },
          });
        }
      } catch {
        // skip malformed JSON
      }
    }

    // Link the anonymousId to this user
    linkedIds.push(anonymousId);
    await prisma.user.update({
      where: { id: user.id },
      data: { linkedIds: JSON.stringify(linkedIds) },
    });

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
