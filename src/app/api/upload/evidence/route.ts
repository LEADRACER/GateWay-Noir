import { NextRequest, NextResponse } from "next/server";
import { uploadEvidence } from "@/lib/supabase-storage";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("evidence") as File[];

    const urls: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 5 * 1024 * 1024) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const url = await uploadEvidence(buffer);
      urls.push(url);
    }

    return NextResponse.json({ urls });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
