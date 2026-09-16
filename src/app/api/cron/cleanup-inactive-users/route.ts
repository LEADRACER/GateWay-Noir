import { NextRequest, NextResponse } from "next/server";
import { cleanupInactiveUsers, getInactiveUsersPreview } from "@/lib/admin-actions";
import { getCurrentUser } from "@/lib/get-current-user";

// Cron secret for authentication (set in env)
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // Preview mode - just show what would be deleted
  const { searchParams } = new URL(req.url);
  const preview = searchParams.get("preview") === "true";
  const days = parseInt(searchParams.get("days") || "30", 10);

  // Verify cron secret or BUREAU user
  const authHeader = req.headers.get("authorization");
  const isCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;

  if (!isCron) {
    const user = await getCurrentUser();
    if (!user || user.role !== "BUREAU") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  try {
    if (preview) {
      const users = await getInactiveUsersPreview(days);
      return NextResponse.json({
        success: true,
        preview: true,
        daysInactive: days,
        count: users.length,
        users: users.map(u => ({
          badgeCode: u.badgeCode,
          displayName: u.displayName,
          role: u.role,
          lastSeenAt: u.lastSeenAt,
          createdAt: u.createdAt,
        })),
      });
    }

    const result = await cleanupInactiveUsers(days);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cleanup failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Force cleanup via POST (for manual triggers)
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30", 10);

  // Verify cron secret or BUREAU user
  const authHeader = req.headers.get("authorization");
  const isCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;

  if (!isCron) {
    const user = await getCurrentUser();
    if (!user || user.role !== "BUREAU") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  try {
    const result = await cleanupInactiveUsers(days);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cleanup failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}