import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeEvidenceUrls } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: topic, error: topicError } = await supabase
    .from('Topic')
    .select('evidence')
    .eq("id", id)
    .maybeSingle();

  if (topicError) {
    return NextResponse.json({ error: topicError.message }, { status: 500 });
  }
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const { data: comments, error: commentsError } = await supabase
    .from('Comment')
    .select('id, displayName, content, createdAt, evidenceUrls')
    .eq("topicId", id)
    .not("evidenceUrls", "is", null)
    .order("createdAt", { ascending: false });

  if (commentsError) {
    return NextResponse.json({ error: commentsError.message }, { status: 500 });
  }

  const commentEvidence = (comments || []).flatMap((comment: any) =>
    normalizeEvidenceUrls(comment.evidenceUrls).map((url: string) => ({
      url,
      source: "comment",
      commentId: comment.id,
      author: comment.displayName,
      commentContent: typeof comment.content === "string" ? comment.content.slice(0, 200) : "",
      createdAt: comment.createdAt,
    }))
  );

  return NextResponse.json({
    topicEvidence: topic.evidence || null,
    commentEvidence,
  });
}