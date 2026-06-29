import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

// GET /api/agent/discussions — list all open discussions (AGT+ only)
export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "AGENT" && user.role !== "BUREAU")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const discussions = await prisma.agentDiscussion.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { badgeCode: true, displayName: true } },
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ discussions });
}

// POST /api/agent/discussions — create a new discussion (AGT+ only)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "AGENT" && user.role !== "BUREAU")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { title, description } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const discussion = await prisma.agentDiscussion.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      createdById: user.id,
    },
    include: {
      createdBy: { select: { badgeCode: true, displayName: true } },
    },
  });

  return NextResponse.json({ discussion }, { status: 201 });
}
