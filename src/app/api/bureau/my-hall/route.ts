import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !["DETECTIVE", "AGENT", "BUREAU"].includes(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  // Get all bureaus ordered by creation
  const { data: bureaus } = await supabase
    .from("User")
    .select("id, badgeCode, displayName, handler, createdAt")
    .eq("role", "BUREAU")
    .order("createdAt", { ascending: true });

  if (!bureaus || bureaus.length === 0) {
    return NextResponse.json({ hallNumber: null, bureauId: null });
  }

  let hallNumber: number | null = null;
  let bureauId: string | null = null;

  if (user.role === "BUREAU") {
    // Find this bureau's index
    const bureauIndex = bureaus.findIndex((b) => b.id === user.id);
    if (bureauIndex !== -1) {
      hallNumber = Math.floor(bureauIndex / 3) + 1;
      bureauId = user.id;
    }
  } else if (user.role === "AGENT" && user.handler) {
    // Find which bureau this agent's handler belongs to
    const handlerBureau = bureaus.find((b) => b.id === user.handler);
    if (handlerBureau) {
      const bureauIndex = bureaus.findIndex((b) => b.id === handlerBureau.id);
      hallNumber = Math.floor(bureauIndex / 3) + 1;
      bureauId = handlerBureau.id;
    }
  }

  return NextResponse.json({ hallNumber, bureauId });
}