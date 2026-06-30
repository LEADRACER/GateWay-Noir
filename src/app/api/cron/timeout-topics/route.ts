import { NextResponse } from "next/server";
import { processTopicTimeouts } from "@/lib/timeout-actions";

/**
 * POST /api/cron/timeout-topics
 *
 * Called periodically by cron to:
 * 1. Auto-conclude expired ACTIVE topics (endsAt < now)
 * 2. Permanently delete concluded topics past 7-day window
 *
 * Protected by a simple secret token to prevent abuse.
 */
export async function POST(request: Request) {
  // Simple auth — check for secret token in header or query param
  const authHeader = request.headers.get("authorization");
  const body = await request.json().catch(() => ({}));
  const token = authHeader?.replace("Bearer ", "") || (body as any).token;

  if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await processTopicTimeouts();
  return NextResponse.json(results);
}

// Also allow GET for simple curl pings
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await processTopicTimeouts();
  return NextResponse.json(results);
}
