import { NextRequest, NextResponse } from "next/server";
import { rejectElevation } from "@/lib/elevation-actions";

export async function POST(req: NextRequest) {
  try {
    const { requestId, adminNote } = await req.json();
    const result = await rejectElevation(requestId, adminNote);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to reject" }, { status: 500 });
  }
}
