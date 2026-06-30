import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const anonymousId = searchParams.get("anonymousId");

  if (!anonymousId) {
    return NextResponse.json({ votes: [] });
  }

  const supabase = await createServerSupabaseClient();

  const { data: votes } = await supabase
    .from('Vote')
    .select("topicId")
    .eq("anonymousId", anonymousId);

  return NextResponse.json({
    votes: (votes || []).map((v: any) => v.topicId),
  });
}
