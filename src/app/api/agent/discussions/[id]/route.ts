import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

// PATCH /api/agent/discussions/[id] — update title/description or close/reopen (creator or BUREAU)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== "AGENT" && user.role !== "BUREAU")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: discussion } = await supabase
    .from('AgentDiscussion')
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!discussion) {
    return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
  }

  if (discussion.createdById !== user.id && user.role !== "BUREAU") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    update.title = body.title.trim();
  }
  if (body.description !== undefined) {
    update.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
  }
  if (body.isOpen !== undefined) {
    update.isOpen = !!body.isOpen;

    // SEAL & SUMMARIZE: reopening a closed discussion wipes the old session
    // into a short read-only summary. Original comments become unreadable.
    if (discussion.isOpen === false && body.isOpen === true) {
      const { data: msgs } = await supabase
        .from('AgentDiscussionMessage')
        .select('content, createdAt, user:User(badgeCode)')
        .eq('discussionId', id)
        .order('createdAt', { ascending: true });

      if (msgs && msgs.length > 0) {
        const agents = [...new Set(msgs.map((m: any) => m.user?.badgeCode ?? "?"))].join(", ");
        const last = msgs[msgs.length - 1];
        const excerpt = String(last.content ?? "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 160);
        update.summary = `${msgs.length} comment${msgs.length > 1 ? "s" : ""} · ${agents} · last ${new Date(
          last.createdAt
        ).toISOString().slice(0, 10)} — ${excerpt}`;
      } else {
        update.summary = null;
      }

      // Wipe the session — only the summary remains readable
      await supabase.from('AgentDiscussionMessage').delete().eq('discussionId', id);
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  update.updatedAt = new Date().toISOString();

  const { data: updated } = await supabase
    .from('AgentDiscussion')
    .update(update)
    .eq("id", id)
    .select()
    .single();

  return NextResponse.json({ discussion: updated });
}
