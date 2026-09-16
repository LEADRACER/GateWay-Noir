import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  // Verify task exists and user has access
  const { data: task } = await supabase
    .from('AgentTask')
    .select("agentId")
    .eq("id", id)
    .maybeSingle();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (user.role !== "BUREAU" && task.agentId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data: evidence, error } = await supabase
    .from('AgentTaskEvidence')
    .select("*")
    .eq("taskId", id)
    .order("dayNumber", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load evidence" }, { status: 500 });
  }

  return NextResponse.json({ evidence: evidence || [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const requestBody = body as Record<string, unknown>;
  const dayNumber = typeof requestBody.dayNumber === "number" ? requestBody.dayNumber : 0;
  const content = typeof requestBody.content === "string" ? requestBody.content.trim() : "";
  const evidenceUrls = Array.isArray(requestBody.evidenceUrls)
    ? requestBody.evidenceUrls.filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    : [];

  if (dayNumber < 1) {
    return NextResponse.json({ error: "Day number must be >= 1" }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Verify task exists and user is the assigned agent
  const { data: task } = await supabase
    .from('AgentTask')
    .select("agentId")
    .eq("id", id)
    .maybeSingle();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.agentId !== user.id) {
    return NextResponse.json({ error: "Only the assigned agent can add evidence" }, { status: 403 });
  }

  // Upsert evidence
  const { data: existing } = await supabase
    .from('AgentTaskEvidence')
    .select("id")
    .eq("taskId", id)
    .eq("agentId", user.id)
    .eq("dayNumber", dayNumber)
    .maybeSingle();

  let evidence;
  let error;

  if (existing) {
    const result = await supabase
      .from('AgentTaskEvidence')
      .update({
        content,
        evidenceUrls,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    evidence = result.data;
    error = result.error;
  } else {
    const result = await supabase
      .from('AgentTaskEvidence')
      .insert({
        taskId: id,
        agentId: user.id,
        dayNumber,
        content,
        evidenceUrls,
      })
      .select()
      .single();
    evidence = result.data;
    error = result.error;
  }

  if (error) {
    return NextResponse.json({ error: "Failed to save evidence" }, { status: 500 });
  }

  return NextResponse.json({ evidence }, { status: 201 });
}