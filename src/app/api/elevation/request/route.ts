import { NextRequest, NextResponse } from "next/server";
import { requestElevation } from "@/lib/elevation-actions";

export async function POST(req: NextRequest) {
  try {
    const { userId, message } = await req.json();
    const result = await requestElevation(userId, message);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
