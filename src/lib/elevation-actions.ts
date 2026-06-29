"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateBadgeCode, reprefixBadgeCode } from "@/lib/badge";

export async function requestElevation(userId: string, message?: string) {
  if (!userId) return { error: "Missing user ID" };

  // Check if user already has a pending request
  const existing = await prisma.elevationRequest.findFirst({
    where: { userId, status: "PENDING" },
  });
  if (existing) return { error: "You already have a pending elevation request" };

  // Check user role
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };
  if (user.role !== "DETECTIVE") return { error: "Only DETECTIVE users can request elevation" };
  if (!user.passwordHash) return { error: "Set a passcode before requesting elevation" };

  const request = await prisma.elevationRequest.create({
    data: { userId, message: message?.trim() || null, status: "PENDING" },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, request };
}

export async function getPendingElevations() {
  return prisma.elevationRequest.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { badgeCode: true, displayName: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getApprovedElevations() {
  return prisma.elevationRequest.findMany({
    where: { status: "APPROVED" },
    include: { user: { select: { badgeCode: true, displayName: true, createdAt: true } } },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
}

export async function getRejectedElevations() {
  return prisma.elevationRequest.findMany({
    where: { status: "REJECTED" },
    include: { user: { select: { badgeCode: true, displayName: true, createdAt: true } } },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
}

export async function getMyElevationStatus(userId: string) {
  if (!userId) return null;
  return prisma.elevationRequest.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Approve a DETECTIVE → AGENT elevation request.
 * Preserves the user's existing badge suffix (DET-XXXX → AGT-XXXX).
 */
export async function approveElevation(requestId: string, adminId: string) {
  if (!requestId) return { error: "Missing request ID" };

  const request = await prisma.elevationRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });
  if (!request) return { error: "Request not found" };
  if (request.status !== "PENDING") return { error: "Request already processed" };

  // Preserve suffix: DET-XXXX → AGT-XXXX
  const newBadgeCode = await generateBadgeCode("AGENT", request.user.badgeCode);

  // Update user role and badge code
  await prisma.user.update({
    where: { id: request.userId },
    data: { role: "AGENT", badgeCode: newBadgeCode, handler: adminId },
  });

  // Mark request as approved
  await prisma.elevationRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED", adminId },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, newBadgeCode };
}

export async function rejectElevation(requestId: string, adminNote?: string) {
  if (!requestId) return { error: "Missing request ID" };

  const request = await prisma.elevationRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) return { error: "Request not found" };
  if (request.status !== "PENDING") return { error: "Request already processed" };

  await prisma.elevationRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", adminNote: adminNote?.trim() || null },
  });

  revalidatePath("/admin");
  return { success: true };
}
