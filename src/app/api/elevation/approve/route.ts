import { NextRequest, NextResponse } from "next/server";
import { approveElevation } from "@/lib/elevation-actions";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { requestId, adminId } = await req.json();

    if (!adminId) {
      return NextResponse.json({ error: "Admin ID required" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin || admin.role !== "BUREAU") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const result = await approveElevation(requestId, adminId);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("Approve elevation error:", e);
    return NextResponse.json({ error: e?.message || "Failed to approve" }, { status: 500 });
  }
}
