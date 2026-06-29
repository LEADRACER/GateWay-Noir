"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { generateSlug } from "./utils";

// ─── Topic Actions ───

export async function getTopics(categorySlug?: string, status?: string) {
  return prisma.topic.findMany({
    where: {
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      ...(status ? { status } : { status: "ACTIVE" }),
    },
    include: { category: true, _count: { select: { comments: true, votes: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUpcomingTopics() {
  return prisma.topic.findMany({
    where: { status: "UPCOMING" },
    include: {
      category: true,
      _count: { select: { votes: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActiveAndConcludedTopics(categorySlug?: string) {
  const where: any = {
    status: { in: ["ACTIVE", "CONCLUDED"] },
  };
  if (categorySlug) {
    where.category = { slug: categorySlug };
  }
  return prisma.topic.findMany({
    where,
    include: { category: true, _count: { select: { comments: true, votes: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getConcludedTopics() {
  return prisma.topic.findMany({
    where: { status: "CONCLUDED" },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTopicBySlug(slug: string) {
  return prisma.topic.findUnique({
    where: { slug },
    include: {
      category: true,
      comments: { orderBy: { createdAt: "desc" } },
      _count: { select: { votes: true } },
    },
  });
}

export async function getTopicById(id: string) {
  return prisma.topic.findUnique({
    where: { id },
    include: { category: true, comments: { orderBy: { createdAt: "desc" } } },
  });
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

// ─── Voting Actions ───

export async function voteTopic(formData: FormData) {
  const topicId = formData.get("topicId") as string;
  const anonymousId = formData.get("anonymousId") as string;

  if (!topicId || !anonymousId) return { error: "Missing required fields" };

  const existing = await prisma.vote.findUnique({
    where: { topicId_anonymousId: { topicId, anonymousId } },
  });

  if (existing) {
    // Already voted — remove vote (toggle)
    await prisma.vote.delete({ where: { id: existing.id } });
    revalidatePath("/");
    revalidatePath(`/topic/${(await prisma.topic.findUnique({ where: { id: topicId } }))?.slug}`);
    return { success: true, voted: false };
  }

  await prisma.vote.create({
    data: { topicId, anonymousId },
  });

  revalidatePath("/");
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (topic) revalidatePath(`/topic/${topic.slug}`);
  return { success: true, voted: true };
}

export async function getVoteCount(topicId: string) {
  return prisma.vote.count({ where: { topicId } });
}

export async function hasUserVoted(topicId: string, anonymousId: string) {
  const vote = await prisma.vote.findUnique({
    where: { topicId_anonymousId: { topicId, anonymousId } },
  });
  return !!vote;
}

export async function getUserVotes(anonymousId: string) {
  const votes = await prisma.vote.findMany({
    where: { anonymousId },
    select: { topicId: true },
  });
  return new Set(votes.map((v) => v.topicId));
}

// ─── Promote Upcoming → Active ───

export async function promoteToActive(formData: FormData) {
  const id = formData.get("id") as string;
  const durationDays = parseInt(formData.get("durationDays") as string) || 7;

  if (!id) return { error: "Missing topic ID" };

  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) return { error: "Topic not found" };
  if (topic.status !== "UPCOMING") return { error: "Topic is not in UPCOMING status" };

  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + durationDays);

  await prisma.topic.update({
    where: { id },
    data: {
      status: "ACTIVE",
      durationDays,
      endsAt,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true, slug: topic.slug };
}

// ─── Comment Actions ───

export async function createComment(formData: FormData) {
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

  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) return { error: "Topic not found" };
  if (topic.status !== "ACTIVE") return { error: "Comments are only allowed on active topics." };

  // Rate limit: max 5 comments in the last minute per anonymousId
  const oneMinuteAgo = new Date(Date.now() - 60000);
  const recentCount = await prisma.comment.count({
    where: { anonymousId, createdAt: { gte: oneMinuteAgo } },
  });
  if (recentCount >= 5) {
    return { error: "You're commenting too fast. Please wait a moment." };
  }

  // Look up linked user for badge code
  let finalDisplayName = displayName;
  let linkedUserId: string | null = null;
  try {
    const allUsers = await prisma.user.findMany();
    const linkedUser = allUsers.find((u: any) => {
      try {
        const ids: string[] = JSON.parse(u.linkedIds || "[]");
        return ids.includes(anonymousId);
      } catch { return false; }
    });
    if (linkedUser) {
      linkedUserId = linkedUser.id;
      finalDisplayName = linkedUser.badgeCode; // e.g. DET-A3K9 or AGT-X7M2
    }
  } catch {
    // silent fail
  }

  if (!finalDisplayName) {
    finalDisplayName = `DET-${anonymousId.substring(0, 4).toUpperCase()}`;
  }

  const comment = await prisma.comment.create({
    data: {
      topicId,
      content: content.trim(),
      anonymousId,
      userId: linkedUserId,
      displayName: finalDisplayName,
      evidenceUrls: evidenceUrls && evidenceUrls.length > 0 ? JSON.stringify(evidenceUrls) : null,
    },
  });

  revalidatePath(`/topic/${topic.slug}`);
  return { success: true, comment };
}

export async function getComments(topicId: string) {
  return prisma.comment.findMany({
    where: { topicId, isFlagged: false },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Admin Actions ───

export async function createTopic(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const evidence = formData.get("evidence") as string;
  const categoryId = formData.get("categoryId") as string;
  const durationDays = parseInt(formData.get("durationDays") as string) || 7;
  const imageUrl = formData.get("imageUrl") as string;
  const adminId = formData.get("adminId") as string;
  // If status is provided, use it; otherwise default to ACTIVE (for backward compat)
  const status = (formData.get("status") as string) || "ACTIVE";

  if (!title?.trim() || !description?.trim() || !categoryId) {
    return { error: "Missing required fields" };
  }

  const slug = generateSlug(title);
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + durationDays);

  const topic = await prisma.topic.create({
    data: {
      title: title.trim(),
      slug,
      description: description.trim(),
      evidence: evidence?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      durationDays: status === "UPCOMING" ? 0 : durationDays, // upcoming topics don't need duration
      endsAt: status === "UPCOMING" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : endsAt, // far future for upcoming
      categoryId,
      status,
      createdBy: adminId || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true, slug: topic.slug };
}

export async function concludeTopic(formData: FormData) {
  const id = formData.get("id") as string;
  const verdict = formData.get("verdict") as string;
  const summary = formData.get("summary") as string;

  if (!id || !verdict) return { error: "Missing required fields" };
  if (!["SOLVED", "CONFIRMED", "UNSOLVED"].includes(verdict)) {
    return { error: "Invalid verdict" };
  }

  const topic = await prisma.topic.update({
    where: { id },
    data: {
      status: "CONCLUDED",
      verdict,
      summary: summary?.trim() || null,
      endsAt: new Date(),
    },
  });

  revalidatePath("/");
  revalidatePath(`/topic/${topic.slug}`);
  revalidatePath("/admin");
  return { success: true };
}

export async function deleteComment(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing comment ID" };
  await prisma.comment.delete({ where: { id } });
  revalidatePath("/admin/comments");
  return { success: true };
}

export async function toggleFlagComment(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing comment ID" };
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return { error: "Comment not found" };
  await prisma.comment.update({
    where: { id },
    data: { isFlagged: !comment.isFlagged },
  });
  revalidatePath("/admin/comments");
  return { success: true };
}

export async function getStats() {
  const [topics, activeTopics, concludedTopics, upcomingTopics, totalComments, flagged] = await Promise.all([
    prisma.topic.count(),
    prisma.topic.count({ where: { status: "ACTIVE" } }),
    prisma.topic.count({ where: { status: "CONCLUDED" } }),
    prisma.topic.count({ where: { status: "UPCOMING" } }),
    prisma.comment.count(),
    prisma.comment.count({ where: { isFlagged: true } }),
  ]);

  return {
    totalTopics: topics,
    activeTopics,
    concludedTopics,
    upcomingTopics,
    totalComments,
    flaggedComments: flagged,
  };
}

export async function getFlaggedComments() {
  return prisma.comment.findMany({
    where: { isFlagged: true },
    include: { topic: { select: { title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllComments() {
  return prisma.comment.findMany({
    include: { topic: { select: { title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
