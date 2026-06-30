import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get("topicId");

  if (!topicId) {
    return NextResponse.json({ error: "topicId required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: comments } = await supabase
    .from('Comment')
    .select("*")
    .eq("topicId", topicId)
    .eq("isFlagged", false)
    .order("createdAt", { ascending: false });

  // evidenceUrls is stored as text[] in PG, not a JSON string
  const parsedComments = (comments || []).map((c: any) => ({
    ...c,
    evidenceUrls: Array.isArray(c.evidenceUrls) ? c.evidenceUrls : [],
  }));

  return NextResponse.json({ comments: parsedComments });
}
