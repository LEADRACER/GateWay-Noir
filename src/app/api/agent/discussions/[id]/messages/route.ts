import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

// GET /api/agent/discussions/[id]/messages — get messages for a discussion
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== "AGENT" && user.role !== "BUREAU")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const discussion = await prisma.agentDiscussion.findUnique({
    where: { id },
    select: { id: true, title: true, description: true, isOpen: true, createdById: true, updatedAt: true, createdAt: true },
  });
  if (!discussion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await prisma.agentDiscussionMessage.findMany({
    where: { discussionId: id },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { badgeCode: true, displayName: true, role: true } },
    },
  });

  return NextResponse.json({ discussion, messages });
}

// POST /api/agent/discussions/[id]/messages — post a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== "AGENT" && user.role !== "BUREAU")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const discussion = await prisma.agentDiscussion.findUnique({
    where: { id },
    select: { isOpen: true },
  });
  if (!discussion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!discussion.isOpen) {
    return NextResponse.json({ error: "Discussion is closed" }, { status: 400 });
  }

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (content.trim().length > 5000) {
    return NextResponse.json({ error: "Message too long (max 5000 chars)" }, { status: 400 });
  }

  const message = await prisma.agentDiscussionMessage.create({
    data: {
      discussionId: id,
      content: content.trim(),
      userId: user.id,
    },
    include: {
      user: { select: { badgeCode: true, displayName: true, role: true } },
    },
  });

  // Touch the discussion's updatedAt
  await prisma.agentDiscussion.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ message }, { status: 201 });
}
