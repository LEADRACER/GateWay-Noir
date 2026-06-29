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

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
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

    // Only elevated roles can set a password
    if (user.role !== "AGENT" && user.role !== "BUREAU") {
      return NextResponse.json(
        { success: false, error: "Only elevated agents can set a password" },
        { status: 403 }
      );
    }

    // Check they own this badge (via linkedIds)
    const rawIds = user.linkedIds as unknown;
    const linkedIds: string[] = Array.isArray(rawIds) ? (rawIds as string[]) : JSON.parse(String(rawIds || "[]"));
    if (!linkedIds.includes(anonymousId)) {
      return NextResponse.json(
        { success: false, error: "You don't own this badge" },
        { status: 403 }
      );
    }

    // Hash and store password
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
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
