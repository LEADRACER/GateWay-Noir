import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Runs two cleanup operations:
 * 1. Auto-conclude ACTIVE topics whose endsAt < now()
 * 2. Permanently delete CONCLUDED topics whose endsAt < now() - 7 days
 *
 * Call from a cron job (e.g. every hour).
 */
export async function processTopicTimeouts() {
  const supabase = await createServerSupabaseClient();
  const now = new Date().toISOString();

  const results = {
    autoConcluded: 0,
    autoDeleted: 0,
    errors: [] as string[],
  };

  // ──────────────────────────────────────────────
  // 1. Auto-conclude expired ACTIVE topics
  // ──────────────────────────────────────────────
  const { data: expiredActive, error: fetchActiveError } = await supabase
    .from('Topic')
    .select("id, slug, title")
    .eq("status", "ACTIVE")
    .lt("endsAt", now);

  if (fetchActiveError) {
    results.errors.push(`Fetch expired active: ${fetchActiveError.message}`);
  } else if (expiredActive && expiredActive.length > 0) {
    const ids = expiredActive.map((t) => t.id);

    const { error: concludeError } = await supabase
      .from('Topic')
      .update({
        status: "CONCLUDED",
        verdict: "UNSOLVED",
        summary: "Case timed out — no verdict was delivered before the deadline.",
        endsAt: now,
      })
      .in("id", ids);

    if (concludeError) {
      results.errors.push(`Conclude: ${concludeError.message}`);
    } else {
      results.autoConcluded = expiredActive.length;

      // Revalidate paths for each concluded topic
      for (const topic of expiredActive) {
        revalidatePath(`/topic/${topic.slug}`);
      }
    }
  }

  // ──────────────────────────────────────────────
  // 2. Delete concluded topics past their 7-day window
  // ──────────────────────────────────────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: expiredConcluded, error: fetchConcludedError } = await supabase
    .from('Topic')
    .select("id")
    .eq("status", "CONCLUDED")
    .lt("endsAt", sevenDaysAgo.toISOString());

  if (fetchConcludedError) {
    results.errors.push(`Fetch expired concluded: ${fetchConcludedError.message}`);
  } else if (expiredConcluded && expiredConcluded.length > 0) {
    const ids = expiredConcluded.map((t) => t.id);

    // Delete votes first (FK constraint)
    const { error: deleteVotesError } = await supabase
      .from('Vote')
      .delete()
      .in("topicId", ids);
    if (deleteVotesError) {
      results.errors.push(`Delete votes: ${deleteVotesError.message}`);
    }

    // Delete comments
    const { error: deleteCommentsError } = await supabase
      .from('Comment')
      .delete()
      .in("topicId", ids);
    if (deleteCommentsError) {
      results.errors.push(`Delete comments: ${deleteCommentsError.message}`);
    }

    // Delete topics
    const { error: deleteTopicsError } = await supabase
      .from('Topic')
      .delete()
      .in("id", ids);
    if (deleteTopicsError) {
      results.errors.push(`Delete topics: ${deleteTopicsError.message}`);
    }

    results.autoDeleted = ids.length;
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/announcements");

  return results;
}
