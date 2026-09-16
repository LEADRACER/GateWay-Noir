"use client";

import { useBadge } from "@/components/badge/BadgeProvider";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Plus,
  CheckCircle2,
  Clock,
  Users,
  ArrowRight,
  Loader2,
  Search,
  Activity,
  TrendingUp,
  BarChart2,
  UserCircle,
  Zap,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  getAudienceLabel,
  type DiscussionAudience,
  type SpectatorVisibility,
} from "@/lib/discussion-access";

interface Discussion {
  id: string;
  title: string;
  description: string | null;
  isOpen: boolean;
  visibility: DiscussionAudience;
  spectatorVisibility: SpectatorVisibility;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { badgeCode: string; displayName: string } | null;
  _count: { messages: number; participants: number };
  activeParticipants: Array<{ badgeCode: string; displayName: string; role: string; lastActive: string }>;
}

interface UserStats {
  totalUsers: number;
  onlineUsers: number;
  agentsOnline: number;
  bureauOnline: number;
  recentActivity: number;
}

type DiscussionFilter = "all" | "open" | "closed";

const audienceClasses: Record<DiscussionAudience, string> = {
  bru_only: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  bru_agt: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  bru_agt_det: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
};

const filterOptions: Array<{ value: DiscussionFilter; label: string }> = [
  { value: "all", label: "ALL" },
  { value: "open", label: "OPEN" },
  { value: "closed", label: "CLOSED" },
];

const audienceFilterOptions: Array<{ value: DiscussionAudience | "all"; label: string }> = [
  { value: "all", label: "ALL AUDIENCES" },
  { value: "bru_only", label: "BRU ONLY" },
  { value: "bru_agt", label: "BRU + AGT" },
  { value: "bru_agt_det", label: "BRU + AGT + DET" },
];

export default function AgentDiscussionsPage() {
  const { badge, loading: badgeLoading } = useBadge();
  const router = useRouter();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DiscussionFilter>("all");
  const [audience, setAudience] = useState<DiscussionAudience | "all">("all");
  const [query, setQuery] = useState("");
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [showStats, setShowStats] = useState(false);

  const fetchDiscussions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/discussions");
      if (!res.ok) {
        if (res.status === 403) {
          setError("This account cannot access discussions.");
          return;
        }
        throw new Error("Failed to load");
      }
      const data = await res.json();
      setDiscussions(data.discussions || []);
    } catch {
      setError("Failed to load discussions");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserStats = useCallback(async () => {
    if (!badge) return;
    try {
      const res = await fetch("/api/agent/stats");
      if (res.ok) {
        const data = await res.json();
        setUserStats(data);
      }
    } catch {
      // silent fail
    }
  }, [badge]);

  useEffect(() => {
    if (!badgeLoading) {
      queueMicrotask(() => {
        void fetchDiscussions();
        void fetchUserStats();
      });
    }
  }, [badgeLoading, fetchDiscussions, fetchUserStats]);

  const canCreate = Boolean(
    badge && (badge.role === "DETECTIVE" || badge.role === "AGENT" || badge.role === "BUREAU"),
  );
  const isVisitor = !badge;
  const totalMessages = discussions.reduce((total, discussion) => total + discussion._count.messages, 0);
  const totalParticipants = discussions.reduce(
    (total, discussion) => total + discussion._count.participants,
    0,
  );
  const visibleDiscussions = discussions.filter((discussion) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "open" && discussion.isOpen) ||
      (filter === "closed" && !discussion.isOpen);
    const matchesAudience =
      audience === "all" || discussion.visibility === audience;
    const matchesQuery =
      !query.trim() ||
      `${discussion.title} ${discussion.description || ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase());
    return matchesFilter && matchesAudience && matchesQuery;
  });

  if (badgeLoading) {
    return (
      <div className="max-w-3xl mx-auto py-16 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isVisitor ? (
                <Activity className="w-4 h-4 text-violet-400/70" />
              ) : (
                <Users className="w-4 h-4 text-amber-400/70" />
              )}
              <h1 className="text-sm font-semibold text-zinc-200 typewriter-label">
                {isVisitor ? "PUBLIC CHANNEL" : "AGENT CHANNEL"}
              </h1>
            </div>
            <p className="text-[10px] text-zinc-600">
              {isVisitor
                ? "Spectator feed · claim a badge to join the conversation"
                : "Role-based discussions · choose an audience before opening a thread"}
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => router.push("/agent/discussions/new")}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium bg-amber-600 text-black typewriter-label hover:bg-amber-500 transition-colors min-h-[40px] justify-center sm:justify-normal"
            >
              <Plus className="w-3 h-3" />
              NEW DISCUSSION
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800/20 px-3 py-2 mb-4">
            <p className="text-[11px] text-red-400">{error}</p>
          </div>
        )}

        {!isVisitor && userStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6"
          >
            <button
              onClick={() => setShowStats(!showStats)}
              className="w-full flex items-center justify-between p-3 bg-[#111113] border border-[rgba(168,144,112,0.07)] rounded transition-colors hover:border-[rgba(168,144,112,0.15)]"
            >
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-zinc-300 typewriter-label">LIVE INTEL</span>
              </div>
              <Activity
                className={`w-4 h-4 text-zinc-500 transition-transform ${showStats ? "rotate-180" : ""}`}
              />
            </button>
            {showStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 p-3 bg-[#0a0a0c] border border-[rgba(168,144,112,0.1)] rounded">
                <div className="text-center">
                  <p className="text-xl font-semibold text-amber-400">{userStats.totalUsers}</p>
                  <p className="text-[8px] text-zinc-600 typewriter-label">TOTAL AGENTS</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold text-emerald-400">{userStats.onlineUsers}</p>
                  <p className="text-[8px] text-zinc-600 typewriter-label">ONLINE NOW</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold text-blue-400">{userStats.agentsOnline}</p>
                  <p className="text-[8px] text-zinc-600 typewriter-label">AGENTS ACTIVE</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold text-amber-400">{userStats.bureauOnline}</p>
                  <p className="text-[8px] text-zinc-600 typewriter-label">BUREAU ACTIVE</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold text-violet-400">{userStats.recentActivity}</p>
                  <p className="text-[8px] text-zinc-600 typewriter-label">RECENT ACTIVITY</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.07)] p-3">
            <p className="text-[8px] text-zinc-600 typewriter-label">THREADS</p>
            <p className="text-lg text-zinc-200 font-semibold">{discussions.length}</p>
          </div>
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.07)] p-3">
            <p className="text-[8px] text-zinc-600 typewriter-label">OPEN</p>
            <p className="text-lg text-zinc-200 font-semibold">{discussions.filter((d) => d.isOpen).length}</p>
          </div>
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.07)] p-3">
            <p className="text-[8px] text-zinc-600 typewriter-label">MESSAGES</p>
            <p className="text-lg text-zinc-200 font-semibold">{totalMessages}</p>
          </div>
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.07)] p-3">
            <p className="text-[8px] text-zinc-600 typewriter-label">PARTICIPANTS</p>
            <p className="text-lg text-zinc-200 font-semibold">{totalParticipants}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-2.5 py-1.5 text-[9px] border rounded whitespace-nowrap typewriter-label transition-colors ${
                  filter === option.value
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                    : "border-[rgba(168,144,112,0.1)] text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <select
            value={audience}
            onChange={(event) => setAudience(event.target.value as DiscussionAudience | "all")}
            className="bg-[#111113] border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 text-[9px] text-zinc-400 outline-none focus:border-[rgba(168,144,112,0.25)] typewriter-label"
          >
            {audienceFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 bg-[#111113] border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 min-w-0">
            <Search className="w-3 h-3 text-zinc-700 shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search discussions"
              className="bg-transparent outline-none text-[9px] text-zinc-400 placeholder:text-zinc-700 w-full"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
        ) : visibleDiscussions.length === 0 ? (
          <div className="text-center py-12 bg-[#111113] border border-[rgba(168,144,112,0.08)]">
            <MessageSquare className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
            <p className="text-zinc-600 text-xs typewriter-label">NO DISCUSSIONS FOUND</p>
            <p className="text-zinc-700 text-[10px] mt-1">Try another filter or start a new thread</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-3 h-3 text-zinc-600" />
              <p className="text-[9px] text-zinc-500 typewriter-label">
                {visibleDiscussions.length} DISCUSSION{visibleDiscussions.length !== 1 ? "S" : ""} · {discussions.filter(d => d.isOpen).length} OPEN · {totalMessages} MESSAGES
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleDiscussions.map((discussion) => (
                <button
                  key={discussion.id}
                  onClick={() => router.push(`/agent/discussions/${discussion.id}`)}
                  className="w-full text-left group bg-[#111113] border border-[rgba(168,144,112,0.06)] hover:border-[rgba(168,144,112,0.16)] transition-colors p-3 flex flex-col min-h-[150px]"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-xs font-medium text-zinc-300 truncate group-hover:text-zinc-200 transition-colors flex-1">
                      {discussion.title}
                    </h3>
                    {!discussion.isOpen && <CheckCircle2 className="w-3 h-3 text-zinc-600 shrink-0" />}
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[7px] font-medium rounded border ${audienceClasses[discussion.visibility]} typewriter-label`}>
                      {getAudienceLabel(discussion.visibility)}
                    </span>
                  </div>
                  {discussion.description && (
                    <p className="text-[10px] text-zinc-600 line-clamp-2 mb-2">{discussion.description}</p>
                  )}
                  
                  {discussion.activeParticipants && discussion.activeParticipants.length > 0 && (
                    <div className="mb-2 flex items-center gap-1.5 flex-wrap">
                      <Zap className="w-2.5 h-2.5 text-emerald-400/70 shrink-0" />
                      <span className="text-[8px] text-zinc-600 typewriter-label">ACTIVE:</span>
                      {discussion.activeParticipants.slice(0, 4).map((p, idx) => (
                        <span
                          key={p.badgeCode}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] rounded border typewriter-label ${
                            p.role === "BUREAU"
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                              : p.role === "AGENT"
                              ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                              : "bg-zinc-500/15 text-zinc-400 border-zinc-500/25"
                          }`}
                        >
                          <UserCircle className="w-2.5 h-2.5" />
                          {p.badgeCode}
                        </span>
                      ))}
                      {discussion.activeParticipants.length > 4 && (
                        <span className="text-[8px] text-zinc-500 typewriter-label">
                          +{discussion.activeParticipants.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-[rgba(168,144,112,0.05)]">
                    <div className="flex items-center gap-2 text-[9px] text-zinc-700 min-w-0">
                      <span className="font-mono truncate">{discussion.createdBy?.badgeCode ?? "?"}</span>
                      <span>•</span>
                      <Clock className="w-2.5 h-2.5 inline shrink-0" />
                      <span className="truncate">{formatDate(discussion.updatedAt)}</span>
                      <span>•</span>
                      <MessageSquare className="w-2.5 h-2.5 inline shrink-0" />
                      <span>{discussion._count.messages}</span>
                      <span>•</span>
                      <Users className="w-2.5 h-2.5 inline shrink-0" />
                      <span>{discussion._count.participants}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}