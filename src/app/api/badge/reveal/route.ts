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
    const users = await prisma.user.findMany();
    const linkedUser = users.find((u) => {
      try {
        const ids: string[] = JSON.parse(u.linkedIds || "[]");
        return ids.includes(anonymousId);
      } catch {
        return false;
      }
    });

    if (!linkedUser) {
      // Generate a new badge on the fly if not linked yet
      const { generateBadgeCode } = await import("@/lib/badge");
      const badgeCode = await generateBadgeCode("DETECTIVE");
      const user = await prisma.user.create({
        data: {
          badgeCode,
          linkedIds: JSON.stringify([anonymousId]),
          handler: "Bureau Commissioner",
        },
      });

      // Merge any existing votes/comments
      await prisma.vote.updateMany({
        where: { anonymousId, userId: null },
        data: { userId: user.id },
      });
      await prisma.comment.updateMany({
        where: { anonymousId, userId: null },
        data: { userId: user.id },
      });

      return NextResponse.json({
        success: true,
        isNew: true,
        user: {
          id: user.id,
          badgeCode: user.badgeCode,
          displayName: user.displayName,
          role: user.role,
          phone: user.phone,
          handler: user.handler,
          hasPassword: !!user.passwordHash,
          isAdmin: user.isAdmin,
        },
      });
    }

    return NextResponse.json({
      success: true,
      isNew: false,
      user: {
        id: linkedUser.id,
        badgeCode: linkedUser.badgeCode,
        displayName: linkedUser.displayName,
        role: linkedUser.role,
        phone: linkedUser.phone,
        handler: linkedUser.handler,
        hasPassword: !!linkedUser.passwordHash,
        isAdmin: linkedUser.isAdmin,
        createdAt: linkedUser.createdAt,
      },
    });
  } catch (err) {
    console.error("Badge reveal error:", err);
    return NextResponse.json({ success: false, error: "Failed to reveal badge" }, { status: 500 });
  }
}
