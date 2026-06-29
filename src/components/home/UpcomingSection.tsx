"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronUp as VoteIcon, FileText, Inbox } from "lucide-react";
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

  useEffect(() => {
    const anonId = getAnonymousId();
    if (!anonId || initialTopics.length === 0) return;
    fetch(`/api/user-votes?anonymousId=${anonId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.votes) setUserVotes(new Set(data.votes));
      })
      .catch(() => {});
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
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-2">
        <Inbox className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
        <h2 className="text-[10px] font-semibold text-zinc-500 typewriter-label">
          PENDING INTAKE ({topics.length})
        </h2>
        <span className="case-number text-zinc-700">TIP TO PRIORITIZE</span>
      </div>

      {/* Pending Cases Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
        {topics.map((topic, i) => {
          const hasVoted = userVotes.has(topic.id);
          const isLoading = votingIds.has(topic.id);
          return (
            <div
              key={topic.id}
              className="bg-[#0d0d0f] border border-[rgba(168,144,112,0.06)] hover:border-[#d97706]/30 transition-all duration-200 pixelated-amber-hover"
            >
              {/* Tab */}
              <div className="flex items-center justify-between px-2 py-1 border-b border-[rgba(168,144,112,0.04)] bg-[#0a0a0c]">
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
                <span className="case-number text-zinc-700">
                  <span className="status-dot pending mr-1" />
                  {topic._count.votes} TIPS
                </span>
              </div>

              {/* Content */}
              <div className="p-2">
                <h3 className="text-[10px] font-medium text-zinc-400 leading-snug line-clamp-2 mb-2 group-hover:text-white transition-colors duration-200">
                  {topic.title}
                </h3>
                <button
                  onClick={() => handleVote(topic.id)}
                  disabled={isLoading}
                  className={cn(
                    "w-full flex items-center justify-center gap-1.5 px-2 py-1 text-[9px] font-medium transition-colors typewriter-label",
                    hasVoted
                      ? "bg-[#d97706] text-black"
                      : "bg-[#111113] text-zinc-500 border border-[rgba(168,144,112,0.08)] hover:border-[rgba(217,119,6,0.15)]"
                  )}
                >
                  <VoteIcon className={cn("w-2.5 h-2.5", isLoading && "animate-bounce")} />
                  {hasVoted ? "TIPPED" : "TIP TO INVESTIGATE"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
