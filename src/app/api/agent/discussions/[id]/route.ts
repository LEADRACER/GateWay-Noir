import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

// PATCH /api/agent/discussions/[id] — close/resolve a discussion
export async function PATCH(
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
  });
  if (!discussion) {
    return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
  }

  // Only creator or BRU can close
  if (discussion.createdById !== user.id && user.role !== "BUREAU") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.agentDiscussion.update({
    where: { id },
    data: {
      isOpen: body.isOpen ?? discussion.isOpen,
    },
  });

  return NextResponse.json({ discussion: updated });
}
