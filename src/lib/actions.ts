"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateSlug } from "./utils";
import { getCurrentUser } from "./get-current-user";
import type { Topic, Vote, Comment, Category } from "@/lib/types/database";

/**
 * Normalize Supabase PostgREST join key from table name `Category` → `category`.
 */
function normalizeCategory<T>(obj: T): T {
  if (!obj) return obj;
  const o = obj as Record<string, any>;
  if (o.Category) {
    o.category = o.Category;
    delete o.Category;
  }
  return obj;
}

/**
 * Placeholder — storage removed. No-op for evidence cleanup.
 */
// ─── Topic Actions ───

export async function getTopics(categorySlug?: string, status?: string) {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('Topic')
    .select('*, Category(*)')
    .order("createdAt", { ascending: false });

  if (categorySlug) {
    query = query.eq("category.slug", categorySlug);
  }
  if (status) {
    query = query.eq("status", status);
  } else {
    query = query.eq("status", "ACTIVE");
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Get counts separately since Supabase doesn't do _count like Prisma
  const topics = data || [];
  const enriched = await Promise.all(
    topics.map(async (t: any) => {
      const { count: commentsCount } = await supabase
        .from('Comment')
        .select("*", { count: "exact", head: true })
        .eq("topicId", t.id);
      const { count: votesCount } = await supabase
        .from('Vote')
        .select("*", { count: "exact", head: true })
        .eq("topicId", t.id);
      return normalizeCategory({ ...t, _count: { comments: commentsCount ?? 0, votes: votesCount ?? 0 } });
    }),
  );

  return enriched;
}

export async function getUpcomingTopics() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('Topic')
    .select('*, Category(*)')
    .eq("status", "UPCOMING")
    .order("createdAt", { ascending: false });

  if (error) throw new Error(error.message);

  const topics = data || [];
  const enriched = await Promise.all(
    topics.map(async (t: any) => {
      const { count } = await supabase
        .from('Vote')
        .select("*", { count: "exact", head: true })
        .eq("topicId", t.id);
      return normalizeCategory({ ...t, _count: { votes: count ?? 0 } });
    }),
  );

  return enriched;
}

export async function getActiveAndConcludedTopics(categorySlug?: string) {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('Topic')
    .select('*, Category(*)')
    .in("status", ["ACTIVE", "CONCLUDED"])
    .order("createdAt", { ascending: false });

  if (categorySlug) {
    query = query.eq("category.slug", categorySlug);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const topics = data || [];
  const enriched = await Promise.all(
    topics.map(async (t: any) => {
      const { count: commentsCount } = await supabase
        .from('Comment')
        .select("*", { count: "exact", head: true })
        .eq("topicId", t.id);
      const { count: votesCount } = await supabase
        .from('Vote')
        .select("*", { count: "exact", head: true })
        .eq("topicId", t.id);
      return normalizeCategory({ ...t, _count: { comments: commentsCount ?? 0, votes: votesCount ?? 0 } });
    }),
  );

  return enriched;
}

export async function getConcludedTopics() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('Topic')
    .select('*, Category(*)')
    .eq("status", "CONCLUDED")
    .order("createdAt", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(normalizeCategory);
}

export async function getTopicBySlug(slug: string) {
  const supabase = await createServerSupabaseClient();

  const { data: topic, error } = await supabase
    .from('Topic')
    .select('*, Category(*)')
    .eq("slug", slug)
    .maybeSingle();

  if (error) return null;
  if (!topic) return null;

  const { data: comments } = await supabase
    .from('Comment')
    .select("*")
    .eq("topicId", topic.id)
    .order("createdAt", { ascending: false });

  const { count: votesCount } = await supabase
    .from('Vote')
    .select("*", { count: "exact", head: true })
    .eq("topicId", topic.id);

  return normalizeCategory({
    ...topic,
    comments: comments || [],
    _count: { votes: votesCount ?? 0 },
  });
}

export async function getTopicById(id: string) {
  const supabase = await createServerSupabaseClient();

  const { data: topic, error } = await supabase
    .from('Topic')
    .select('*, Category(*)')
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  if (!topic) return null;

  const { data: comments } = await supabase
    .from('Comment')
    .select("*")
    .eq("topicId", topic.id)
    .order("createdAt", { ascending: false });

  return normalizeCategory({ ...topic, comments: comments || [] });
}

export async function getCategories() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('Category')
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

// ─── Voting Actions ───

export async function voteTopic(formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const topicId = formData.get("topicId") as string;
  const anonymousId = formData.get("anonymousId") as string;

  if (!topicId || !anonymousId) return { error: "Missing required fields" };

  // Check existing vote
  const { data: existing } = await supabase
    .from('Vote')
    .select("*")
    .eq("topicId", topicId)
    .eq("anonymousId", anonymousId)
    .maybeSingle();

  if (existing) {
    // Toggle — remove vote
    await supabase
      .from('Vote')
      .delete()
      .eq("topicId", topicId)
      .eq("anonymousId", anonymousId);

    revalidatePath("/");
    const { data: topic } = await supabase
      .from('Topic')
      .select("slug")
      .eq("id", topicId)
      .maybeSingle();
    if (topic) revalidatePath(`/topic/${topic.slug}`);

    return { success: true, voted: false };
  }

  // Create vote
  const { error } = await supabase
    .from('Vote')
    .insert({ topicId, anonymousId });

  if (error) return { error: error.message };

  revalidatePath("/");
  const { data: topic } = await supabase
    .from('Topic')
    .select("slug")
    .eq("id", topicId)
    .maybeSingle();
  if (topic) revalidatePath(`/topic/${topic.slug}`);

  return { success: true, voted: true };
}

export async function getVoteCount(topicId: string) {
  const supabase = await createServerSupabaseClient();

  const { count, error } = await supabase
    .from('Vote')
    .select("*", { count: "exact", head: true })
    .eq("topicId", topicId);

  if (error) return 0;
  return count ?? 0;
}

export async function hasUserVoted(topicId: string, anonymousId: string) {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('Vote')
    .select("*")
    .eq("topicId", topicId)
    .eq("anonymousId", anonymousId)
    .maybeSingle();

  return !!data;
}

export async function getUserVotes(anonymousId: string) {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('Vote')
    .select("topicId")
    .eq("anonymousId", anonymousId);

  return new Set((data || []).map((v: any) => v.topicId));
}

// ─── Promote Upcoming → Active ───

export async function promoteToActive(formData: FormData) {
  const caller = await getCurrentUser();
  if (!caller || caller.role !== "BUREAU") return { error: "Unauthorized" };
  const id = formData.get("id") as string;
  const durationDays = parseInt(formData.get("durationDays") as string) || 7;

  if (!id) return { error: "Missing topic ID" };

  const supabase = await createServerSupabaseClient();

  const { data: topic, error: findError } = await supabase
    .from('Topic')
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (findError || !topic) return { error: "Topic not found" };
  if (topic.status !== "UPCOMING") return { error: "Topic is not in UPCOMING status" };

  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + durationDays);

  const { error: updateError } = await supabase
    .from('Topic')
    .update({ status: "ACTIVE", endsAt: endsAt.toISOString() })
    .eq("id", id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true, slug: topic.slug };
}

// ─── Comment Actions ───

export async function createComment(formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const topicId = formData.get("topicId") as string;
  const content = formData.get("content") as string;
  const anonymousId = formData.get("anonymousId") as string;
  const displayName = formData.get("displayName") as string;
  const evidenceUrlsRaw = formData.get("evidenceUrls") as string;
  let evidenceUrls: string[] | undefined;
  if (evidenceUrlsRaw) {
    try {
      evidenceUrls = JSON.parse(evidenceUrlsRaw);
    } catch {
      // silent
    }
  }

  if (!topicId || !content?.trim() || !anonymousId) {
    return { error: "Missing required fields" };
  }

  if (content.trim().length < 2) {
    return { error: "Comment must be at least 2 characters" };
  }

  if (content.trim().length > 2000) {
    return { error: "Comment must be under 2000 characters" };
  }

  const { data: topic, error: topicError } = await supabase
    .from('Topic')
    .select("*")
    .eq("id", topicId)
    .maybeSingle();

  if (topicError || !topic) return { error: "Topic not found" };
  if (topic.status !== "ACTIVE") return { error: "Comments are only allowed on active topics." };

  // Rate limit: max 5 comments in the last minute per anonymousId
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  const { count: recentCount } = await supabase
    .from('Comment')
    .select("*", { count: "exact", head: true })
    .eq("anonymousId", anonymousId)
    .gte("createdAt", oneMinuteAgo);

  if (recentCount && recentCount >= 5) {
    return { error: "You're commenting too fast. Please wait a moment." };
  }

  // Look up linked user for badge code
  let finalDisplayName = displayName;
  let linkedUserId: string | null = null;

  const { data: linkedUser } = await supabase
    .from('User')
    .select("*")
    .filter("linkedIds", "ov", `{${anonymousId}}`)
    .maybeSingle();

  if (linkedUser) {
    linkedUserId = linkedUser.id;
    finalDisplayName = linkedUser.badgeCode;
  }

  if (!finalDisplayName) {
    finalDisplayName = `DET-${anonymousId.substring(0, 4).toUpperCase()}`;
  }

  const { data: comment, error: insertError } = await supabase
    .from('Comment')
    .insert({
      topicId,
      content: content.trim(),
      anonymousId,
      userId: linkedUserId,
      displayName: finalDisplayName,
      evidenceUrls: evidenceUrls && evidenceUrls.length > 0 ? evidenceUrls : null,
    })
    .select()
    .single();

  if (insertError) return { error: insertError.message };

  revalidatePath(`/topic/${topic.slug}`);
  return { success: true, comment };
}

export async function getComments(topicId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('Comment')
    .select("*")
    .eq("topicId", topicId)
    .eq("isFlagged", false)
    .order("createdAt", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// ─── Admin Actions ───

export async function createTopic(formData: FormData) {
  const caller = await getCurrentUser();
  if (!caller || caller.role !== "BUREAU") return { error: "Unauthorized" };
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const evidence = formData.get("evidence") as string;
  const categoryId = formData.get("categoryId") as string;
  const durationDays = parseInt(formData.get("durationDays") as string) || 7;
  const imageUrl = formData.get("imageUrl") as string;
  const adminId = formData.get("adminId") as string;
  const status = (formData.get("status") as string) || "ACTIVE";

  if (!title?.trim() || !description?.trim() || !categoryId) {
    return { error: "Missing required fields" };
  }

  let slug = generateSlug(title);

  const supabase = await createServerSupabaseClient();

  // Ensure slug uniqueness
  const { data: existingSlugs } = await supabase
    .from('Topic')
    .select("slug")
    .like("slug", `${slug}%`);
  if (existingSlugs) {
    const taken = new Set(existingSlugs.map((t: any) => t.slug));
    let counter = 1;
    while (taken.has(slug)) {
      slug = `${generateSlug(title)}-${counter}`;
      counter++;
    }
  }

  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + durationDays);

  const { error: insertError } = await supabase
    .from('Topic')
    .insert({
      title: title.trim(),
      slug,
      description: description.trim(),
      evidence: evidence?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      durationDays: status === "UPCOMING" ? 0 : durationDays,
      endsAt:
        status === "UPCOMING"
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : endsAt.toISOString(),
      categoryId,
      status,
      createdBy: adminId || null,
    });

  if (insertError) return { error: insertError.message };

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true, slug };
}

export async function concludeTopic(formData: FormData) {
  const caller = await getCurrentUser();
  if (!caller || caller.role !== "BUREAU") return { error: "Unauthorized" };
  const id = formData.get("id") as string;
  const verdict = formData.get("verdict") as string;
  const summary = formData.get("summary") as string;

  if (!id || !verdict) return { error: "Missing required fields" };
  if (!["SOLVED", "CONFIRMED", "UNSOLVED"].includes(verdict)) {
    return { error: "Invalid verdict" };
  }

  const supabase = await createServerSupabaseClient();

  // Fetch all comments with evidence on this topic
  const { data: comments } = await supabase
    .from('Comment')
    .select("id, evidenceUrls")
    .eq("topicId", id)
    .not("evidenceUrls", "is", null);

  // Clear evidenceUrls from comments (storage was removed)
  const evidenceCommentIds: string[] = [];

  for (const comment of comments || []) {
    if (!comment.evidenceUrls) continue;
    evidenceCommentIds.push(comment.id);
  }

  if (evidenceCommentIds.length > 0) {
    await supabase
      .from('Comment')
      .update({ evidenceUrls: null })
      .in("id", evidenceCommentIds);
  }

  // Update topic
  const { data: topic, error: updateError } = await supabase
    .from('Topic')
    .update({
      status: "CONCLUDED",
      verdict,
      summary: summary?.trim() || null,
      endsAt: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) return { error: updateError.message };

  revalidatePath("/");
  revalidatePath(`/topic/${topic.slug}`);
  revalidatePath("/admin");
  return { success: true };
}

export async function deleteComment(formData: FormData) {
  const caller = await getCurrentUser();
  if (!caller || caller.role !== "BUREAU") return { error: "Unauthorized" };
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing comment ID" };

  const supabase = await createServerSupabaseClient();

  // Evidence URLs are stored as-is (storage removed)
  // Just delete the comment
  await supabase.from('Comment').delete().eq("id", id);
  revalidatePath("/admin/comments");
  return { success: true };
}

export async function toggleFlagComment(formData: FormData) {
  const caller = await getCurrentUser();
  if (!caller || caller.role !== "BUREAU") return { error: "Unauthorized" };
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing comment ID" };

  const supabase = await createServerSupabaseClient();

  const { data: comment } = await supabase
    .from('Comment')
    .select("isFlagged")
    .eq("id", id)
    .maybeSingle();

  if (!comment) return { error: "Comment not found" };

  await supabase
    .from('Comment')
    .update({ isFlagged: !comment.isFlagged })
    .eq("id", id);

  revalidatePath("/admin/comments");
  return { success: true };
}

export async function getStats() {
  const supabase = await createServerSupabaseClient();

  const [
    { count: topics },
    { count: activeTopics },
    { count: concludedTopics },
    { count: upcomingTopics },
    { count: totalComments },
    { count: flagged },
  ] = await Promise.all([
    supabase.from('Topic').select("*", { count: "exact", head: true }),
    supabase.from('Topic').select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.from('Topic').select("*", { count: "exact", head: true }).eq("status", "CONCLUDED"),
    supabase.from('Topic').select("*", { count: "exact", head: true }).eq("status", "UPCOMING"),
    supabase.from('Comment').select("*", { count: "exact", head: true }),
    supabase.from('Comment').select("*", { count: "exact", head: true }).eq("isFlagged", true),
  ]);

  return {
    totalTopics: topics ?? 0,
    activeTopics: activeTopics ?? 0,
    concludedTopics: concludedTopics ?? 0,
    upcomingTopics: upcomingTopics ?? 0,
    totalComments: totalComments ?? 0,
    flaggedComments: flagged ?? 0,
  };
}

export async function getFlaggedComments() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('Comment')
    .select('*, Topic(title, slug)')
    .eq("isFlagged", true)
    .order("createdAt", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getAllComments() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('Comment')
    .select('*, Topic(title, slug)')
    .order("createdAt", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data || [];
}
