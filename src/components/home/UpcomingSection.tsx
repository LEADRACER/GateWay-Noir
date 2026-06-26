"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  ChevronUp as VoteIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { getAnonymousId } from "@/lib/anonymous";

interface UpcomingTopic {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: { name: string; color: string };
  _count: { votes: number };
}

interface UpcomingSectionProps {
  topics: UpcomingTopic[];
}

export function UpcomingSection({ topics: initialTopics }: UpcomingSectionProps) {
  const [topics, setTopics] = useState(initialTopics);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [votingIds, setVotingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch user's existing votes on mount
  useEffect(() => {
    const anonId = getAnonymousId();
    if (!anonId || initialTopics.length === 0) {
      setLoading(false);
      return;
    }
    fetch(`/api/user-votes?anonymousId=${anonId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.votes) setUserVotes(new Set(data.votes));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initialTopics.length]);

  const handleVote = useCallback(async (topicId: string) => {
    if (votingIds.has(topicId)) return;
    setVotingIds((prev) => new Set(prev).add(topicId));

    const formData = new FormData();
    formData.append("topicId", topicId);
    formData.append("anonymousId", getAnonymousId());

    try {
      const res = await fetch("/api/vote", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setTopics((prev) =>
          prev.map((t) =>
            t.id === topicId
              ? { ...t, _count: { votes: data.votes ?? t._count.votes + (data.voted ? 1 : -1) } }
              : t
          )
        );
        setUserVotes((prev) => {
          const next = new Set(prev);
          if (data.voted) next.add(topicId);
          else next.delete(topicId);
          return next;
        });
      }
    } catch (e) {
      // silent
    } finally {
      setVotingIds((prev) => {
        const next = new Set(prev);
        next.delete(topicId);
        return next;
      });
    }
  }, [votingIds]);

  if (topics.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Upcoming Topics ({topics.length})
        </h2>
      </div>
      <p className="text-sm text-zinc-500 mb-6">
        Vote for the topics you want investigated next. The most voted topics will be put to the
        community for debate.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {topics.map((topic, i) => {
          const hasVoted = userVotes.has(topic.id);
          const isLoading = votingIds.has(topic.id);
          return (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-300 h-full"
            >
              <div className="p-5 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-3">
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
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/20 text-amber-400 border-amber-500/30">
                    <Sparkles className="w-3 h-3" />
                    UPCOMING
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white mb-2 leading-snug line-clamp-2">
                  {topic.title}
                </h3>
                <p className="text-sm text-zinc-500 mb-4 line-clamp-2 flex-1">
                  {topic.description}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                  <button
                    onClick={() => handleVote(topic.id)}
                    disabled={isLoading}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                      hasVoted
                        ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                        : "bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:border-violet-500/50 hover:text-violet-300 hover:bg-zinc-800"
                    )}
                  >
                    <VoteIcon className={cn("w-4 h-4", isLoading && "animate-bounce")} />
                    <span className="font-semibold">{topic._count.votes}</span>
                    <span className="text-xs">{hasVoted ? "Voted" : "Vote"}</span>
                  </button>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Sparkles className="w-3.5 h-3.5" />
                    Needs votes to launch
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
