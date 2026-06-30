"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Scale, MessageSquare, CheckCircle2, Sparkles, AlertCircle,
  Fingerprint, Users, UserPlus, UserMinus, Loader2,
} from "lucide-react";
import { useBadge } from "@/components/badge/BadgeProvider";
import { getAllAgents, promoteToBureau, demoteAgent, createBureauUser } from "@/lib/admin-actions";
import toast from "react-hot-toast";
import Link from "next/link";

interface AgentUser {
  id: string;
  badgeCode: string;
  displayName: string;
  bio: string | null;
  phone: string | null;
  handler: string | null;
  createdAt: Date | string;
}

interface BureauHQProps {
  stats: {
    totalTopics: number;
    activeTopics: number;
    upcomingTopics: number;
    totalComments: number;
  };
  children?: React.ReactNode;
}

export function BureauHQ({ stats, children }: BureauHQProps) {
  const { badge } = useBadge();
  const [agents, setAgents] = useState<AgentUser[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "agents" | "elevations">("dashboard");
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [demotingId, setDemotingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const data = await getAllAgents();
      setAgents(data as AgentUser[]);
    } catch {
      console.error("Failed to fetch agents");
    }
  };

  const handlePromoteToBureau = async (agentId: string) => {
    setPromotingId(agentId);
    try {
      const result = await promoteToBureau(agentId, badge?.badgeCode || "", badge?.id || "");
      if (result.success) {
        toast.success(`Promoted to BRU — new badge: ${result.newBadgeCode}`);
        setAgents((prev) => prev.filter((a) => a.id !== agentId));
      } else {
        toast.error(result.error || "Failed to promote");
      }
    } catch {
      toast.error("Network error");
    }
    setPromotingId(null);
  };

  const handleDemote = async (agentId: string) => {
    setDemotingId(agentId);
    try {
      const result = await demoteAgent(agentId);
      if (result.success) {
        toast.success(`Demoted to DET — new badge: ${result.newBadgeCode}`);
        setAgents((prev) => prev.filter((a) => a.id !== agentId));
      } else {
        toast.error(result.error || "Failed to demote");
      }
    } catch {
      toast.error("Network error");
    }
    setDemotingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-[#111113] border border-[rgba(168,144,112,0.08)] p-1 rounded">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium typewriter-label transition-colors ${
            activeTab === "dashboard"
              ? "bg-[#0d0d0f] text-zinc-200 border border-[rgba(168,144,112,0.12)]"
              : "text-zinc-600 hover:text-zinc-400 border border-transparent"
          }`}
        >
          <Scale className="w-3 h-3" />
          DASHBOARD
        </button>
        <button
          onClick={() => setActiveTab("agents")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium typewriter-label transition-colors ${
            activeTab === "agents"
              ? "bg-[#0d0d0f] text-zinc-200 border border-[rgba(168,144,112,0.12)]"
              : "text-zinc-600 hover:text-zinc-400 border border-transparent"
          }`}
        >
          <Users className="w-3 h-3" />
          AGENTS
          {agents.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 bg-zinc-600 text-black text-[8px] font-bold">
              {agents.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("elevations")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium typewriter-label transition-colors ${
            activeTab === "elevations"
              ? "bg-[#0d0d0f] text-zinc-200 border border-[rgba(168,144,112,0.12)]"
              : "text-zinc-600 hover:text-zinc-400 border border-transparent"
          }`}
        >
          <Fingerprint className="w-3 h-3" />
          ELEVATIONS
        </button>
        <Link
          href="/agent/discussions"
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-zinc-600 hover:text-amber-400 typewriter-label transition-colors border border-transparent hover:border-[rgba(168,144,112,0.08)]"
        >
          <MessageSquare className="w-3 h-3" />
          DISCUSSIONS
        </Link>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-3 text-center">
              <Scale className="w-4 h-4 text-[#d97706] opacity-50 mx-auto mb-1" />
              <p className="text-lg font-bold text-zinc-100">{stats.totalTopics}</p>
              <p className="text-[10px] text-zinc-500">Total Cases</p>
            </div>
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-3 text-center">
              <CheckCircle2 className="w-4 h-4 text-green-500 opacity-60 mx-auto mb-1" />
              <p className="text-lg font-bold text-zinc-100">{stats.activeTopics}</p>
              <p className="text-[10px] text-zinc-500">Active</p>
            </div>
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-3 text-center">
              <Sparkles className="w-4 h-4 text-amber-400 opacity-60 mx-auto mb-1" />
              <p className="text-lg font-bold text-zinc-100">{stats.upcomingTopics}</p>
              <p className="text-[10px] text-zinc-500">Pending</p>
            </div>
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-3 text-center">
              <MessageSquare className="w-4 h-4 text-blue-400 opacity-60 mx-auto mb-1" />
              <p className="text-lg font-bold text-zinc-100">{stats.totalComments}</p>
              <p className="text-[10px] text-zinc-500">Statements</p>
            </div>
          </div>
          {children}
        </div>
      )}

      {/* Agents Tab */}
      {activeTab === "agents" && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded">
            <div className="h-0.5 evidence-tape" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-[#d97706] opacity-50" />
                <h2 className="text-xs font-semibold text-zinc-300 typewriter-label">ALL FIELD AGENTS</h2>
              </div>

              {agents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-6 h-6 text-zinc-700 mx-auto mb-2 opacity-50" />
                  <p className="text-zinc-600 text-[10px] typewriter-label">NO ACTIVE AGENTS</p>
                  <p className="text-zinc-700 text-[10px] mt-0.5">Approve elevation requests to recruit agents</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold text-[#d97706]">{agent.badgeCode}</span>
                          <span className="text-[10px] text-zinc-400">—</span>
                          <span className="text-xs text-zinc-300 truncate">{agent.displayName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-zinc-500">
                          {agent.handler && <span>Handler: <span className="font-mono">{agent.handler}</span></span>}
                          {agent.phone && <span>• {agent.phone}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDemote(agent.id)}
                          disabled={demotingId === agent.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-red-500/10 border border-red-500/25 text-red-400 typewriter-label hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                        >
                          {demotingId === agent.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <UserMinus className="w-3 h-3" />
                          )}
                          DEMOTE
                        </button>
                        <button
                          onClick={() => handlePromoteToBureau(agent.id)}
                          disabled={promotingId === agent.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-[#d97706]/15 border border-[#d97706]/30 text-[#d97706] typewriter-label hover:bg-[#d97706]/25 disabled:opacity-40 transition-colors"
                        >
                          {promotingId === agent.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <UserPlus className="w-3 h-3" />
                          )}
                          PROMOTE TO BRU
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Create New Admin */}
              <div className="mt-4 pt-4 border-t border-[rgba(168,144,112,0.06)]">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
                  <h3 className="text-[10px] text-zinc-500 typewriter-label">CREATE NEW ADMIN</h3>
                </div>
                <CreateAdminForm />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Elevations Tab — renders existing ElevationsPanel via children slot */}
      {activeTab === "elevations" && children && (
        <div>{children}</div>
      )}
    </div>
  );
}

function CreateAdminForm() {
  const { badge } = useBadge();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ badgeCode: string } | null>(null);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    setResult(null);
    try {
      const res = await createBureauUser(name.trim(), badge?.badgeCode || "");
      if (res.success) {
        setResult(res);
        setName("");
      } else {
        setError(res.error || "Failed to create admin");
      }
    } catch {
      setError("Network error");
    }
    setCreating(false);
  };

  if (result) {
    return (
      <div className="bg-[#0a0a0c] border border-[rgba(22,163,74,0.15)] p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          <span className="text-[10px] text-green-400/80 typewriter-label">ADMIN BADGE CREATED</span>
        </div>
        <p className="text-xs font-mono font-bold text-[#d97706] mb-1">{result.badgeCode}</p>
        <p className="text-[9px] text-zinc-500 mb-2">Share this code with the new admin to claim.</p>
        <button
          onClick={() => setResult(null)}
          className="text-[9px] text-zinc-600 hover:text-zinc-400 typewriter-label transition-colors"
        >
          + CREATE ANOTHER
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Admin display name..."
          className="flex-1 bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] px-2.5 py-1.5 text-[11px] text-zinc-300 outline-none focus:border-[#d97706]/30 transition-colors placeholder:text-zinc-700"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !name.trim()}
          className="px-3 py-1.5 bg-[#d97706]/15 border border-[#d97706]/30 text-[10px] text-[#d97706] typewriter-label hover:bg-[#d97706]/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? "..." : "GENERATE BRU"}
        </button>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[9px] text-red-400/80 mt-1.5">
          <AlertCircle className="w-2.5 h-2.5" />
          {error}
        </p>
      )}
    </>
  );
}
