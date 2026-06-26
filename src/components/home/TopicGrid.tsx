"use client";

import { motion } from "framer-motion";
import { TopicCard } from "./TopicCard";

interface TopicGridProps {
  topics: any[];
}

export function TopicGrid({ topics }: TopicGridProps) {
  if (topics.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-zinc-300 mb-2">No myths found</h3>
        <p className="text-zinc-500 text-sm">Try a different category or check back later for new topics.</p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {topics.map((topic, i) => (
        <TopicCard key={topic.id} topic={topic} index={i} />
      ))}
    </div>
  );
}
