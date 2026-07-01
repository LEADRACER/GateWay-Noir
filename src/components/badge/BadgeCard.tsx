"use client";

import { getDataURL, downloadBadgeSVG } from "@/lib/badge-image";
import type { BadgeUser } from "@/lib/badge-client";

interface BadgeCardProps {
  badge: BadgeUser;
  showDownload?: boolean;
  className?: string;
}

export function BadgeCard({ badge, showDownload = false, className = "" }: BadgeCardProps) {
  const dataUrl = getDataURL({
    badgeCode: badge.badgeCode,
    displayName: badge.displayName,
    role: badge.role as "DETECTIVE" | "AGENT" | "BUREAU",
    phone: badge.phone,
    stats: {
      votes: badge.voteCount ?? 0,
      comments: badge.commentCount ?? 0,
    },
  });

  const handleDownload = () => {
    downloadBadgeSVG({
      badgeCode: badge.badgeCode,
      displayName: badge.displayName,
      role: badge.role as "DETECTIVE" | "AGENT" | "BUREAU",
      phone: badge.phone,
      stats: {
        votes: badge.voteCount ?? 0,
        comments: badge.commentCount ?? 0,
      },
    });
  };

  return (
    <div className={`inline-block ${className}`}>
      <img
        src={dataUrl}
        alt={`${badge.badgeCode} — ${badge.displayName}`}
        className="w-full max-w-[320px] h-auto block"
      />
      {showDownload && (
        <button
          onClick={handleDownload}
          className="mt-2 w-full py-2 text-[10px] font-medium bg-[#d97706]/15 border border-[#d97706]/30 text-[#d97706] typewriter-label hover:bg-[#d97706]/25 transition-all"
        >
          SAVE BADGE SVG
        </button>
      )}
    </div>
  );
}
