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
    const rawCode = badgeCode.toUpperCase().replace(/[^A-Z0-9]/g, "");

    // Find user — suffix (4 chars) or full badge code
    let user;
    if (rawCode.length === 4) {
      // Look up by suffix: badgeCode ending with -XXXX
      user = await prisma.user.findFirst({
        where: { badgeCode: { endsWith: `-${rawCode}` } },
      });
    } else {
      user = await prisma.user.findUnique({
        where: { badgeCode: rawCode },
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid badge code — check the 4-character suffix or full code" },
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
      const valid = await bcrypt.compare(pwd, user.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { success: false, error: "Incorrect passcode for this badge" },
          { status: 401 }
        );
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { linkedIds },
      });
    } else {
      const passwordHash = await bcrypt.hash(pwd, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { linkedIds, passwordHash },
      });
    }

    // Merge votes
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
