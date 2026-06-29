"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Search, FolderOpen, Inbox, ChevronUp } from "lucide-react";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { TopicGrid } from "@/components/home/TopicGrid";
import { AnnouncementsSidebar } from "@/components/home/AnnouncementsSidebar";
import { getAnonymousId } from "@/lib/anonymous";
import { cn } from "@/lib/utils";

interface HomeContentProps {
  topics: any[];
  categories: any[];
  concludedTopics: any[];
  upcomingTopics?: any[];
}

export function HomeContent({
  topics: initialTopics,
  categories,
  concludedTopics,
  upcomingTopics: initialUpcoming = [],
}: HomeContentProps) {
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

  const filteredTopics = useMemo(() => {
    let result = initialTopics;
    if (activeCategory) {
      result = result.filter((t: any) => t.category.slug === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t: any) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [initialTopics, activeCategory, searchQuery]);

  const activeTopics = filteredTopics.filter((t: any) => t.status === "ACTIVE");

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
    } catch {
      // silent
    } finally {
      votingRef.current.delete(topicId);
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Dossier Header */}
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)]">
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
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
                  <input
                    type="text"
                    placeholder="Search case files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-3 py-1 bg-[#08080a] border border-[rgba(168,144,112,0.08)] text-zinc-400 text-[10px] placeholder-zinc-700 focus:outline-none focus:border-[rgba(217,119,6,0.2)] transition-all font-mono"
                  />
                </div>
                <CategoryFilter
                  categories={categories}
                  selected={activeCategory}
                  onSelect={setActiveCategory}
                />
              </div>
            </div>

            {/* Content Area */}
            <div className="p-4">
              {/* Active Investigations */}
              {activeTopics.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 bg-[#16a34a]" />
                    <h3 className="text-[10px] font-semibold text-[#d97706] typewriter-label">
                      ACTIVE INVESTIGATIONS ({activeTopics.length})
                    </h3>
                  </div>
                  <TopicGrid topics={activeTopics} />
                </div>
              )}

              {/* Pending Cases (shown below active with vote buttons) */}
              {upcomingTopics.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Inbox className="w-3 h-3 text-[#d97706] opacity-50" />
                    <h3 className="text-[10px] font-semibold text-[#d97706] typewriter-label">
                      PENDING INTAKE ({upcomingTopics.length})
                    </h3>
                    <span className="case-number text-zinc-700">TIP TO PRIORITIZE</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {upcomingTopics.map((topic: any) => {
                      const hasVoted = userVotes.has(topic.id);
                      return (
                        <div
                          key={topic.id}
                          className="bg-[#0d0d0f] border border-[rgba(168,144,112,0.06)] hover:border-[#d97706]/30 transition-all duration-200 pixelated-amber-hover"
                        >
                          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[rgba(168,144,112,0.04)] bg-[#0a0a0c]">
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[7px] font-medium border typewriter-label"
                              style={{
                                backgroundColor: `${topic.category.color}10`,
                                borderColor: `${topic.category.color}20`,
                                color: topic.category.color,
                              }}
                            >
                              {topic.category.name.toUpperCase()}
                            </span>
                            <span className="case-number text-zinc-700">
                              <span className="status-dot pending mr-1" />
                              {topic._count.votes} TIPS
                            </span>
                          </div>
                          <div className="p-3">
                            <p className="text-[9px] text-zinc-400 leading-snug line-clamp-2 mb-2">
                              {topic.title}
                            </p>
                            <button
                              onClick={() => handleVote(topic.id)}
                              className={cn(
                                "w-full flex items-center justify-center gap-1.5 px-2 py-1 text-[9px] font-medium transition-all duration-200 typewriter-label",
                                hasVoted
                                  ? "bg-black/30 text-white border border-white/20"
                                  : "bg-black/20 text-white/70 border border-white/10 hover:bg-black/30"
                              )}
                            >
                              <ChevronUp className="w-2.5 h-2.5" />
                              {hasVoted ? "TIPPED" : "TIP"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTopics.length === 0 && upcomingTopics.length === 0 && (
                <div className="text-center py-12">
                  <FolderOpen className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                  <p className="text-zinc-600 text-xs typewriter-label">NO CASES FOUND</p>
                </div>
              )}
            </div>
          </div>
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
