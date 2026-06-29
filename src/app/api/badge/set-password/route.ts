import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { badgeCode, password, anonymousId } = await request.json();

    if (!badgeCode || !password || !anonymousId) {
      return NextResponse.json(
        { success: false, error: "badgeCode, password, and anonymousId are required" },
        { status: 400 }
      );
    }

    if (!/^\d{8}$/.test(password)) {
      return NextResponse.json(
        { success: false, error: "Passcode must be exactly 8 digits (0-9)" },
        { status: 400 }
      );
    }

    // Find user by badge code
    const user = await prisma.user.findUnique({
      where: { badgeCode: badgeCode.toUpperCase() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const linkedIds: string[] = Array.isArray(user.linkedIds) ? user.linkedIds : [];

    if (user.passwordHash) {
      // Existing user — must own this badge to change password
      if (!linkedIds.includes(anonymousId)) {
        return NextResponse.json(
          { success: false, error: "You don't own this badge" },
          { status: 403 }
        );
      }
    }

    // Link anonymousId to this user if not already linked (first-time setup)
    const updatedLinkedIds = linkedIds.includes(anonymousId)
      ? linkedIds
      : [...linkedIds, anonymousId];

    // Hash and store password
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, linkedIds: updatedLinkedIds },
    });

    revalidatePath("/admin");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Set password error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to set password" },
      { status: 500 }
    );
  }
}
