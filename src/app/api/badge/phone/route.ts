import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { badgeCode, phone } = await request.json();

    if (!badgeCode || !phone) {
      return NextResponse.json({ success: false, error: "badgeCode and phone required" });
    }

    // Basic validation — strip common formatting characters
    const cleaned = phone.replace(/[\s\-\(\)\.\,\*\#]/g, "");
    if (!/^\+?[0-9]{7,15}$/.test(cleaned)) {
      return NextResponse.json({ success: false, error: "Invalid phone number format" });
    }

    const user = await prisma.user.findUnique({ where: { badgeCode } });
    if (!user) {
      return NextResponse.json({ success: false, error: "Badge not found" });
    }

    await prisma.user.update({
      where: { badgeCode },
      data: { phone: cleaned },
    });

    return NextResponse.json({ success: true, phone: cleaned });
  } catch (err) {
    console.error("Badge phone error:", err);
    return NextResponse.json({ success: false, error: "Failed to register phone" });
  }
}
