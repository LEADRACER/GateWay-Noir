import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";

const CONNECTION_ROLES = new Set(["AGENT", "BUREAU"]);

export async function POST() {
  const user = await getCurrentUser();
  if (!user || !CONNECTION_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  return NextResponse.json({ error: "This feature has been replaced by the follow system" }, { status: 410 });
}
