import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { rejectElevation } from "@/lib/elevation-actions";
import { getCurrentUser } from "@/lib/get-current-user";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "BUREAU") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { requestId, adminNote } = await req.json();
    const result = await rejectElevation(requestId, adminNote);
    revalidatePath("/admin");
    return NextResponse.json(result);
  } catch {
    console.error("Reject elevation error:");
    return NextResponse.json({ error: "Failed to reject" }, { status: 500 });
  }
}
