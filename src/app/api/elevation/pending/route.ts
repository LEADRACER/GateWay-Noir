import { NextResponse } from "next/server";
import { getPendingElevations } from "@/lib/elevation-actions";
import { getCurrentUser } from "@/lib/get-current-user";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "BUREAU") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const pending = await getPendingElevations();
    return NextResponse.json({ elevations: pending });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
