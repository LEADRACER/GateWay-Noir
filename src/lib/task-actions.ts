"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createTask(agentId: string, adminId: string, title: string, description?: string) {
  if (!agentId || !title?.trim()) return { error: "Missing required fields" };

  const task = await prisma.agentTask.create({
    data: {
      agentId,
      adminId,
      title: title.trim(),
      description: description?.trim() || null,
      status: "PENDING",
    },
  });

  revalidatePath("/admin/tasks");
  revalidatePath("/agent/tasks");
  return { success: true, task };
}

export async function getAgentTasks(agentId: string) {
  if (!agentId) return [];
  return prisma.agentTask.findMany({
    where: { agentId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function getAllTasks() {
  return prisma.agentTask.findMany({
    include: {
      agent: { select: { badgeCode: true, displayName: true } },
      admin: { select: { badgeCode: true, displayName: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function updateTaskStatus(taskId: string, status: string) {
  if (!taskId) return { error: "Missing task ID" };
  if (!["PENDING", "IN_PROGRESS", "COMPLETED"].includes(status)) {
    return { error: "Invalid status" };
  }

  const data: any = { status };
  if (status === "COMPLETED") {
    data.completedAt = new Date();
  }

  const task = await prisma.agentTask.update({
    where: { id: taskId },
    data,
  });

  revalidatePath("/admin/tasks");
  revalidatePath("/agent/tasks");
  return { success: true, task };
}
