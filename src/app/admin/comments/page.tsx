import { getAllComments, getFlaggedComments, deleteComment, toggleFlagComment } from "@/lib/actions";
import { CommentsPanel } from "./CommentsPanel";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CommentsPage() {
  const [allComments, flaggedComments] = await Promise.all([
    getAllComments(),
    getFlaggedComments(),
  ]);

  return (
    <div>
      <div className="case-file rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-amber-500" />
          <span className="typewriter-label text-amber-400/60">Witness Moderation</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">Testimony Review</h1>
        <p className="text-sm text-zinc-500">
          {flaggedComments.length} flagged · {allComments.length} total statements
        </p>
      </div>

      <CommentsPanel allComments={allComments} flaggedComments={flaggedComments} />
    </div>
  );
}
