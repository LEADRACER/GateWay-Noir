"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquare, Clock, Fingerprint } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { CountdownTimer } from "@/components/topic/CountdownTimer";

interface TopicCardProps {
  topic: {
    id: string;
    title: string;
    slug: string;
    status: string;
    verdict: string | null;
    endsAt: string;
    _count?: { comments: number };
    category: { name: string; color: string };
  };
  index: number;
}

export function TopicCard({ topic, index }: TopicCardProps) {
  const isConcluded = topic.status === "CONCLUDED";
  const caseId = `GWN-${topic.id.slice(0, 6).toUpperCase()}`;

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
              <div className="flex items-center gap-1 text-zinc-700">
                <MessageSquare className="w-2.5 h-2.5" />
                <span className="case-number">{topic._count?.comments ?? 0}</span>
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
