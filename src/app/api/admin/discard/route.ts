import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string;

    if (!id) {
      return NextResponse.json({ error: "Missing topic ID" }, { status: 400 });
    }

    const topic = await prisma.topic.findUnique({ where: { id } });
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    if (topic.status !== "UPCOMING") {
      return NextResponse.json({ error: "Topic is not in UPCOMING status" }, { status: 400 });
    }

    // Delete votes first (foreign key constraint)
    await prisma.vote.deleteMany({ where: { topicId: id } });

    // Delete comments (defense-in-depth — cascade should handle this, but be explicit)
    await prisma.comment.deleteMany({ where: { topicId: id } });

    // Delete the topic
    await prisma.topic.delete({ where: { id } });

    revalidatePath("/");
    revalidatePath("/admin");

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Discard topic error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
