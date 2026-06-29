import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const topicId = formData.get("topicId") as string;
    const anonymousId = formData.get("anonymousId") as string;

    if (!topicId || !anonymousId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.vote.findUnique({
      where: { topicId_anonymousId: { topicId, anonymousId } },
    });

    if (existing) {
      await prisma.vote.delete({ where: { id: existing.id } });
      revalidatePath("/");
      return NextResponse.json({ success: true, voted: false, votes: await prisma.vote.count({ where: { topicId } }) });
    }

    await prisma.vote.create({
      data: { topicId, anonymousId },
    });

    revalidatePath("/");
    return NextResponse.json({ success: true, voted: true, votes: await prisma.vote.count({ where: { topicId } }) });
  } catch (e) {
    console.error("Vote error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
