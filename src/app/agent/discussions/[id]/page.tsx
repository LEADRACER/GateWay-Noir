"use client";

import { useBadge } from "@/components/badge/BadgeProvider";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  Lock,
  MessageSquare,
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
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: { badgeCode: string; displayName: string; role: string };
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

  const handleReopen = async () => {
    try {
      const res = await fetch(`/api/agent/discussions/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: true }),
      });
      const data = await res.json();
      if (data.discussion) {
        setDiscussion(data.discussion);
        toast.success("Discussion reopened");
      }
    } catch {
      toast.error("Failed to reopen");
    }
  };

  if (badgeLoading || loading) {
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
    <div className="max-w-3xl mx-auto py-8 px-4">
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
            </div>

            {canClose && discussion.isOpen && (
              <button
                onClick={handleClose}
                className="shrink-0 px-2 py-1 text-[9px] font-medium text-zinc-500 border border-[rgba(168,144,112,0.1)] hover:text-zinc-300 hover:border-[rgba(168,144,112,0.2)] typewriter-label transition-colors"
              >
                CLOSE
              </button>
            )}
            {canClose && !discussion.isOpen && (
              <button
                onClick={handleReopen}
                className="shrink-0 px-2 py-1 text-[9px] font-medium text-zinc-500 border border-[rgba(168,144,112,0.1)] hover:text-zinc-300 hover:border-[rgba(168,144,112,0.2)] typewriter-label transition-colors"
              >
                REOPEN
              </button>
            )}
          </div>
        </div>

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
