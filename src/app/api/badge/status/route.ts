import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const anonymousId = searchParams.get("anonymousId");

  if (!anonymousId) {
    return NextResponse.json(
      { success: false, error: "anonymousId is required" },
      { status: 400 }
    );
  }

  try {
    // Find user linked to this anonymousId
    const linkedUser = await prisma.user.findFirst({
      where: {
        linkedIds: { has: anonymousId },
      },
    });

    if (!linkedUser) {
      return NextResponse.json({
        success: true,
        hasBadge: false,
      });
    }

    // Get vote count and comment count for this user
    const [voteCount, commentCount] = await Promise.all([
      prisma.vote.count({ where: { userId: linkedUser.id } }),
      prisma.comment.count({ where: { userId: linkedUser.id } }),
    ]);

    return NextResponse.json({
      success: true,
      hasBadge: true,
      user: {
        id: linkedUser.id,
        badgeCode: linkedUser.badgeCode,
        displayName: linkedUser.displayName,
        role: linkedUser.role,
        phone: linkedUser.phone,
        handler: linkedUser.handler,
        hasPassword: !!linkedUser.passwordHash,
        isAdmin: linkedUser.isAdmin,
        voteCount,
        commentCount,
        createdAt: linkedUser.createdAt,
      },
    });
  } catch (err) {
    console.error("Badge status error:", err);
    return NextResponse.json({ success: false, error: "Failed to check badge" }, { status: 500 });
  }
}
