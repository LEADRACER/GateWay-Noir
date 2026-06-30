import { NextRequest, NextResponse } from "next/server";
import { approveElevation } from "@/lib/elevation-actions";

export async function POST(req: NextRequest) {
  try {
    const { requestId, adminId } = await req.json();

    if (!adminId) {
      return NextResponse.json({ error: "Admin ID required" }, { status: 401 });
    }

    // approveElevation handles its own auth check
    const result = await approveElevation(requestId, adminId);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("Approve elevation error:", e);
    return NextResponse.json({ error: e?.message || "Failed to approve" }, { status: 500 });
  }
}
