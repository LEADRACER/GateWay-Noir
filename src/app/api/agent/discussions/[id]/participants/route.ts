import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== "AGENT" && user.role !== "BUREAU")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  // Get discussion to check access
  const { data: discussion } = await supabase
    .from('AgentDiscussion')
    .select("id, visibility, createdById")
    .eq("id", id)
    .maybeSingle();

  if (!discussion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check access
  const hasAccess = user.role === "BUREAU" || discussion.createdById === user.id || discussion.visibility === 'all';
  if (!hasAccess) {
    // For invited discussions, check if user is participant
    const { data: participant } = await supabase
      .from('DiscussionParticipant')
      .select('id')
      .eq('discussionId', id)
      .eq('userId', user.id)
      .maybeSingle();
    if (!participant) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
  }

  // Get participants with user details
  const { data: participants } = await supabase
    .from('DiscussionParticipant')
    .select(`
      id,
      discussionId,
      userId,
      joinedAt,
      user:User!userId(id, badgeCode, displayName, role)
    `)
    .eq('discussionId', id)
    .order('joinedAt', { ascending: true });

  return NextResponse.json({ 
    participants: (participants || []).map(p => {
      const u = Array.isArray(p.user) ? p.user[0] : p.user;
      return {
        id: p.id,
        discussionId: p.discussionId,
        userId: p.userId,
        joinedAt: p.joinedAt,
        user: u ? {
          id: u.id,
          badgeCode: u.badgeCode,
          displayName: u.displayName,
          role: u.role,
        } : null,
      };
    })
  });
}