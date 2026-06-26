"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Flag, AlertTriangle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { deleteComment, toggleFlagComment } from "@/lib/actions";
import toast from "react-hot-toast";

interface Comment {
  id: string;
  displayName: string;
  content: string;
  isFlagged: boolean;
  createdAt: string | Date;
  topic: { title: string; slug: string };
}

interface CommentsPanelProps {
  allComments: Comment[];
  flaggedComments: Comment[];
}

export function CommentsPanel({ allComments, flaggedComments }: CommentsPanelProps) {
  const [tab, setTab] = useState<"flagged" | "all">("flagged");

  async function handleDelete(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    const result = await deleteComment(formData);
    if (result.success) {
      toast.success("Comment deleted");
    } else {
      toast.error("Failed to delete");
    }
  }

  async function handleFlag(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    const result = await toggleFlagComment(formData);
    if (result.success) {
      toast.success("Toggled flag");
    } else {
      toast.error("Failed to update");
    }
  }

  const comments = tab === "flagged" ? flaggedComments : allComments;

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setTab("flagged")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === "flagged"
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "text-zinc-500 hover:text-zinc-300 border border-transparent"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />
          Flagged ({flaggedComments.length})
        </button>
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === "all"
              ? "bg-zinc-800 text-zinc-200 border border-zinc-700"
              : "text-zinc-500 hover:text-zinc-300 border border-transparent"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 inline mr-1.5" />
          All ({allComments.length})
        </button>
      </div>

      {/* List */}
      {comments.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No {tab === "flagged" ? "flagged" : ""} comments to review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-zinc-200">{comment.displayName}</span>
                    <span className="text-xs text-zinc-600">{formatDate(comment.createdAt)}</span>
                    {comment.isFlagged && (
                      <Badge variant="verdict" verdict="INCONCLUSIVE" className="text-[10px]">
                        <Flag className="w-2.5 h-2.5" /> Flagged
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 mb-2">{comment.content}</p>
                  <p className="text-xs text-violet-500">
                    on <span className="hover:underline">{comment.topic.title}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFlag(comment.id)}
                    title="Toggle flag"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(comment.id)}
                    title="Delete"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
