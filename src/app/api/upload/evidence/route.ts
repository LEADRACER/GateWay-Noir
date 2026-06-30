import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: "Upload disabled — storage removed" }, { status: 501 });
}
