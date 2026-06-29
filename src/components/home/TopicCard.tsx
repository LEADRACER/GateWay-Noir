"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquare, Clock, Fingerprint, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { CountdownTimer } from "@/components/topic/CountdownTimer";
import { useTransition, useState } from "react";

interface TopicCardProps {
  topic: {
    id: string;
    title: string;
    slug: string;
    status: string;
    verdict: string | null;
    endsAt: string;
    _count?: { comments: number; votes: number };
    category: { name: string; color: string };
  };
  index: number;
  initialHasVoted?: boolean;
}

export function TopicCard({ topic, index, initialHasVoted }: TopicCardProps) {
  const isConcluded = topic.status === "CONCLUDED";
  const caseId = `GWN-${topic.id.slice(0, 6).toUpperCase()}`;
  const [hasVoted, setHasVoted] = useState(!!initialHasVoted);
  const [voteCount, setVoteCount] = useState(topic._count?.votes ?? 0);
  const [isPending, startTransition] = useTransition();

  const handleVote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPending) return;

    startTransition(async () => {
      try {
        const anonId = localStorage.getItem("noirgateway_id") || "";
        const res = await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId: topic.id, anonymousId: anonId }),
        });
        if (res.ok) {
          const data = await res.json();
          setHasVoted(data.voted);
          setVoteCount((c) => (data.voted ? c + 1 : c - 1));
        }
      } catch {
        // silent
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
    >
      <Link href={`/topic/${topic.slug}`} className="block group">
        <div className="bg-[#0d0d0f] border border-[rgba(168,144,112,0.06)] hover:border-[#d97706]/30 transition-all duration-200 h-full pixelated-amber-hover">
          {/* Tab strip */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[rgba(168,144,112,0.04)] bg-[#0a0a0c] transition-all duration-200">
            <span className="case-number text-zinc-700">{caseId}</span>
            <Badge
              className="text-[8px]"
              style={{
                backgroundColor: `${topic.category.color}10`,
                borderColor: `${topic.category.color}20`,
                color: topic.category.color,
              }}
            >
              {topic.category.name}
            </Badge>
          </div>

          {/* Content */}
          <div className="p-3">
            <h3 className="text-[11px] font-medium text-zinc-400 leading-snug line-clamp-2 mb-2">
              {topic.title}
            </h3>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1.5 border-t border-[rgba(168,144,112,0.04)]">
              <div className="flex items-center gap-2">
                {!isConcluded && (
                  <button
                    onClick={handleVote}
                    className={`flex items-center gap-0.5 transition-colors ${hasVoted ? "text-[#d97706]" : "text-zinc-700 hover:text-[#d97706]"}`}
                  >
                    <ThumbsUp className="w-2.5 h-2.5" />
                    <span className="case-number">{voteCount}</span>
                  </button>
                )}
                <div className="flex items-center gap-1 text-zinc-700">
                  <MessageSquare className="w-2.5 h-2.5" />
                  <span className="case-number">{topic._count?.comments ?? 0}</span>
                </div>
              </div>

              {isConcluded ? (
                <div className="flex items-center gap-1 text-[8px] text-[#d97706] typewriter-label">
                  <Fingerprint className="w-2.5 h-2.5" />
                  {topic.verdict}
                </div>
              ) : (
                <div className="flex items-center gap-1 text-zinc-700">
                  <Clock className="w-2.5 h-2.5" />
                  <CountdownTimer endsAt={topic.endsAt} />
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
