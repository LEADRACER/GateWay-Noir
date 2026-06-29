"use client";

import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { User } from "lucide-react";

interface CommentItemProps {
  comment: {
    id: string;
    displayName: string;
    anonymousId: string;
    content: string;
    createdAt: string;
    evidenceUrls?: string[];
  };
  index: number;
}

export function CommentItem({ comment, index }: CommentItemProps) {
  const hue = hashCode(comment.anonymousId) % 360;
  const color = `hsl(${hue}, 40%, 45%)`;

  // Determine role label from badge code
  const isAgent = comment.displayName?.startsWith("AGT");
  const isBureau = comment.displayName?.startsWith("BRU");
  const roleLabel = isBureau ? "BUREAU" : isAgent ? "FIELD AGENT" : "WITNESS";
  const badgeColor = isBureau ? "text-[#fbbf24]" : isAgent ? "text-[#d97706]" : "text-zinc-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      className="group flex gap-2.5 p-3 hover:bg-[rgba(168,144,112,0.02)] transition-colors duration-150"
    >
      {/* Witness Avatar */}
      <div
        className="w-6 h-6 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5 opacity-50"
        style={{ backgroundColor: color }}
      >
        <User className="w-3 h-3" />
      </div>

      {/* Testimony Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-xs font-mono font-bold ${badgeColor}`}>
            {comment.displayName || "UNKNOWN"}
          </span>
          <span className="case-number">{roleLabel}</span>
          <span className="case-number">{formatDate(comment.createdAt)}</span>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap break-words">
          {comment.content}
        </p>

        {/* Evidence thumbnails */}
        {comment.evidenceUrls && comment.evidenceUrls.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {comment.evidenceUrls.map((url: string, i: number) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative group"
              >
                {url.startsWith("http") ? (
                  <div className="w-20 h-20 flex items-center justify-center rounded border border-[rgba(168,144,112,0.08)] hover:border-[#d97706]/30 transition-colors cursor-pointer bg-[#0a0a0c]">
                    <span className="text-[8px] text-zinc-600 typewriter-label text-center px-1 break-all">
                      {url.includes("drive.google.com") ? "GDRIVE" : `IMG-${i + 1}`}
                    </span>
                  </div>
                ) : (
                  <img
                    src={url}
                    alt={`Evidence ${i + 1}`}
                    className="w-20 h-20 object-cover rounded border border-[rgba(168,144,112,0.08)] hover:border-[#d97706]/30 transition-colors cursor-pointer"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded flex items-center justify-center">
                  <span className="text-[7px] text-white/0 group-hover:text-white/70 typewriter-label">
                    VIEW
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
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
