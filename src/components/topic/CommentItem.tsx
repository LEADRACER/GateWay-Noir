"use client";

import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { Fingerprint, User } from "lucide-react";

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

  // Parse badge code from displayName
  const badgeParts = comment.displayName?.split("-") || [];
  const badgePrefix = badgeParts[0] || "";
  const badgeSuffix = badgeParts[1] || "";
  const hasBadge = badgePrefix && badgeSuffix;

  // Role colors based on prefix
  const roleConfig = hasBadge
    ? badgePrefix === "BRU"
      ? { label: "BUREAU", color: "text-amber-300", border: "border-amber-500/30", bg: "bg-amber-500/10" }
      : badgePrefix === "AGT"
        ? { label: "FIELD AGENT", color: "text-amber-500", border: "border-amber-600/25", bg: "bg-amber-600/8" }
        : { label: "DETECTIVE", color: "text-zinc-400", border: "border-zinc-500/20", bg: "bg-zinc-500/5" }
    : { label: "WITNESS", color: "text-zinc-500", border: "border-zinc-600/15", bg: "bg-zinc-600/5" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      className="group flex gap-2.5 p-3 hover:bg-[rgba(168,144,112,0.02)] transition-colors duration-150"
    >
      {/* Badge Avatar */}
      <div
        className={`w-7 h-7 flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5 ${hasBadge ? roleConfig.bg : ""}`}
        style={{ backgroundColor: !hasBadge ? `hsl(${hue}, 30%, 15%)` : undefined }}
      >
        {hasBadge ? (
          <Fingerprint className={`w-3.5 h-3.5 ${roleConfig.color}`} />
        ) : (
          <User className="w-3 h-3 text-zinc-500" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          {hasBadge ? (
            <>
              <span className={`text-[11px] font-mono font-bold tracking-wider ${roleConfig.color}`}>
                {comment.displayName}
              </span>
              <span className={`text-[8px] typewriter-label px-1.5 py-0.5 rounded ${roleConfig.bg} ${roleConfig.color} border ${roleConfig.border}`}>
                {roleConfig.label}
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px] font-mono text-zinc-500 font-bold">
                {comment.displayName || "UNKNOWN"}
              </span>
              <span className="case-number">{roleConfig.label}</span>
            </>
          )}
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
