import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { badgeCode, password } = await request.json();

    if (!badgeCode || !password) {
      return NextResponse.json(
        { success: false, error: "badgeCode and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { badgeCode: badgeCode.toUpperCase() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { success: false, error: "No password set for this account" },
        { status: 400 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid password" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        badgeCode: user.badgeCode,
        displayName: user.displayName,
        role: user.role,
        phone: user.phone,
        handler: user.handler,
        hasPassword: !!user.passwordHash,
      },
    });
  } catch (err) {
    console.error("Verify password error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to verify password" },
      { status: 500 }
    );
  }
}
