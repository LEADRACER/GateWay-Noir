"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Scale, Search } from "lucide-react";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { TopicGrid } from "@/components/home/TopicGrid";
import { UpcomingSection } from "@/components/home/UpcomingSection";

interface HomeContentProps {
  topics: any[];
  categories: any[];
  upcomingTopics?: any[];
}

export function HomeContent({
  topics,
  categories,
  upcomingTopics = [],
}: HomeContentProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTopics = useMemo(() => {
    let result = topics;
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
  }, [topics, activeCategory, searchQuery]);

  const activeTopics = filteredTopics.filter((t: any) => t.status === "ACTIVE");
  const concludedTopics = filteredTopics.filter(
    (t: any) => t.status === "CONCLUDED"
  );

  return (
    <>
      {/* Upcoming Topics Section — shown before the main topic grid */}
      <UpcomingSection topics={upcomingTopics} />

      <section id="topics" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">All Myths</h2>
            <p className="text-sm text-zinc-500 mt-1">
              {topics.length} topics across {categories.length} categories
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              type="text"
              placeholder="Search myths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
          </div>
        </div>

        <div className="mb-8">
          <CategoryFilter
            categories={categories}
            selected={activeCategory}
            onSelect={setActiveCategory}
          />
        </div>

        {activeTopics.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Active Investigations ({activeTopics.length})
              </h3>
            </div>
            <TopicGrid topics={activeTopics} />
          </div>
        )}

        {concludedTopics.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-2 h-2 rounded-full bg-zinc-600" />
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Concluded ({concludedTopics.length})
              </h3>
            </div>
            <TopicGrid topics={concludedTopics} />
          </div>
        )}

        {(activeTopics.length === 0 && concludedTopics.length === 0) && (
          <div className="text-center py-20">
            <Scale className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">No topics found matching your filters.</p>
          </div>
        )}
      </section>
    </>
  );
}
