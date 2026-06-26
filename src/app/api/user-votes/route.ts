import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const anonymousId = searchParams.get("anonymousId");

  if (!anonymousId) {
    return NextResponse.json({ votes: [] });
  }

  const votes = await prisma.vote.findMany({
    where: { anonymousId },
    select: { topicId: true },
  });

  return NextResponse.json({
    votes: votes.map((v) => v.topicId),
  });
}
