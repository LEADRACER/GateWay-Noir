import { NextRequest, NextResponse } from "next/server";
import { setupBureauAdmin } from "@/lib/admin-actions";

export async function POST(req: NextRequest) {
  try {
    const { badgeCode, adminId } = await req.json();
    const result = await setupBureauAdmin(badgeCode || "", undefined, adminId);
    if (result.error) {
      const status = result.error.includes("Admin ID required") ? 401
        : result.error.includes("Not authorized") ? 403
        : result.error.includes("not found") ? 404
        : result.error.includes("Only AGENT") ? 400
        : result.error.includes("collision") ? 409
        : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("Setup bureau error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
