"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Timer, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

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
  const [discarding, setDiscarding] = useState<string | null>(null);
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

  const handleDiscard = async (topicId: string) => {
    if (!confirm("Discard this pending case? This cannot be undone.")) return;
    setDiscarding(topicId);
    const formData = new FormData();
    formData.append("id", topicId);

    try {
      const res = await fetch("/api/admin/discard", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDiscarding(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111113] border border-[rgba(168,144,112,0.08)]"
    >
      <div className="h-0.5 evidence-tape" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-7 h-7 bg-[rgba(217,119,6,0.08)] border border-[rgba(217,119,6,0.12)]">
            <Sparkles className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
          </div>
          <div>
            <h3 className="text-zinc-300 font-semibold typewriter-label text-xs">PENDING CASES</h3>
            <p className="text-[10px] text-zinc-600">
              {topics.length} case{topics.length > 1 ? "s" : ""} with tips — promote to active investigation
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Badge
                    className="text-[9px]"
                    style={{
                      backgroundColor: `${topic.category.color}12`,
                      borderColor: `${topic.category.color}25`,
                      color: topic.category.color,
                    }}
                  >
                    {topic.category.name}
                  </Badge>
                  <span className="case-number">
                    <span className="status-dot pending mr-1" />
                    {topic._count.votes} TIPS
                  </span>
                </div>
                <h4 className="text-xs font-medium text-zinc-400 truncate">
                  {topic.title}
                </h4>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <Timer className="w-3 h-3 text-zinc-600" />
                  <select
                    value={durations[topic.id] || 7}
                    onChange={(e) =>
                      setDurations((prev) => ({
                        ...prev,
                        [topic.id]: parseInt(e.target.value),
                      }))
                    }
                    className="bg-[#08080a] border border-[rgba(168,144,112,0.08)] px-1.5 py-0.5 text-zinc-400 text-[10px] focus:outline-none focus:border-[rgba(217,119,6,0.2)]"
                  >
                    <option value={3}>3d</option>
                    <option value={7}>7d</option>
                    <option value={10}>10d</option>
                    <option value={14}>14d</option>
                    <option value={21}>21d</option>
                    <option value={30}>30d</option>
                  </select>
                </div>
                <button
                  onClick={() => handleDiscard(topic.id)}
                  disabled={discarding === topic.id}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-[#dc2626]/10 text-[#dc2626] border border-[#dc2626]/15 hover:bg-[#dc2626]/20 typewriter-label disabled:opacity-40"
                  title="Discard this pending case"
                >
                  {discarding === topic.id ? (
                    "..."
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
                <button
                  onClick={() => handlePromote(topic.id)}
                  disabled={promoting === topic.id}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-[#d97706] text-black typewriter-label disabled:opacity-40"
                >
                  {promoting === topic.id ? "..." : "PROMOTE"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
