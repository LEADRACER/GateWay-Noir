"use client";

import { BureauHQ } from "@/components/hq/BureauHQ";
import { ElevationsPanel } from "./ElevationsPanel";
import { PromoteSection } from "./PromoteSection";
import { Scale, MessageSquare, Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [processing, setProcessing] = useState<Record<string, "approve" | "discard" | null>>({});

  const handleApprove = async (topic: Topic) => {
    setProcessing((p) => ({ ...p, [topic.id]: "approve" }));
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: topic.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to approve case");
      }
      router.refresh();
    } catch {
      alert("Network error");
    }
  };

  const handleDiscard = async (topic: Topic) => {
    if (!confirm(`Discard "${topic.title}"? This cannot be undone.`)) return;
    setProcessing((p) => ({ ...p, [topic.id]: "discard" }));
    try {
      const formData = new FormData();
      formData.append("id", topic.id);
      const res = await fetch("/api/admin/discard", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to discard case");
      }
      router.refresh();
    } catch {
      alert("Network error");
    }
  };

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
              {upcomingTopics.map((topic) => {
                const busy = !!processing[topic.id];
                return (
                  <div key={topic.id} className="flex items-center gap-2 px-2 py-1.5 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] rounded group">
                    <Link
                      href={`/admin/topics/${topic.id}`}
                      className="text-[10px] text-zinc-400 truncate flex-1 hover:text-zinc-200 transition-colors"
                    >
                      {topic.title}
                    </Link>
                    <span className="text-[9px] text-amber-400/70 typewriter-label mr-1">{topic.status}</span>
                    <button
                      onClick={() => handleApprove(topic)}
                      disabled={busy}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-[9px] font-mono text-green-400/80 border border-green-500/20 hover:bg-green-500/10 disabled:opacity-30 transition-all"
                      title="Approve & activate this case"
                    >
                      <Check className="w-2.5 h-2.5" />
                      {processing[topic.id] === "approve" ? "..." : "APPROVE"}
                    </button>
                    <button
                      onClick={() => handleDiscard(topic)}
                      disabled={busy}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-[9px] font-mono text-red-400/80 border border-red-500/20 hover:bg-red-500/10 disabled:opacity-30 transition-all"
                      title="Discard this case"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      {processing[topic.id] === "discard" ? "..." : "DISCARD"}
                    </button>
                  </div>
                );
              })}
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
