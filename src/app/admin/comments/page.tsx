import { getAllComments, getFlaggedComments, deleteComment, toggleFlagComment } from "@/lib/actions";
import { CommentsPanel } from "./CommentsPanel";

export const dynamic = "force-dynamic";

export default async function CommentsPage() {
  const [allComments, flaggedComments] = await Promise.all([
    getAllComments(),
    getFlaggedComments(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Comment Moderation</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {flaggedComments.length} flagged · {allComments.length} total
        </p>
      </div>

      <CommentsPanel allComments={allComments} flaggedComments={flaggedComments} />
    </div>
  );
}
