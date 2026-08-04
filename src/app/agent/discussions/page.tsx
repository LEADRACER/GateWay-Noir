"use client";

import { useBadge } from "@/components/badge/BadgeProvider";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Plus,
  CheckCircle2,
  Lock,
  Clock,
  Users,
  ArrowRight,
  Loader2,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface Discussion {
  id: string;
  title: string;
  description: string | null;
  isOpen: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { badgeCode: string; displayName: string };
  _count: { messages: number };
}

export default function AgentDiscussionsPage() {
  const { badge, loading: badgeLoading } = useBadge();
  const router = useRouter();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchDiscussions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/discussions");
      if (!res.ok) {
        if (res.status === 403) {
          setError("Only Agents and Bureau can access this space.");
          return;
        }
        throw new Error("Failed to load");
      }
      const data = await res.json();
      setDiscussions(data.discussions);
    } catch {
      setError("Failed to load discussions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!badgeLoading) fetchDiscussions();
  }, [badgeLoading, fetchDiscussions]);

  const handleDelete = async (d: Discussion) => {
    if (confirmingId !== d.id) {
      setConfirmingId(d.id);
      setTimeout(
        () => setConfirmingId((cur) => (cur === d.id ? null : cur)),
        3000
      );
      return;
    }
    try {
      const res = await fetch(`/api/agent/discussions/${d.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDiscussions((prev) => prev.filter((x) => x.id !== d.id));
        setConfirmingId(null);
        toast.success("Discussion deleted");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete");
        setConfirmingId(null);
      }
    } catch {
      toast.error("Network error");
      setConfirmingId(null);
    }
  };

  if (badgeLoading) {
    return (
      <div className="max-w-3xl mx-auto py-16 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
      </div>
    );
  }

  if (!badge || (badge.role !== "AGENT" && badge.role !== "BUREAU")) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <Lock className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">This space is for Agents and Bureau members only.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-amber-400/70" />
              <h1 className="text-sm font-semibold text-zinc-200 typewriter-label">AGENT CHANNEL</h1>
            </div>
            <p className="text-[10px] text-zinc-600">Private discussions for Agents and Bureau</p>
          </div>
          <button
            onClick={() => router.push("/agent/discussions/new")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium bg-amber-600 text-black typewriter-label hover:bg-amber-500 transition-colors"
          >
            <Plus className="w-3 h-3" />
            NEW DISCUSSION
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800/20 px-3 py-2 mb-4">
            <p className="text-[11px] text-red-400">{error}</p>
          </div>
        )}

        {/* Discussion List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
        ) : discussions.length === 0 ? (
          <div className="text-center py-12 bg-[#111113] border border-[rgba(168,144,112,0.08)]">
            <MessageSquare className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
            <p className="text-zinc-600 text-xs typewriter-label">NO DISCUSSIONS YET</p>
            <p className="text-zinc-700 text-[10px] mt-1">Start the first conversation in the Agent Channel</p>
          </div>
        ) : (
          <div className="space-y-1">
            {discussions.map((d) => {
              const canDelete =
                d.createdById === badge.id || badge.role === "BUREAU";
              return (
                <div
                  key={d.id}
                  className="group flex items-stretch gap-1"
                >
                  <button
                    onClick={() => router.push(`/agent/discussions/${d.id}`)}
                    className="flex-1 min-w-0 text-left bg-[#111113] border border-[rgba(168,144,112,0.06)] hover:border-[rgba(168,144,112,0.16)] transition-colors p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-xs font-medium text-zinc-300 truncate group-hover:text-zinc-200 transition-colors">
                            {d.title}
                          </h3>
                          {!d.isOpen && (
                            <CheckCircle2 className="w-3 h-3 text-zinc-600 shrink-0" />
                          )}
                        </div>
                        {d.description && (
                          <p className="text-[10px] text-zinc-600 line-clamp-1 mb-1">{d.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-[9px] text-zinc-700">
                          <span className="font-mono">{d.createdBy.badgeCode}</span>
                          <span>•</span>
                          <Clock className="w-2.5 h-2.5 inline" />
                          <span>{formatDate(d.createdAt)}</span>
                          <span>•</span>
                          <MessageSquare className="w-2.5 h-2.5 inline" />
                          <span>{d._count.messages}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0 mt-1" />
                    </div>
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(d)}
                      title={confirmingId === d.id ? "Click again to confirm" : "Delete discussion"}
                      className={`shrink-0 flex items-center justify-center border transition-colors ${
                        confirmingId === d.id
                          ? "w-20 bg-red-600/90 text-white border-red-500/50 hover:bg-red-500"
                          : "w-9 bg-[#111113] text-zinc-600 border-[rgba(168,144,112,0.06)] hover:text-red-400 hover:border-red-500/40"
                      }`}
                    >
                      {confirmingId === d.id ? (
                        <span className="text-[9px] font-medium typewriter-label">CONFIRM?</span>
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
