"use client";

import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";

interface CommentItemProps {
  comment: {
    id: string;
    displayName: string;
    anonymousId: string;
    content: string;
    createdAt: string;
  };
  index: number;
}

export function CommentItem({ comment, index }: CommentItemProps) {
  // Generate consistent color from anonymousId
  const hue = hashCode(comment.anonymousId) % 360;
  const color = `hsl(${hue}, 65%, 55%)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="group flex gap-3 p-4 rounded-xl hover:bg-zinc-900/50 transition-colors duration-200"
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ring-2 ring-white/10"
        style={{ backgroundColor: color }}
      >
        {comment.displayName.substring(comment.displayName.length - 2)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-zinc-200">{comment.displayName}</span>
          <span className="text-[10px] text-zinc-600">{formatDate(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>
    </motion.div>
  );
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}
