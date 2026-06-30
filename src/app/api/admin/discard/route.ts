import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const caller = await getCurrentUser();
    if (!caller || caller.role !== "BUREAU") {
      return NextResponse.json({ error: "Unauthorized — Bureau access required" }, { status: 403 });
    }

    const formData = await request.formData();
    const id = formData.get("id") as string;

    if (!id) {
      return NextResponse.json({ error: "Missing topic ID" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: topic } = await supabase
      .from('Topic')
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    if (topic.status !== "UPCOMING") {
      return NextResponse.json({ error: "Topic is not in UPCOMING status" }, { status: 400 });
    }

    // Delete votes first (foreign key constraint)
    await supabase.from('Vote').delete().eq("topicId", id);

    // Delete comments
    await supabase.from('Comment').delete().eq("topicId", id);

    // Delete the topic
    await supabase.from('Topic').delete().eq("id", id);

    revalidatePath("/");
    revalidatePath("/admin");

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Discard topic error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
