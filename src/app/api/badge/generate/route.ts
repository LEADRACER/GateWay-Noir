import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBadgeCode } from "@/lib/badge";

export async function POST(request: NextRequest) {
  try {
    const { role, displayName, anonymousId } = await request.json();
    const badgeCode = await generateBadgeCode(role);

    const user = await prisma.user.create({
      data: {
        badgeCode,
        displayName: displayName || "Detective",
        role: role || "DETECTIVE",
        linkedIds: anonymousId ? [anonymousId] : [],
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        badgeCode: user.badgeCode,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Badge generate error:", err);
    return NextResponse.json({ success: false, error: "Failed to generate badge" }, { status: 500 });
  }
}
