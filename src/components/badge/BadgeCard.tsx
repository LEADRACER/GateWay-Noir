"use client";

import { useState, useEffect } from "react";
import { getDataURL, downloadBadgeSVG, generateBadgeQR } from "@/lib/badge-image";
import type { BadgeUser } from "@/lib/badge-client";

interface BadgeCardProps {
  badge: BadgeUser;
  showDownload?: boolean;
  showQR?: boolean;
  className?: string;
}

export function BadgeCard({ badge, showDownload = false, showQR = false, className = "" }: BadgeCardProps) {
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

  const [qrSvg, setQrSvg] = useState<string | null>(null);

  useEffect(() => {
    if (!showQR) return;
    generateBadgeQR(badge.badgeCode).then(setQrSvg).catch(() => {});
  }, [showQR, badge.badgeCode]);

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
      <div className="flex gap-3 items-start">
        <img
          src={dataUrl}
          alt={`${badge.badgeCode} — ${badge.displayName}`}
          className="w-auto h-[280px] block"
        />
        {showQR && qrSvg && (
          <div className="flex flex-col items-center gap-1">
            <div dangerouslySetInnerHTML={{ __html: qrSvg }} className="w-[100px] h-[100px]" />
            <span className="text-[8px] text-zinc-500 typewriter-label">SCAN VERIFY</span>
          </div>
        )}
      </div>
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
