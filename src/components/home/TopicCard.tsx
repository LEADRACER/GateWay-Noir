"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquare, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CountdownTimer } from "@/components/topic/CountdownTimer";
import { generateColor } from "@/lib/utils";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <Link href={`/topic/${topic.slug}`} className="block group">
        <Card hover className="h-full">
          <CardContent className="flex flex-col h-full p-5">
            {/* Category + Status */}
            <div className="flex items-center justify-between mb-3">
              <Badge
                className="text-[10px] uppercase tracking-wider font-semibold"
                style={{
                  backgroundColor: `${topic.category.color}15`,
                  borderColor: `${topic.category.color}30`,
                  color: topic.category.color,
                }}
              >
                {topic.category.name}
              </Badge>
              <Badge variant={isConcluded ? "verdict" : "status"} status={topic.status} verdict={topic.verdict}>
                {isConcluded ? topic.verdict : "ACTIVE"}
              </Badge>
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-white mb-2 leading-snug group-hover:text-violet-300 transition-colors duration-200 line-clamp-2">
              {topic.title}
            </h3>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/50">
              <div className="flex items-center gap-2 text-zinc-500">
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-xs">{topic._count?.comments ?? 0}</span>
              </div>

              {isConcluded ? (
                <div className="flex items-center gap-1.5 text-xs text-violet-400">
                  View Verdict
                  <ArrowRight className="w-3 h-3" />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Clock className="w-3 h-3" />
                  <CountdownTimer endsAt={topic.endsAt} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
