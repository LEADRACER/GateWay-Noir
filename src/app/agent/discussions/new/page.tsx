"use client";

import { useBadge } from "@/components/badge/BadgeProvider";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Loader2, Users, Lock, ChevronDown, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

interface Agent {
  id: string;
  badgeCode: string;
  displayName: string;
  role: string;
}

export default function NewDiscussionPage() {
  const { badge, loading: badgeLoading } = useBadge();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"all" | "agents" | "invited">("all");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load available agents for BRU and AGT (for invited/agents visibility)
  useEffect(() => {
    if (badge?.role === "BUREAU" || badge?.role === "AGENT") {
      loadAgents();
    }
  }, [badge]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const body: any = {
        title: title.trim(),
        description: description.trim() || undefined,
      };

      if (canManageVisibility) {
        body.visibility = visibility;
        if (visibility === "invited") {
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
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
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
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-600 typewriter-label block mb-1">VISIBILITY</label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setVisibility("all")}
                  className={`flex items-center gap-2 px-3 py-2 border rounded ${
                    visibility === "all"
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                      : "border-[rgba(168,144,112,0.1)] text-zinc-500 hover:border-[rgba(168,144,112,0.2)]"
                  } transition-colors`}
                >
                  <Lock className={`w-3 h-3 ${visibility === "all" ? "text-amber-400" : ""}`} />
                  <span className="text-xs font-medium">ALL (DET + AGT + BRU)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("agents")}
                  className={`flex items-center gap-2 px-3 py-2 border rounded ${
                    visibility === "agents"
                      ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                      : "border-[rgba(168,144,112,0.1)] text-zinc-500 hover:border-[rgba(168,144,112,0.2)]"
                  } transition-colors`}
                >
                  <Users className={`w-3 h-3 ${visibility === "agents" ? "text-blue-400" : ""}`} />
                  <span className="text-xs font-medium">AGENTS ONLY (AGT + BRU)</span>
                </button>
                {isBureau && (
                  <button
                    type="button"
                    onClick={() => setVisibility("invited")}
                    className={`flex items-center gap-2 px-3 py-2 border rounded ${
                      visibility === "invited"
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                        : "border-[rgba(168,144,112,0.1)] text-zinc-500 hover:border-[rgba(168,144,112,0.2)]"
                    } transition-colors`}
                  >
                    <UserPlus className={`w-3 h-3 ${visibility === "invited" ? "text-amber-400" : ""}`} />
                    <span className="text-xs font-medium">INVITED ONLY</span>
                  </button>
                )}
              </div>

              {visibility === "invited" && (
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-600 typewriter-label block mb-1">
                    SELECT AGENTS ({selectedAgents.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAgentPicker(true)}
                    disabled={loadingAgents}
                    className="w-full px-3 py-2 border border-[rgba(168,144,112,0.1)] rounded text-sm text-zinc-400 hover:border-[rgba(168,144,112,0.2)] transition-colors flex items-center justify-between"
                  >
                    {selectedAgents.length > 0 ? (
                      <>
                        <span className="text-zinc-200">{selectedAgents.length} agent{selectedAgents.length !== 1 ? "s" : ""} selected</span>
                        <ChevronDown className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>Click to select agents...</span>
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {showAgentPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute z-10 w-full bg-[#111113] border border-[rgba(168,144,112,0.1)] rounded mt-1 max-h-60 overflow-auto"
                    >
                      {loadingAgents ? (
                        <div className="p-4 text-center text-zinc-500 text-sm">Loading agents...</div>
                      ) : availableAgents.length === 0 ? (
                        <div className="p-4 text-center text-zinc-500 text-sm">No agents available</div>
                      ) : (
                        <div className="p-1 max-h-56 overflow-auto">
                          {availableAgents.map((agent) => (
                            <label
                              key={agent.id}
                              className={`flex items-center gap-2 px-3 py-2 hover:bg-[#0a0a0c] transition-colors ${
                                selectedAgents.includes(agent.id) ? "bg-amber-500/10" : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedAgents.includes(agent.id)}
                                onChange={() => toggleAgent(agent.id)}
                                className="w-4 h-4 accent-amber-500"
                              />
                              <span className="text-xs font-mono text-amber-400">{agent.badgeCode}</span>
                              <span className="text-xs text-zinc-400">{agent.displayName}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                agent.role === "BUREAU" ? "bg-amber-500/20 text-amber-400" :
                                agent.role === "AGENT" ? "bg-blue-500/20 text-blue-400" :
                                "bg-zinc-500/20 text-zinc-500"
                              }`}>
                                {agent.role}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowAgentPicker(false)}
                        className="w-full px-3 py-2 border-t border-[rgba(168,144,112,0.1)] text-xs text-zinc-500 hover:text-zinc-300"
                      >
                        DONE
                      </button>
                    </motion.div>
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
