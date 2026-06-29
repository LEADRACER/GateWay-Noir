"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MessageSquare, RefreshCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";
import { getAnonymousId, getDisplayName } from "@/lib/anonymous";
import { useBadge } from "@/components/badge/BadgeProvider";
import { extractSuffix } from "@/lib/badge-cookie";

interface CommentSectionProps {
  topicId: string;
  initialComments: any[];
  isConcluded: boolean;
}

export function CommentSection({ topicId, initialComments, isConcluded }: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const { badge } = useBadge();

  useEffect(() => {
    setAnonymousId(getAnonymousId());
    setDisplayName(getDisplayName());
  }, []);

  // Use badge code as display name when badge is claimed
  const effectiveDisplayName = badge ? badge.badgeCode : displayName;

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
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
          <h2 className="text-xs font-semibold text-zinc-400 typewriter-label tracking-wide">
            WITNESS STATEMENTS ({comments.length})
          </h2>
        </div>
        <Button variant="ghost" size="sm" onClick={refreshComments}>
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      {isConcluded ? (
        <div className="mb-4 p-3 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] text-center">
          <p className="text-xs text-zinc-600 typewriter-label">CASE CLOSED — NO FURTHER TESTIMONY</p>
        </div>
      ) : (
        <CommentForm
          topicId={topicId}
          anonymousId={anonymousId}
          displayName={effectiveDisplayName}
          onCommentAdded={refreshComments}
        />
      )}

      <hr className="file-divider" />

      {comments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <MessageSquare className="w-5 h-5 text-zinc-800 mx-auto mb-2" />
          <p className="text-zinc-600 text-xs">No statements yet. Be the first to testify.</p>
        </motion.div>
      ) : (
        <div className="divide-y divide-[rgba(168,144,112,0.06)]">
          {comments.map((comment: any, i: number) => (
            <CommentItem key={comment.id} comment={comment} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
