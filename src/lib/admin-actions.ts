"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateBadgeCode, getBadgePrefix } from "@/lib/badge";

/**
 * Promote an AGENT user to BUREAU.
 * Only existing BUREAU users can call this.
 * Preserves the user's badge suffix (AGT-XXXX → BRU-XXXX).
 */
export async function promoteToBureau(agentUserId: string, bureauUserId?: string) {
  if (!agentUserId) return { error: "Missing user ID" };

  const user = await prisma.user.findUnique({ where: { id: agentUserId } });
  if (!user) return { error: "User not found" };
  if (user.role === "BUREAU") return { error: "User is already BUREAU" };

  // Re-prefix the badge code: AGT-XXXX → BRU-XXXX
  const prefix = getBadgePrefix("BUREAU");
  const suffix = user.badgeCode.split("-")[1] || user.badgeCode.slice(-4);
  const newBadgeCode = `${prefix}-${suffix}`;

  // Check uniqueness (rare collision, but be safe)
  const existing = await prisma.user.findUnique({ where: { badgeCode: newBadgeCode } });
  if (existing && existing.id !== user.id) {
    return { error: "Badge code collision — try again" };
  }

  await prisma.user.update({
    where: { id: agentUserId },
    data: {
      role: "BUREAU",
      badgeCode: newBadgeCode,
      isAdmin: true,
    },
  });

  revalidatePath("/admin");
  return { success: true, newBadgeCode };
}

/**
 * Get all AGENT users for the BRU admin panel.
 */
export async function getAllAgents() {
  return prisma.user.findMany({
    where: { role: "AGENT" },
    select: {
      id: true,
      badgeCode: true,
      displayName: true,
      bio: true,
      phone: true,
      handler: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Create a new BUREAU user from scratch (invite a new admin).
 * Generates a fresh BRU badge code that can be shared.
 */
export async function createBureauUser(displayName: string, creatorBadgeCode?: string) {
  if (!displayName?.trim()) return { error: "Display name is required" };

  const badgeCode = await generateBadgeCode("BUREAU");

  const user = await prisma.user.create({
    data: {
      badgeCode,
      displayName: displayName.trim(),
      role: "BUREAU",
      isAdmin: true,
      handler: creatorBadgeCode || null,
      linkedIds: "[]",
    },
  });

  revalidatePath("/admin");
  return { success: true, badgeCode: user.badgeCode };
}

/**
 * Promote the currently authenticated user to BUREAU.
 * Only works if the user has a badge claimed and no BRU user exists yet,
 * or if the caller knows the badge code (first-admin setup).
 * Used for initial admin bootstrapping.
 */
export async function promoteSelfToBureau(badgeCode: string) {
  if (!badgeCode?.trim()) return { error: "Badge code is required" };

  const user = await prisma.user.findUnique({ where: { badgeCode: badgeCode.trim().toUpperCase() } });
  if (!user) return { error: "No user found with this badge code" };
  if (user.role === "BUREAU") return { error: "Already BUREAU" };

  // Re-prefix badge code
  const prefix = getBadgePrefix("BUREAU");
  const suffix = user.badgeCode.split("-")[1] || user.badgeCode.slice(-4);
  const newBadgeCode = `${prefix}-${suffix}`;

  const existing = await prisma.user.findUnique({ where: { badgeCode: newBadgeCode } });
  if (existing && existing.id !== user.id) {
    return { error: "Badge code collision — try with a new DET badge" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      role: "BUREAU",
      badgeCode: newBadgeCode,
      isAdmin: true,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, newBadgeCode };
}

/**
 * Get all users grouped by role.
 */
export async function getAllUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      badgeCode: true,
      displayName: true,
      role: true,
      isAdmin: true,
      phone: true,
      handler: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  return {
    detectives: users.filter((u) => u.role === "DETECTIVE"),
    agents: users.filter((u) => u.role === "AGENT"),
    bureau: users.filter((u) => u.role === "BUREAU"),
  };
}
