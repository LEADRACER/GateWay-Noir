"use client";

import { BureauHQ } from "@/components/hq/BureauHQ";
import { ElevationsPanel } from "./ElevationsPanel";
import { PromoteSection } from "./PromoteSection";
import { Scale, MessageSquare } from "lucide-react";
import Link from "next/link";

interface StatsData {
  totalTopics: number;
  activeTopics: number;
  upcomingTopics: number;
  totalComments: number;
  flaggedComments: number;
}

interface Topic {
  id: string;
  title: string;
  slug: string;
  status: string;
  createdAt: string;
}

interface ElevationRequest {
  id: string;
  userId: string;
  adminId: string | null;
  requestedRole: string;
  status: string;
  message: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  user: { badgeCode: string; displayName: string; createdAt: string };
}

interface AgentUser {
  id: string;
  badgeCode: string;
  displayName: string;
  bio: string | null;
  phone: string | null;
  handler: string | null;
  createdAt: string;
}

interface BureauContentProps {
  stats: StatsData;
  upcomingTopics: Topic[];
  pendingElevations: ElevationRequest[];
  approvedElevations: ElevationRequest[];
  rejectedElevations: ElevationRequest[];
  adminId?: string;
  adminBadgeCode: string;
  agents: AgentUser[];
}

export function BureauContent({ stats, upcomingTopics, pendingElevations, approvedElevations, rejectedElevations, adminId, adminBadgeCode, agents }: BureauContentProps) {
  return (
    <BureauHQ stats={stats}>
      {/* Dashboard tab content — rendered below stats */}
      <div className="space-y-3">
        {/* Elevation requests inline on dashboard */}
        <ElevationsPanel
          pendingElevations={pendingElevations}
          approvedElevations={approvedElevations}
          rejectedElevations={rejectedElevations}
          adminId={adminId}
          adminBadgeCode={adminBadgeCode}
          defaultTab="elevations"
        />

        {/* AGT → BRU promotion */}
        <PromoteSection agents={agents} adminId={adminId || ""} adminBadgeCode={adminBadgeCode} />

        {/* Pending cases */}
        {upcomingTopics.length > 0 && (
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4">
            <h3 className="text-xs font-semibold text-zinc-300 mb-3 typewriter-label">UPCOMING CASES</h3>
            <div className="space-y-1">
              {upcomingTopics.map((topic) => (
                <div key={topic.id} className="flex items-center gap-2 px-2 py-1.5 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] rounded">
                  <span className="text-[10px] text-zinc-400 truncate flex-1">{topic.title}</span>
                  <span className="text-[9px] text-amber-400/70 typewriter-label">{topic.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Link
            href="/admin/topics/new"
            className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-4 rounded group hover:border-[rgba(168,144,112,0.18)] transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
              <h3 className="text-zinc-300 font-semibold typewriter-label text-xs group-hover:text-zinc-100 transition-colors">
                + NEW CASE FILE
              </h3>
            </div>
            <p className="text-[10px] text-zinc-600">Open a new investigation for the bureau</p>
          </Link>
          <Link
            href="/admin/comments"
            className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-4 rounded group hover:border-[rgba(168,144,112,0.18)] transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
              <h3 className="text-zinc-300 font-semibold typewriter-label text-xs group-hover:text-zinc-100 transition-colors">
                MODERATE TESTIMONY
              </h3>
            </div>
            <p className="text-[10px] text-zinc-600">{stats.flaggedComments} flagged statements</p>
          </Link>
        </div>
      </div>
    </BureauHQ>
  );
}
