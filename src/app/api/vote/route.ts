import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Simple in-memory rate limiter: { key: timestamp[] }
const voteLimits = new Map<string, number[]>();

function checkRateLimit(key: string, maxVotes: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const timestamps = voteLimits.get(key) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);
  if (recent.length >= maxVotes) return false;
  recent.push(now);
  voteLimits.set(key, recent);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const topicId = formData.get("topicId") as string;
    const anonymousId = formData.get("anonymousId") as string;

    if (!topicId || !anonymousId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Rate limit: per IP (max 10 votes/min) and per anonymousId (max 3 votes/min)
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(`ip:${ip}`)) {
      return NextResponse.json({ error: "Too many votes — slow down" }, { status: 429 });
    }
    if (!checkRateLimit(`anon:${anonymousId}`, 3)) {
      return NextResponse.json({ error: "Too many votes — slow down" }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();

    // Check existing vote using composite key
    const { data: existing } = await supabase
      .from('Vote')
      .select("*")
      .eq("topicId", topicId)
      .eq("anonymousId", anonymousId)
      .maybeSingle();

    if (existing) {
      // Delete vote
      await supabase
        .from('Vote')
        .delete()
        .eq("topicId", topicId)
        .eq("anonymousId", anonymousId);

      revalidatePath("/");

      const { count } = await supabase
        .from('Vote')
        .select("*", { count: "exact", head: true })
        .eq("topicId", topicId);

      return NextResponse.json({ success: true, voted: false, votes: count ?? 0 });
    }

    // Create vote
    const { error } = await supabase
      .from('Vote')
      .insert({ topicId, anonymousId });

    if (error) throw error;

    revalidatePath("/");

    const { count } = await supabase
      .from('Vote')
      .select("*", { count: "exact", head: true })
      .eq("topicId", topicId);

    return NextResponse.json({ success: true, voted: true, votes: count ?? 0 });
  } catch (e) {
    console.error("Vote error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
