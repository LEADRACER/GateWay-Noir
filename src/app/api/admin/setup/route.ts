import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBadgePrefix } from "@/lib/badge";

export async function POST(req: NextRequest) {
  try {
    const { badgeCode, adminId } = await req.json();

    // One-time bootstrap guard: if a BUREAU user already exists, require admin auth
    const existingBureau = await prisma.user.findFirst({ where: { role: "BUREAU" } });
    if (existingBureau) {
      if (!adminId) {
        return NextResponse.json({ error: "Admin ID required — setup is locked after first admin" }, { status: 401 });
      }
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { role: true },
      });
      if (!admin || admin.role !== "BUREAU") {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    }

    if (!badgeCode?.trim()) {
      return NextResponse.json({ error: "Badge code is required" }, { status: 400 });
    }

    const code = badgeCode.trim().toUpperCase();
    const user = await prisma.user.findUnique({ where: { badgeCode: code } });
    if (!user) {
      return NextResponse.json({ error: "No user found with this badge code" }, { status: 404 });
    }

    if (user.role === "BUREAU") {
      return NextResponse.json({
        success: true,
        message: "Already BUREAU",
        badgeCode: user.badgeCode,
        displayName: user.displayName,
      });
    }

    // Re-prefix badge code: DET-XXXX → BRU-XXXX
    const prefix = getBadgePrefix("BUREAU");
    const suffix = user.badgeCode.split("-")[1] || user.badgeCode.slice(-4);
    const newBadgeCode = `${prefix}-${suffix}`;

    const existing = await prisma.user.findUnique({ where: { badgeCode: newBadgeCode } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: "Badge code collision — try with a new DET badge" }, { status: 409 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: "BUREAU",
        badgeCode: newBadgeCode,
        isAdmin: true,
      },
    });

    return NextResponse.json({
      success: true,
      badgeCode: newBadgeCode,
      displayName: user.displayName,
    });
  } catch (err) {
    console.error("Setup bureau error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
