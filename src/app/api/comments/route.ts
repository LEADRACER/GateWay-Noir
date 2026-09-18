import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeEvidenceUrls } from "@/lib/utils";
import type { Comment } from "@/lib/types/database";

type CommentWithUser = Comment & {
  userId: { displayName: string } | null;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get("topicId");

  if (!topicId) {
    return NextResponse.json({ error: "topicId required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: comments, error } = await supabase
    .from('Comment')
    .select('*, userId:User(displayName)')
    .eq("topicId", topicId)
    .eq("isFlagged", false)
    .order("createdAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const parsedComments = (comments || []).map((comment: CommentWithUser) => ({
    ...comment,
    evidenceUrls: normalizeEvidenceUrls(comment.evidenceUrls),
    userDisplayName: comment.userId?.displayName || null,
  }));

  return NextResponse.json({ comments: parsedComments });
}
