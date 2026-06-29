import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const caller = await getCurrentUser();
    if (!caller || caller.role !== "BUREAU") {
      return NextResponse.json({ error: "Unauthorized — Bureau access required" }, { status: 403 });
    }

    const { id, durationDays: durationParam } = await request.json();
    const durationDays = parseInt(durationParam) || 7;

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

    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + durationDays);

    await prisma.topic.update({
      where: { id },
      data: {
        status: "ACTIVE",
        durationDays,
        endsAt,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin");

    return NextResponse.json({ success: true, slug: topic.slug });
  } catch (e) {
    console.error("Promote topic error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
