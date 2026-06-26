"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Timer } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface UpcomingTopic {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: { name: string; color: string };
  _count: { votes: number };
}

interface PromoteSectionProps {
  topics: UpcomingTopic[];
}

export function PromoteSection({ topics }: PromoteSectionProps) {
  const router = useRouter();
  const [promoting, setPromoting] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});

  const handlePromote = async (topicId: string) => {
    setPromoting(topicId);
    const formData = new FormData();
    formData.append("id", topicId);
    formData.append("durationDays", String(durations[topicId] || 7));

    try {
      const res = await fetch("/api/admin/promote", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPromoting(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/20">
          <Sparkles className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Pending Topics</h3>
          <p className="text-sm text-zinc-400">
            {topics.length} topic{topics.length > 1 ? "s" : ""} with votes — promote to active investigation
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {topics.map((topic) => (
          <div
            key={topic.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  className="text-[10px]"
                  style={{
                    backgroundColor: `${topic.category.color}15`,
                    borderColor: `${topic.category.color}30`,
                    color: topic.category.color,
                  }}
                >
                  {topic.category.name}
                </Badge>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {topic._count.votes} votes
                </span>
              </div>
              <h4 className="text-sm font-medium text-white truncate">
                {topic.title}
              </h4>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Timer className="w-3.5 h-3.5" />
                <select
                  value={durations[topic.id] || 7}
                  onChange={(e) =>
                    setDurations((prev) => ({
                      ...prev,
                      [topic.id]: parseInt(e.target.value),
                    }))
                  }
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-300 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={10}>10 days</option>
                  <option value={14}>14 days</option>
                  <option value={21}>21 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
              <button
                onClick={() => handlePromote(topic.id)}
                disabled={promoting === topic.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all disabled:opacity-50"
              >
                {promoting === topic.id ? (
                  "Promoting..."
                ) : (
                  <>
                    Promote <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
