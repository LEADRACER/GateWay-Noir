import { NextResponse } from "next/server";
import { getPendingElevations } from "@/lib/elevation-actions";

export async function GET() {
  try {
    const pending = await getPendingElevations();
    return NextResponse.json({ elevations: pending });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
