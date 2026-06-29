"use server";

import { prisma } from "@/lib/prisma";

export async function updateAgentProfile(userId: string, data: { displayName?: string; bio?: string; phone?: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };
  if (user.role === "DETECTIVE") return { error: "Only AGENT+ users have profiles" };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      displayName: data.displayName?.trim() || undefined,
      bio: data.bio?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
    },
  });

  return { success: true, user: updated };
}

export async function getAgentProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      badgeCode: true,
      displayName: true,
      role: true,
      bio: true,
      phone: true,
      handler: true,
      createdAt: true,
      _count: { select: { votes: true, comments: true } },
    },
  });
  if (!user) return null;

  // Get handler info if exists
  let handlerInfo = null;
  if (user.handler) {
    const handler = await prisma.user.findUnique({
      where: { badgeCode: user.handler },
      select: { badgeCode: true, displayName: true },
    });
    if (handler) handlerInfo = handler;
  }

  // Get task counts
  const taskCounts = await prisma.agentTask.groupBy({
    by: ["status"],
    where: { agentId: userId },
    _count: true,
  });

  const taskStatusCounts: Record<string, number> = {};
  taskCounts.forEach((t: any) => {
    taskStatusCounts[t.status] = t._count;
  });

  return {
    ...user,
    handlerInfo,
    voteCount: user._count?.votes || 0,
    commentCount: user._count?.comments || 0,
    taskCounts: taskStatusCounts,
  };
}
