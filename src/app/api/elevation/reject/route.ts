import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { rejectElevation } from "@/lib/elevation-actions";

export async function POST(req: NextRequest) {
  try {
    const { requestId, adminNote } = await req.json();
    const result = await rejectElevation(requestId, adminNote);
    revalidatePath("/admin");
    return NextResponse.json(result);
  } catch {
    console.error("Reject elevation error:");
    return NextResponse.json({ error: "Failed to reject" }, { status: 500 });
  }
}
