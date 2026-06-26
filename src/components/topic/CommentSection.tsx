"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";
import { getAnonymousId, getDisplayName } from "@/lib/anonymous";

interface CommentSectionProps {
  topicId: string;
  initialComments: any[];
  isConcluded: boolean;
}

export function CommentSection({ topicId, initialComments, isConcluded }: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    setAnonymousId(getAnonymousId());
    setDisplayName(getDisplayName());
  }, []);

  const refreshComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?topicId=${topicId}`);
      const data = await res.json();
      if (data.comments) setComments(data.comments);
    } catch {
      // silent fail
    }
  }, [topicId]);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-semibold text-white">
            Discussion ({comments.length})
          </h2>
        </div>
        <Button variant="ghost" size="sm" onClick={refreshComments}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {isConcluded ? (
        <div className="mb-6 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
          <p className="text-sm text-zinc-500">This topic is concluded. Comments are closed.</p>
        </div>
      ) : (
        <CommentForm
          topicId={topicId}
          anonymousId={anonymousId}
          displayName={displayName}
          onCommentAdded={refreshComments}
        />
      )}

      {/* Divider */}
      <div className="border-t border-zinc-800/50 mb-4" />

      {/* Comments List */}
      {comments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No comments yet. Be the first to share your thoughts.</p>
        </motion.div>
      ) : (
        <div className="divide-y divide-zinc-800/30">
          {comments.map((comment: any, i: number) => (
            <CommentItem key={comment.id} comment={comment} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
