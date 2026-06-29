"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Archive, ChevronLeft, ChevronRight, Inbox, Megaphone, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface ConcludedTopic {
  id: string;
  title: string;
  slug: string;
  verdict: string;
  summary: string | null;
  category: { name: string; color: string };
}

interface UpcomingTopic {
  id: string;
  title: string;
  slug: string;
  category: { name: string; color: string };
  _count: { votes: number };
}

interface AnnouncementsSidebarProps {
  concludedTopics: ConcludedTopic[];
  upcomingTopics: UpcomingTopic[];
}

export function AnnouncementsSidebar({ concludedTopics, upcomingTopics }: AnnouncementsSidebarProps) {
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Auto-rotate carousel
  useEffect(() => {
    if (upcomingTopics.length <= 1) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % upcomingTopics.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [upcomingTopics.length]);

  const currentPending = upcomingTopics[carouselIndex];

  return (
    <aside className="space-y-3">
      {/* Announcements Header */}
      <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] sidebar-glow">
        <div className="h-0.5 evidence-tape" />
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
              <span className="text-[10px] font-semibold text-zinc-500 typewriter-label">ANNOUNCEMENTS</span>
            </div>
            <Link
              href="/announcements"
              className="text-[8px] text-zinc-600 hover:text-[#d97706] transition-colors typewriter-label flex items-center gap-0.5"
            >
              VIEW ALL
              <ArrowRight className="w-2 h-2" />
            </Link>
          </div>

          {/* Concluded Cases Ticker */}
          {concludedTopics.length > 0 ? (
            <div className="space-y-1.5">
              {concludedTopics.slice(0, 3).map((topic) => (
                <Link
                  key={topic.id}
                  href={`/topic/${topic.slug}`}
                  className="block p-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.04)] hover:border-[#d97706]/30 transition-all duration-200 group pixelated-amber-hover"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <Badge
                      className="text-[7px]"
                      style={{
                        backgroundColor: `${topic.category.color}10`,
                        borderColor: `${topic.category.color}20`,
                        color: topic.category.color,
                      }}
                    >
                      {topic.category.name}
                    </Badge>
                    <Badge variant="verdict" verdict={topic.verdict} className="text-[7px]">
                      {topic.verdict}
                    </Badge>
                  </div>
                  <p className="text-[9px] text-zinc-500 group-hover:text-zinc-300 transition-colors leading-snug line-clamp-1">
                    {topic.title}
                  </p>
                </Link>
              ))}
              {concludedTopics.length > 3 && (
                <p className="text-[8px] text-zinc-700 typewriter-label text-center">
                  +{concludedTopics.length - 3} MORE CONCLUDED
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 bg-[#0a0a0c] border border-[rgba(168,144,112,0.04)] text-center">
              <Archive className="w-4 h-4 text-zinc-800 mx-auto mb-1" />
              <p className="text-[8px] text-zinc-700 typewriter-label">NO VERDICTS YET</p>
            </div>
          )}
        </div>
      </div>

      {/* Pending Cases Carousel */}
      {upcomingTopics.length > 0 && (
        <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] sidebar-glow-urgent">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Inbox className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
                <span className="text-[10px] font-semibold text-zinc-500 typewriter-label">PENDING</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCarouselIndex((prev) => (prev - 1 + upcomingTopics.length) % upcomingTopics.length)}
                  className="p-0.5 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="case-number text-zinc-700">{carouselIndex + 1}/{upcomingTopics.length}</span>
                <button
                  onClick={() => setCarouselIndex((prev) => (prev + 1) % upcomingTopics.length)}
                  className="p-0.5 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Carousel Item */}
            {currentPending && (
              <div className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.04)] p-2 hover:border-[#d97706]/30 transition-all duration-200 pixelated-amber-hover">
                <div className="flex items-center justify-between mb-1">
                  <Badge
                    className="text-[7px]"
                    style={{
                      backgroundColor: `${currentPending.category.color}10`,
                      borderColor: `${currentPending.category.color}20`,
                      color: currentPending.category.color,
                    }}
                  >
                    {currentPending.category.name}
                  </Badge>
                  <span className="case-number text-zinc-700">
                    <span className="status-dot pending mr-1" />
                    {currentPending._count.votes} TIPS
                  </span>
                </div>
                <p className="text-[9px] text-zinc-400 leading-snug line-clamp-2">
                  {currentPending.title}
                </p>
                {/* Carousel Dots */}
                <div className="flex items-center justify-center gap-1 mt-2">
                  {upcomingTopics.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCarouselIndex(i)}
                      className={`w-1 h-1 transition-colors ${
                        i === carouselIndex ? "bg-[#d97706]" : "bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
