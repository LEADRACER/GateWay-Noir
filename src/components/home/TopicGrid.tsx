"use client";

import { motion } from "framer-motion";
import { TopicCard } from "./TopicCard";
import { FolderOpen } from "lucide-react";

interface TopicGridProps {
  topics: any[];
}

export function TopicGrid({ topics }: TopicGridProps) {
  if (topics.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] p-6 text-center"
      >
        <FolderOpen className="w-5 h-5 text-zinc-800 mx-auto mb-1" />
        <p className="text-zinc-700 text-[10px] typewriter-label">NO CASES IN THIS DIVISION</p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {topics.map((topic, i) => (
        <TopicCard key={topic.id} topic={topic} index={i} />
      ))}
    </div>
  );
}
