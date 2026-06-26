import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get("topicId");

  if (!topicId) {
    return NextResponse.json({ error: "topicId required" }, { status: 400 });
  }

  const comments = await prisma.comment.findMany({
    where: { topicId, isFlagged: false },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ comments });
}
