"use client";

import { useBadge } from "@/components/badge/BadgeProvider";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Loader2, Users, Lock, Shield, UserPlus, UserCheck } from "lucide-react";
import toast from "react-hot-toast";

interface Agent {
  id: string;
  badgeCode: string;
  displayName: string;
  role: string;
}

const visibilityOptions: {
  value: "bru_only" | "bru_agt" | "bru_agt_det";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  roles: string[];
  allowedRoles: string[];
}[] = [
  {
    value: "bru_only",
    label: "BRU ONLY",
    icon: Shield,
    color: "amber",
    description: "Bureau members only",
    roles: ["BRU"],
    allowedRoles: ["BUREAU"],
  },
  {
    value: "bru_agt",
    label: "BRU + AGT",
    icon: Users,
    color: "blue",
    description: "Bureau + Field Agents",
    roles: ["BRU", "AGT"],
    allowedRoles: ["BUREAU", "AGENT"],
  },
  {
    value: "bru_agt_det",
    label: "BRU + AGT + DET",
    icon: Users,
    color: "emerald",
    description: "All badge holders",
    roles: ["BRU", "AGT", "DET"],
    allowedRoles: ["BUREAU", "AGENT", "DETECTIVE"],
  },
];

export default function NewDiscussionPage() {
  const { badge, loading: badgeLoading } = useBadge();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"bru_only" | "bru_agt" | "bru_agt_det">("bru_agt_det");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [agentFilter, setAgentFilter] = useState("");

  // Load available agents for BRU and AGT
  const loadAgents = async () => {
    setLoadingAgents(true);
    try {
      const res = await fetch("/api/agent/users");
      if (res.ok) {
        const data = await res.json();
        setAvailableAgents(data.agents || []);
      }
    } catch {
      // silent fail
    } finally {
      setLoadingAgents(false);
    }
  };

  useEffect(() => {
    if (badge?.role === "BUREAU" || badge?.role === "AGENT") {
      queueMicrotask(() => {
        void loadAgents();
      });
    }
  }, [badge]);

  if (badgeLoading) return null;

  if (!badge || (badge.role !== "DETECTIVE" && badge.role !== "AGENT" && badge.role !== "BUREAU")) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <p className="text-zinc-500 text-sm">Not authorized.</p>
      </div>
    );
  }

  const isBureau = badge.role === "BUREAU";
  const isAgent = badge.role === "AGENT";
  const canManageVisibility = isBureau || isAgent;

  const filteredOptions = visibilityOptions.filter((opt) =>
    opt.allowedRoles.includes(badge?.role || "")
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
      };

      if (canManageVisibility) {
        body.visibility = visibility;
        if (isBureau && selectedAgents.length > 0) {
          body.participantIds = selectedAgents;
        }
      }

      const res = await fetch("/api/agent/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create discussion");
        return;
      }
      if (data.discussion) {
        toast.success("Discussion created");
        router.push(`/agent/discussions/${data.discussion.id}`);
      } else {
        toast.error(data.error || "Failed to create");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAgent = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 mb-4 typewriter-label transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          BACK
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] text-zinc-600 typewriter-label block mb-1">TITLE</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Case file #217 — suspect profile"
              maxLength={200}
              required
              className="w-full bg-[#0a0a0c] border border-[rgba(168,144,112,0.1)] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[rgba(168,144,112,0.25)] transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-600 typewriter-label block mb-1">DESCRIPTION (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief context for other agents..."
              maxLength={2000}
              rows={3}
              className="w-full bg-[#0a0a0c] border border-[rgba(168,144,112,0.1)] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[rgba(168,144,112,0.25)] transition-colors resize-none"
            />
          </div>

          {canManageVisibility && (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-[10px] text-zinc-600 typewriter-label block mb-1">PARTICIPANT VISIBILITY</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVisibility(opt.value)}
                      className={`flex flex-col items-start gap-1.5 px-3 py-3 border rounded transition-all ${
                        visibility === opt.value
                          ? `border-${opt.color}-500/50 bg-${opt.color}-500/10 text-${opt.color}-400`
                          : "border-[rgba(168,144,112,0.1)] text-zinc-500 hover:border-[rgba(168,144,112,0.2)]"
                      } transition-colors`}
                    >
                      <div className="flex items-center gap-2">
                        <opt.icon className={`w-4 h-4 ${visibility === opt.value ? `text-${opt.color}-400` : ""}`} />
                        <span className="text-xs font-medium">{opt.label}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-zinc-600 typewriter-label">
                        {opt.roles.map((r, i) => (
                          <span key={r} className={`px-1.5 py-0.5 rounded ${
                            r === "BRU" ? "bg-amber-500/20 text-amber-400" :
                            r === "AGT" ? "bg-blue-500/20 text-blue-400" :
                            "bg-zinc-500/20 text-zinc-500"
                          }`}>
                            {r}
                          </span>
                        ))}
                      </div>
                      <p className="text-[9px] text-zinc-600">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {isBureau && selectedAgents.length > 0 && (
                <div className="space-y-2 p-3 bg-[#0a0a0c] border border-[rgba(168,144,112,0.1)] rounded">
                  <label className="text-[10px] text-zinc-600 typewriter-label block mb-1">SELECTED AGENTS ({selectedAgents.length})</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgents.map((agentId) => {
                      const agent = availableAgents.find((a) => a.id === agentId);
                      return agent ? (
                        <span key={agentId} className="px-2 py-1 text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded typewriter-label flex items-center gap-1">
                          {agent.badgeCode}
                          <button
                            type="button"
                            onClick={() => toggleAgent(agentId)}
                            className="hover:text-amber-300 transition-colors"
                          >
                            ✕
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {isBureau && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowAgentPicker(!showAgentPicker)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-[10px] border border-[rgba(168,144,112,0.1)] text-zinc-500 hover:border-[rgba(168,144,112,0.2)] rounded transition-colors typewriter-label"
                  >
                    <UserPlus className="w-3 h-3" />
                    {showAgentPicker ? "HIDE AGENT PICKER" : "ADD AGENTS"}
                  </button>

                  {showAgentPicker && (
                    <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-[#0a0a0c] border border-[rgba(168,144,112,0.1)] rounded">
                      {loadingAgents ? (
                        <div className="text-center py-4 text-zinc-600 text-sm">Loading agents...</div>
                      ) : availableAgents.length === 0 ? (
                        <div className="text-center py-4 text-zinc-600 text-sm">No agents available</div>
                      ) : (
                        <>
                          <input
                            type="text"
                            placeholder="Filter agents..."
                            className="w-full bg-[#0a0a0c] border border-[rgba(168,144,112,0.1)] px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[rgba(168,144,112,0.25)] rounded"
                            onChange={(e) => setAgentFilter(e.target.value)}
                          />
                          {availableAgents
                            .filter(
                              (agent) =>
                                !selectedAgents.includes(agent.id) &&
                                (agent.badgeCode.toLowerCase().includes(agentFilter.toLowerCase()) ||
                                  agent.displayName.toLowerCase().includes(agentFilter.toLowerCase()))
                            )
                            .map((agent) => (
                              <button
                                key={agent.id}
                                type="button"
                                onClick={() => toggleAgent(agent.id)}
                                className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                                  selectedAgents.includes(agent.id)
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "text-zinc-400 hover:bg-zinc-900"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <UserCheck className={`w-3 h-3 ${selectedAgents.includes(agent.id) ? "text-amber-400" : "text-zinc-600"}`} />
                                  <span>{agent.badgeCode}</span>
                                  <span className="text-zinc-600">—</span>
                                  <span>{agent.displayName}</span>
                                  <span className={`px-1 py-0.5 text-[8px] rounded ${
                                    agent.role === "BUREAU"
                                      ? "bg-amber-500/20 text-amber-400"
                                      : "bg-blue-500/20 text-blue-400"
                                  }`}>
                                    {agent.role === "BUREAU" ? "BRU" : "AGT"}
                                  </span>
                                </div>
                              </button>
                            ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!title.trim() || submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[10px] font-medium bg-amber-600 text-black typewriter-label hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            CREATE DISCUSSION
          </button>
        </form>
      </motion.div>
    </div>
  );
}