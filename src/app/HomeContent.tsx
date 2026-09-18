"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Search, FolderOpen, Inbox, ChevronUp, FileText, Check, Trash2, X, Command } from "lucide-react";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { TopicGrid } from "@/components/home/TopicGrid";
import { AnnouncementsSidebar } from "@/components/home/AnnouncementsSidebar";
import { getAnonymousId } from "@/lib/anonymous";
import { useBadge } from "@/components/badge/BadgeProvider";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { TopicWithCategory, Category } from "@/lib/types/database";

interface HomeContentProps {
  topics: TopicWithCategory[];
  categories: Category[];
  concludedTopics: Array<TopicWithCategory & { verdict: string | null }>;
  upcomingTopics?: Array<Omit<TopicWithCategory, "verdict"> & { category: { name: string; color: string }; _count?: { votes: number } }>;
}

type UpcomingTopicItem = NonNullable<HomeContentProps["upcomingTopics"]>[number];

export function HomeContent({
  topics: initialTopics,
  categories,
  concludedTopics,
  upcomingTopics: initialUpcoming = [],
}: HomeContentProps) {
  const router = useRouter();
  const { badge } = useBadge();
  const isBureau = badge?.role === "BUREAU";
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [upcomingTopics, setUpcomingTopics] = useState(initialUpcoming);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const votingRef = useRef<Set<string>>(new Set());

  // Restore existing votes on mount
  useEffect(() => {
    const id = getAnonymousId();
    if (!id) return;
    fetch(`/api/user-votes?anonymousId=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.votes?.length) {
          setUserVotes(new Set(data.votes));
        }
      })
      .catch(() => {});
  }, []);

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [discardingId, setDiscardingId] = useState<string | null>(null);
  const [hoveredTopicId, setHoveredTopicId] = useState<string | null>(null);

  const filteredTopics = useMemo(() => {
    let result = initialTopics;
    if (activeCategory) {
      result = result.filter((t: TopicWithCategory) => t.category.slug === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t: TopicWithCategory) =>
          t.title.toLowerCase().includes(q) ||
          (t.description?.toLowerCase() || "").includes(q)
      );
    }
    return result;
  }, [initialTopics, activeCategory, searchQuery]);

  const activeTopics = filteredTopics.filter((t: TopicWithCategory) => t.status === "ACTIVE");

  const handleVote = useCallback(async (topicId: string) => {
    if (votingRef.current.has(topicId)) return;
    votingRef.current.add(topicId);

    const formData = new FormData();
    formData.append("topicId", topicId);
    formData.append("anonymousId", getAnonymousId());

    try {
      const res = await fetch("/api/vote", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setUpcomingTopics((prev) =>
          prev.map((t) => {
            const currentCount = (t as { _count?: { votes: number } })._count?.votes ?? 0;
            return t.id === topicId
              ? { ...t, _count: { votes: (data.votes ?? currentCount) + (data.voted ? 1 : -1) } }
              : t;
          })
        );
        setUserVotes((prev) => {
          const next = new Set(prev);
          if (data.voted) next.add(topicId);
          else next.delete(topicId);
          return next;
        });
      }
    } catch {
      // silent
    } finally {
      votingRef.current.delete(topicId);
    }
  }, []);

  const handleApprove = async (topic: UpcomingTopicItem) => {
    setApprovingId(topic.id);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: topic.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to approve case");
      } else {
        toast.success(`Case activated: ${topic.title}`);
        router.refresh();
      }
    } catch {
      toast.error("Network error — failed to approve");
    }
    setApprovingId(null);
  };

  const handleDiscard = async (topic: UpcomingTopicItem) => {
    if (!confirm(`Discard "${topic.title}"? This cannot be undone.`)) return;
    setDiscardingId(topic.id);
    try {
      const formData = new FormData();
      formData.append("id", topic.id);
      const res = await fetch("/api/admin/discard", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to discard case");
      } else {
        toast.success(`Case discarded: ${topic.title}`);
        router.refresh();
      }
    } catch {
      toast.error("Network error — failed to discard");
    }
    setDiscardingId(null);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* ── Dossier Header ── */}
          <div className="bg-[#111113] border-2 border-[rgba(168,144,112,0.12)] shadow-[0_4px_0_rgba(0,0,0,0.5),0_8px_24px_rgba(0,0,0,0.6)]">
            {/* Tab Strip */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(168,144,112,0.06)]">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
                <span className="text-xs font-semibold text-zinc-400 typewriter-label">CASE FILES</span>
                <span className="case-number text-zinc-600">{activeTopics.length} ACTIVE</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="case-number text-zinc-600">{categories.length} DIVISIONS</span>
              </div>
            </div>

            {/* Search + Filter Bar */}
            <div className="px-4 py-2 border-b border-[rgba(168,144,112,0.06)] bg-[#0a0a0c]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative flex-1 group">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#d97706]/0 via-[#d97706]/5 to-[#d97706]/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[6px]" />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-[#d97706] transition-colors duration-200" />
                  <input
                    type="text"
                    placeholder="Search case files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                        e.preventDefault();
                        e.currentTarget.focus();
                      }
                    }}
                    className="w-full pl-7 pr-10 py-1.5 bg-[#08080a] border border-[rgba(168,144,112,0.08)] text-zinc-400 text-[10px] placeholder-zinc-700 focus:outline-none focus:border-[rgba(217,119,6,0.35)] focus:ring-1 focus:ring-[rgba(217,119,6,0.25)] focus:bg-[#0a0a0c] transition-all duration-200 font-mono"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 rounded transition-all duration-150"
                      aria-label="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <kbd className="absolute right-8 top-1/2 -translate-y-1/2 hidden sm:block px-1.5 py-0.5 text-[7px] font-mono text-zinc-700 bg-zinc-900/50 border border-zinc-800 rounded">
                    <Command className="w-2.5 h-2.5 inline-block align-middle mr-0.5" />K
                  </kbd>
                </div>
                <CategoryFilter
                  categories={categories}
                  selected={activeCategory}
                  onSelect={setActiveCategory}
                />
              </div>
            </div>

            {/* ── ACTIVE INVESTIGATIONS ── */}
            <div className="p-4">
              {activeTopics.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-[rgba(22,163,74,0.15)]">
                    <div className="w-2 h-2 bg-[#16a34a]" />
                    <h3 className="text-[10px] font-semibold text-[#16a34a] typewriter-label tracking-widest">
                      ACTIVE INVESTIGATIONS ({activeTopics.length})
                    </h3>
                    <div className="flex-1 border-t border-[rgba(22,163,74,0.08)]" />
                  </div>
                  <TopicGrid topics={activeTopics} />
                </div>
              )}
            </div>
          </div>

          {/* ── FILE DIVIDER ── */}
          <div className="relative flex items-center gap-3 px-1">
            <div className="flex-1 border-t-2 border-dashed border-[rgba(168,144,112,0.08)]" />
            <FileText className="w-3 h-3 text-zinc-700 rotate-90" />
            <div className="flex-1 border-t-2 border-dashed border-[rgba(168,144,112,0.08)]" />
          </div>

          {/* ── PENDING INTAKE (separate solid dossier) ── */}
          {upcomingTopics.length > 0 && (
            <div className="bg-[#0d0d0f] border-2 border-[rgba(168,144,112,0.08)] shadow-[0_3px_0_rgba(0,0,0,0.4),0_6px_18px_rgba(0,0,0,0.5)]">
              {/* Pending Header Bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b-2 border-[rgba(217,119,6,0.12)] bg-[#0a0a0c]">
                <div className="flex items-center gap-2">
                  <Inbox className="w-3.5 h-3.5 text-[#d97706] opacity-60" />
                  <h3 className="text-[10px] font-semibold text-[#d97706] typewriter-label tracking-widest">
                    PENDING INTAKE ({upcomingTopics.length})
                  </h3>
                  <span className="case-number text-zinc-700">TIP TO PRIORITIZE</span>
                </div>
                <span className="case-number text-zinc-700">
                  <span className="status-dot pending mr-1" />
                  OPEN FOR TIPS
                </span>
              </div>
              {/* Pending Grid */}
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {upcomingTopics.map((topic) => {
                    const hasVoted = userVotes.has(topic.id);
                    return (
<div
                        key={topic.id}
                        className="group relative bg-[#0a0a0c] border-2 border-[rgba(168,144,112,0.06)] shadow-[0_2px_0_rgba(0,0,0,0.3),0_3px_8px_rgba(0,0,0,0.4)] hover:border-[#d97706]/30 transition-all duration-200 pixelated-amber-hover overflow-hidden"
                        onMouseEnter={() => isBureau && setHoveredTopicId(topic.id)}
                        onMouseLeave={() => setHoveredTopicId(null)}
                      >
                        <div className="flex items-center justify-between px-3 py-1.5 border-b-2 border-[rgba(168,144,112,0.04)] bg-[#08080a]">
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[7px] font-medium border-2 typewriter-label"
                            style={{
                              backgroundColor: `${topic.category.color}10`,
                              borderColor: `${topic.category.color}20`,
                              color: topic.category.color,
                            }}
                          >
                            {topic.category.name.toUpperCase()}
                          </span>
                          <span className="case-number text-zinc-700">
                            {(topic as { _count: { votes: number } })._count.votes} TIPS
                          </span>
                        </div>
                        <div className="p-3 relative">
                          <p className="text-[9px] text-zinc-400 leading-snug line-clamp-2 mb-3">
                            {topic.title}
                          </p>
                          {/* Action buttons — absolute overlay on hover (BRU only) */}
                          {isBureau && hoveredTopicId === topic.id && (
                            <div className="absolute inset-x-0 bottom-0 z-10 p-2 animate-in slide-in-from-top-1 duration-150 bg-gradient-to-t from-[#0a0a0c] to-transparent">
                              <div className="bg-[#111113] border border-[rgba(168,144,112,0.12)] rounded p-1.5 flex items-center gap-1">
                                <button
                                  onClick={() => handleApprove(topic)}
                                  disabled={approvingId === topic.id}
                                  className="flex items-center justify-center gap-0.5 px-1.5 py-1 text-[7px] font-mono text-green-400/80 border border-green-500/20 hover:bg-green-500/10 disabled:opacity-30 transition-all shrink-0"
                                >
                                  <Check className="w-2 h-2" />
                                  {approvingId === topic.id ? "..." : "APPROVE"}
                                </button>
                                <button
                                  onClick={() => handleDiscard(topic)}
                                  disabled={discardingId === topic.id}
                                  className="flex items-center justify-center gap-0.5 px-1.5 py-1 text-[7px] font-mono text-red-400/80 border border-red-500/20 hover:bg-red-500/10 disabled:opacity-30 transition-all shrink-0"
                                >
                                  <Trash2 className="w-2 h-2" />
                                  {discardingId === topic.id ? "..." : "DISCARD"}
                                </button>
                                <button
                                  onClick={() => handleVote(topic.id)}
                                  className={cn(
                                    "flex items-center justify-center gap-0.5 px-1.5 py-1 text-[7px] font-mono transition-all duration-200 typewriter-label border",
                                    hasVoted
                                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                                      : "text-[#d97706]/80 border-[#d97706]/30 hover:bg-[#d97706]/10"
                                  )}
                                >
                                  <ChevronUp className="w-2.5 h-2.5" />
                                  {hasVoted ? "TIPPED" : "TIP"}
                                </button>
                              </div>
                            </div>
                          )}
                          {!isBureau && (
                            <button
                              onClick={() => handleVote(topic.id)}
                              className={cn(
                                "w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[9px] font-medium transition-all duration-200 typewriter-label border-2",
                                hasVoted
                                  ? "bg-black/40 text-white border-white/20 shadow-[0_1px_0_rgba(255,255,255,0.1)]"
                                  : "bg-black/20 text-white/70 border-white/10 hover:bg-black/30 hover:border-white/20"
                              )}
                            >
                              <ChevronUp className="w-2.5 h-2.5" />
                              {hasVoted ? "TIPPED" : "TIP THIS CASE"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {activeTopics.length === 0 && upcomingTopics.length === 0 && (
            <div className="bg-[#111113] border-2 border-[rgba(168,144,112,0.12)] shadow-[0_4px_0_rgba(0,0,0,0.5),0_8px_24px_rgba(0,0,0,0.6)] p-8 text-center">
              <FolderOpen className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
              <p className="text-zinc-600 text-xs typewriter-label">NO CASES FOUND</p>
            </div>
          )}
        </div>

        {/* Announcements Sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <AnnouncementsSidebar
            concludedTopics={concludedTopics}
            upcomingTopics={upcomingTopics}
          />
        </div>
      </div>
    </div>
  );
}
