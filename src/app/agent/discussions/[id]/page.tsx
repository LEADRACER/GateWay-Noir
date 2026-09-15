"use client";

import { useBadge } from "@/components/badge/BadgeProvider";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  Lock,
  MessageSquare,
  Pencil,
  Check,
  X,
  AlertTriangle,
  Users,
  UserPlus,
  UserMinus,
  ChevronDown,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface Discussion {
  id: string;
  title: string;
  description: string | null;
  isOpen: boolean;
  visibility: "all" | "agents" | "invited";
  summary: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: { badgeCode: string; displayName: string; role: string };
}

interface Agent {
  id: string;
  badgeCode: string;
  displayName: string;
  role: string;
}

interface Participant {
  id: string;
  userId: string;
  user: Agent;
  joinedAt: string;
}

export default function DiscussionDetailPage() {
  const { badge, loading: badgeLoading } = useBadge();
  const params = useParams();
  const router = useRouter();
  const msgEndRef = useRef<HTMLDivElement>(null);

  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Reopen confirmation (prevents accidental data loss)
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);

  // Polling interval for real-time updates
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Participant management (BRU only)
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showParticipantPanel, setShowParticipantPanel] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  const loadParticipants = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent/discussions/${params.id}/participants`);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants || []);
      }
    } catch {
      // silent fail
    }
  }, [params.id]);

  const loadAvailableAgents = async () => {
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

  // Load participants on mount for BRU
  useEffect(() => {
    if (!badgeLoading && badge?.role === "BUREAU" && discussion?.visibility === "invited") {
      loadParticipants();
    }
  }, [badgeLoading, badge?.role, discussion?.visibility, loadParticipants]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/agent/discussions/${params.id}/messages`);
      if (!res.ok) {
        if (res.status === 403) {
          setError("Not authorized");
          return;
        }
        throw new Error("Failed");
      }
      const data = await res.json();
      setDiscussion(data.discussion);
      setMessages(data.messages);
    } catch {
      setError("Failed to load discussion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!badgeLoading) fetchMessages();
  }, [badgeLoading, params.id]);

  // Polling for real-time message updates
  useEffect(() => {
    if (!discussion?.isOpen) return;
    
    pollIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 10000); // 10 second interval

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [discussion?.isOpen, fetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/agent/discussions/${params.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        setNewMessage("");
      } else {
        toast.error(data.error || "Failed to send");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    try {
      const res = await fetch(`/api/agent/discussions/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: false }),
      });
      const data = await res.json();
      if (data.discussion) {
        setDiscussion(data.discussion);
        toast.success("Discussion closed");
      }
    } catch {
      toast.error("Failed to close");
    }
  };

  const handleReopen = () => {
    setShowReopenConfirm(true);
  };

  const handleConfirmReopen = async () => {
    setShowReopenConfirm(false);
    try {
      const res = await fetch(`/api/agent/discussions/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: true }),
      });
      const data = await res.json();
      if (data.discussion) {
        setDiscussion(data.discussion);
        await fetchMessages(); // old session was sealed server-side — refetch wiped state
        toast.success("Discussion reopened");
      }
    } catch {
      toast.error("Failed to reopen");
    }
  };

  const startEdit = () => {
    if (!discussion) return;
    setEditTitle(discussion.title);
    setEditDescription(discussion.description || "");
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/agent/discussions/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
        }),
      });
      const data = await res.json();
      if (data.discussion) {
        setDiscussion(data.discussion);
        setEditing(false);
        toast.success("Discussion updated");
      } else {
        toast.error(data.error || "Failed to update");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (badgeLoading || loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
      </div>
    );
  }

  if (!badge || (badge.role !== "DETECTIVE" && badge.role !== "AGENT" && badge.role !== "BUREAU")) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <Lock className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">Not authorized.</p>
      </div>
    );
  }

  if (error || !discussion) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <p className="text-zinc-500 text-sm">{error || "Not found"}</p>
        <button
          onClick={() => router.push("/agent/discussions")}
          className="mt-4 text-[10px] text-amber-500/70 hover:text-amber-400 typewriter-label"
        >
          ← BACK TO DISCUSSIONS
        </button>
      </div>
    );
  }

  const canClose = discussion.createdById === badge.id || badge.role === "BUREAU";

  return (
    <div className="max-w-8xl mx-auto py-8 px-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <button
          onClick={() => router.push("/agent/discussions")}
          className="inline-flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 mb-3 typewriter-label transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          DISCUSSIONS
        </button>

        <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="space-y-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={200}
                    placeholder="Title"
                    className="w-full bg-[#0a0a0c] border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[rgba(168,144,112,0.25)] transition-colors"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    placeholder="Description (optional)"
                    className="w-full bg-[#0a0a0c] border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 text-[11px] text-zinc-400 placeholder:text-zinc-700 focus:outline-none focus:border-[rgba(168,144,112,0.25)] transition-colors resize-none"
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-0.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />
                    <h1 className="text-sm font-semibold text-zinc-200 truncate">
                      {discussion.title}
                    </h1>
                    {!discussion.isOpen && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-medium bg-zinc-800 text-zinc-500 typewriter-label">
                        <CheckCircle2 className="w-2 h-2" />
                        CLOSED
                      </span>
                    )}
                  </div>
                  {discussion.description && (
                    <p className="text-[11px] text-zinc-500 mt-1">{discussion.description}</p>
                  )}
                  <p className="text-[9px] text-zinc-700 mt-1">
                    Opened {formatDate(discussion.createdAt)} · {messages.length} message{messages.length !== 1 ? "s" : ""}
                  </p>
                </>
              )}
            </div>

            {editing ? (
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={handleSaveEdit}
                  disabled={!editTitle.trim() || saving}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-medium bg-amber-600 text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-500 typewriter-label transition-colors"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  SAVE
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-medium text-zinc-500 border border-[rgba(168,144,112,0.1)] hover:text-zinc-300 hover:border-[rgba(168,144,112,0.2)] typewriter-label transition-colors"
                >
                  <X className="w-3 h-3" />
                  CANCEL
                </button>
              </div>
            ) : canClose ? (
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={startEdit}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-medium text-zinc-500 border border-[rgba(168,144,112,0.1)] hover:text-zinc-300 hover:border-[rgba(168,144,112,0.2)] typewriter-label transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  EDIT
                </button>
                {discussion.isOpen ? (
                  <button
                    onClick={handleClose}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-medium text-zinc-500 border border-[rgba(168,144,112,0.1)] hover:text-zinc-300 hover:border-[rgba(168,144,112,0.2)] typewriter-label transition-colors"
                  >
                    CLOSE
                  </button>
                ) : (
                  <button
                    onClick={handleReopen}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-medium text-zinc-500 border border-[rgba(168,144,112,0.1)] hover:text-zinc-300 hover:border-[rgba(168,144,112,0.2)] typewriter-label transition-colors"
                  >
                    REOPEN
                  </button>
                )}
                {badge.role === "BUREAU" && discussion.visibility === "invited" && (
                  <button
                    onClick={() => {
                      setShowParticipantPanel(true);
                      loadAvailableAgents();
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-medium text-zinc-500 border border-[rgba(168,144,112,0.1)] hover:text-zinc-300 hover:border-[rgba(168,144,112,0.2)] typewriter-label transition-colors"
                  >
                    <Users className="w-3 h-3" />
                    PARTICIPANTS
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Reopen Confirmation Dialog */}
        {showReopenConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-[#111113] border-2 border-[rgba(220,38,38,0.3)] rounded-lg p-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-semibold text-zinc-200 typewriter-label">CONFIRM REOPEN</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                Reopening this discussion will <span className="text-red-400 font-medium">permanently delete all previous messages</span>.
                A short summary of the previous session will be saved as a sealed file (read-only).
              </p>
              <p className="text-[10px] text-zinc-600 mb-6">
                This action cannot be undone. Are you sure?
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowReopenConfirm(false)}
                  className="flex-1 px-3 py-2 text-[9px] font-medium text-zinc-500 border border-[rgba(168,144,112,0.1)] hover:text-zinc-300 hover:border-[rgba(168,144,112,0.2)] typewriter-label transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmReopen}
                  className="flex-1 px-3 py-2 text-[9px] font-medium bg-red-600 text-black hover:bg-red-500 typewriter-label transition-colors"
                >
                  REOPEN & WIPE HISTORY
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Participant Management Panel (BRU only, for invited discussions) */}
        {showParticipantPanel && badge.role === "BUREAU" && discussion.visibility === "invited" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg bg-[#111113] border-2 border-[rgba(168,144,112,0.2)] rounded-lg p-6 max-h-[80vh] overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400/70" />
                  <h3 className="text-sm font-semibold text-zinc-200 typewriter-label">MANAGE PARTICIPANTS</h3>
                </div>
                <button
                  onClick={() => setShowParticipantPanel(false)}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current Participants */}
              <div className="mb-4">
                <h4 className="text-[9px] text-zinc-500 typewriter-label mb-2">CURRENT PARTICIPANTS ({participants.length})</h4>
                {participants.length === 0 ? (
                  <p className="text-[10px] text-zinc-600">No participants yet</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-auto">
                    {participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] rounded"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-amber-400">{p.user.badgeCode}</span>
                          <span className="text-xs text-zinc-400">{p.user.displayName}</span>
                          <span className={`text-[8px] px-1.5 py-[1px] rounded ${
                            p.user.role === "BUREAU" ? "bg-amber-500/20 text-amber-400" :
                            p.user.role === "AGENT" ? "bg-blue-500/20 text-blue-400" :
                            "bg-zinc-500/20 text-zinc-500"
                          }`}>
                            {p.user.role}
                          </span>
                        </div>
                        {p.userId !== discussion.createdById && (
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`/api/agent/discussions/${params.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    participantIds: participants.filter(p2 => p2.userId !== p.userId).map(p2 => p2.userId),
                                  }),
                                });
                                loadParticipants();
                              } catch {
                                toast.error("Failed to remove participant");
                              }
                            }}
                            className="text-red-400/70 hover:text-red-400 text-[10px]"
                          >
                            <UserMinus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Participants */}
              <div className="mb-4">
                <h4 className="text-[9px] text-zinc-500 typewriter-label mb-2">ADD PARTICIPANTS</h4>
                {loadingAgents ? (
                  <div className="p-4 text-center text-zinc-500 text-sm">Loading agents...</div>
                ) : (
                  <div className="max-h-56 overflow-auto space-y-1">
                    {availableAgents
                      .filter((a) => !participants.some(p => p.userId === a.id))
                      .map((agent) => (
                        <label
                          key={agent.id}
                          className={`flex items-center gap-2 px-3 py-2 hover:bg-[#0a0a0c] transition-colors ${
                            selectedAgentIds.includes(agent.id) ? "bg-amber-500/10" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAgentIds.includes(agent.id)}
                            onChange={() => setSelectedAgentIds(prev =>
                              prev.includes(agent.id)
                                ? prev.filter(id => id !== agent.id)
                                : [...prev, agent.id]
                            )}
                            className="w-4 h-4 accent-amber-500"
                          />
                          <span className="text-xs font-mono text-amber-400">{agent.badgeCode}</span>
                          <span className="text-xs text-zinc-400">{agent.displayName}</span>
                          <span className={`text-[9px] px-1.5 py-[1px] rounded ${
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
                {selectedAgentIds.length > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        await fetch(`/api/agent/discussions/${params.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            participantIds: [...new Set([...participants.map(p => p.userId), ...selectedAgentIds])],
                          }),
                        });
                        setSelectedAgentIds([]);
                        loadParticipants();
                        toast.success("Participants added");
                      } catch {
                        toast.error("Failed to add participants");
                      }
                    }}
                    className="w-full mt-2 px-3 py-2 text-[9px] font-medium bg-amber-600 text-black hover:bg-amber-500 typewriter-label transition-colors"
                  >
                    ADD {selectedAgentIds.length} PARTICIPANT{selectedAgentIds.length !== 1 ? "S" : ""}
                  </button>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[rgba(168,144,112,0.1)]">
                <button
                  onClick={() => setShowParticipantPanel(false)}
                  className="flex-1 px-3 py-2 text-[9px] font-medium text-zinc-500 border border-[rgba(168,144,112,0.1)] hover:text-zinc-300 hover:border-[rgba(168,144,112,0.2)] typewriter-label transition-colors"
                >
                  DONE
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Sealed summary — previous session, read-only */}
        {discussion.summary ? (
          <div className="bg-[#0d0c0a] border border-[rgba(217,119,6,0.2)] p-3 mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lock className="w-3 h-3 text-amber-500/70" />
              <span className="text-[9px] text-amber-500/80 typewriter-label tracking-wider">
                SEALED FILE — PREVIOUS SESSION SUMMARY
              </span>
              <span className="ml-auto text-[8px] text-amber-700/60 typewriter-label">READ-ONLY</span>
            </div>
            <p className="text-[11px] text-amber-100/60 leading-relaxed">{discussion.summary}</p>
          </div>
        ) : null}

        {/* Messages */}
        <div className="space-y-2 mb-4 max-h-[60vh] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-5 h-5 text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-600 text-[10px] typewriter-label">NO MESSAGES YET</p>
              <p className="text-zinc-700 text-[10px] mt-0.5">
                Start the conversation by sending the first message
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isBRU = msg.user.role === "BUREAU";
              const isAGT = msg.user.role === "AGENT";
              const isMine = msg.user.badgeCode === badge?.badgeCode;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`max-w-[80%] bg-[#111113] border ${
                      isMine
                        ? "border-[rgba(217,119,6,0.12)]"
                        : "border-[rgba(168,144,112,0.06)]"
                    } p-2.5`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`text-[9px] font-mono ${
                          isBRU
                            ? "text-amber-300/80"
                            : isAGT
                            ? "text-amber-500/80"
                            : "text-zinc-500"
                        }`}
                      >
                        {msg.user.badgeCode}
                      </span>
                      <span
                        className={`text-[7px] px-1 py-[1px] ${
                          isBRU
                            ? "bg-amber-300/10 text-amber-300/60 border border-amber-300/20"
                            : isAGT
                            ? "bg-amber-500/10 text-amber-500/60 border border-amber-500/20"
                            : "bg-zinc-800 text-zinc-600 border border-zinc-700"
                        }`}
                      >
                        {msg.user.role === "BUREAU" ? "BRU" : msg.user.role === "AGENT" ? "AGT" : "DET"}
                      </span>
                      <span className="text-[8px] text-zinc-700 ml-auto">
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={msgEndRef} />
        </div>

        {/* Message Input */}
        {discussion.isOpen ? (
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              maxLength={5000}
              className="flex-1 bg-[#0a0a0c] border border-[rgba(168,144,112,0.1)] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[rgba(168,144,112,0.25)] transition-colors"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-3 py-2 bg-amber-600 text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-500 transition-colors"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        ) : (
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.06)] p-3 text-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600 mx-auto mb-1" />
            <p className="text-[10px] text-zinc-600 typewriter-label">DISCUSSION CLOSED</p>
            {canClose && (
              <button
                onClick={handleReopen}
                className="text-[9px] text-amber-500/70 hover:text-amber-400 typewriter-label mt-1"
              >
                REOPEN DISCUSSION
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
