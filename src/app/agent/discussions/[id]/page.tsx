"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  UserMinus,
  Eye,
  UserPlus,
  Search,
  FileText,
  Wifi,
  WifiOff,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getAudienceLabel, type DiscussionAudience, type SpectatorVisibility } from "@/lib/discussion-access";
import toast from "react-hot-toast";
import { useBadge } from "@/components/badge/BadgeProvider";

interface Discussion {
  id: string;
  title: string;
  description: string | null;
  isOpen: boolean;
  visibility: DiscussionAudience;
  spectatorVisibility: SpectatorVisibility;
  summary: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageUser {
  id?: string;
  badgeCode: string;
  displayName: string;
  role: string;
  isConnected?: boolean;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: MessageUser;
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
  user: Agent | null;
  joinedAt: string;
}

type SidebarTab = "people" | "details" | "search";

const audienceClasses: Record<DiscussionAudience, string> = {
  bru_only: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  bru_agt: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  bru_agt_det: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
};

const roleClasses: Record<string, string> = {
  BUREAU: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  AGENT: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  DETECTIVE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
};

const roleLabels: Record<string, string> = {
  BUREAU: "BRU",
  AGENT: "AGT",
  DETECTIVE: "DET",
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.trim().toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;

  while (cursor <= lowerText.length) {
    const index = lowerText.indexOf(lowerQuery, cursor);
    if (index === -1) {
      parts.push({ text: text.slice(cursor), match: false });
      break;
    }
    if (index > cursor) parts.push({ text: text.slice(cursor, index), match: false });
    parts.push({ text: text.slice(index, index + lowerQuery.length), match: true });
    cursor = index + lowerQuery.length;
  }

  return (
    <>
      {parts.map((part, index) =>
        part.match ? (
          <mark key={`${index}-${part.text}`} className="bg-amber-500/20 text-amber-200">
            {part.text}
          </mark>
        ) : (
          <span key={`${index}-${part.text}`}>{part.text}</span>
        ),
      )}
    </>
  );
}

export default function DiscussionDetailPage() {
  const { badge, loading: badgeLoading } = useBadge();
  const params = useParams();
  const router = useRouter();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const followMessagesRef = useRef(true);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVisibility, setEditVisibility] = useState<DiscussionAudience>("bru_agt_det");
  const [editSpectatorVisibility, setEditSpectatorVisibility] = useState<SpectatorVisibility>("participants_only");
  const [canDiscuss, setCanDiscuss] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showParticipantPanel, setShowParticipantPanel] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("people");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const loadParticipants = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent/discussions/${params.id}/participants`);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants || []);
      }
    } catch {
      return;
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
      return;
    } finally {
      setLoadingAgents(false);
    }
  };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent/discussions/${params.id}/messages`);
      if (!res.ok) {
        if (res.status === 403) {
          setError("Not authorized");
          setIsOnline(false);
          return;
        }
        throw new Error("Failed to load messages");
      }

      const data = await res.json();
      setDiscussion(data.discussion);
      setMessages(data.messages || []);
      setCanDiscuss(Boolean(data.canDiscuss));
      setLastSyncedAt(new Date().toISOString());
      setIsOnline(true);
      setError(null);
    } catch {
      setError("Failed to load discussion");
      setIsOnline(false);
      setLastSyncedAt(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (!badgeLoading) {
      const timeout = setTimeout(() => {
        void fetchMessages();
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [badgeLoading, fetchMessages]);

  useEffect(() => {
    if (!discussion?.isOpen) return;

    pollIntervalRef.current = setInterval(() => {
      if (!document.hidden) void fetchMessages();
    }, 5000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [discussion?.isOpen, fetchMessages]);

  useEffect(() => {
    if (!badgeLoading && badge && discussion) {
      const timeout = setTimeout(() => {
        void loadParticipants();
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [badgeLoading, badge, discussion, loadParticipants]);

  useEffect(() => {
    if (!followMessagesRef.current) return;
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const messageGroups = useMemo(() => {
    const groups: { date: string; label: string; messages: Message[] }[] = [];

    messages.forEach((message) => {
      const label = new Date(message.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const group = groups.at(-1);
      if (group?.label === label) {
        group.messages.push(message);
      } else {
        groups.push({ date: label, label, messages: [message] });
      }
    });

    return groups;
  }, [messages]);

  const searchResults = useMemo(
    () =>
      searchQuery.trim()
        ? messages.filter((message) => message.content.toLowerCase().includes(searchQuery.trim().toLowerCase()))
        : [],
    [messages, searchQuery],
  );

  const activeContributors = useMemo(() => {
    const contributors = new Map<string, MessageUser>();
    messages.forEach((message) => {
      if (message.user.isConnected) contributors.set(message.user.badgeCode, message.user);
    });
    return [...contributors.values()];
  }, [messages]);

  const visibleParticipants = useMemo(() => {
    const byId = new Map<string, Participant>();
    participants.forEach((participant) => byId.set(participant.userId, participant));

    messages.forEach((message) => {
      if (!byId.has(message.user.id || message.user.badgeCode)) {
        byId.set(message.user.badgeCode, {
          id: message.user.id || message.user.badgeCode,
          userId: message.user.id || message.user.badgeCode,
          user: {
            id: message.user.id || message.user.badgeCode,
            badgeCode: message.user.badgeCode,
            displayName: message.user.displayName,
            role: message.user.role,
          },
          joinedAt: message.createdAt,
        });
      }
    });

    return [...byId.values()];
  }, [messages, participants]);

  const creator = visibleParticipants.find((participant) => participant.userId === discussion?.createdById);
  const lastMessage = messages.at(-1);
  const messageCountByRole = useMemo(
    () =>
      messages.reduce<Record<string, number>>((counts, message) => {
        counts[message.user.role] = (counts[message.user.role] || 0) + 1;
        return counts;
      }, {}),
    [messages],
  );

  const jumpToMessage = (messageId: string) => {
    messageRefs.current[messageId]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    followMessagesRef.current = true;
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
        await fetchMessages();
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
    setEditVisibility(discussion.visibility);
    setEditSpectatorVisibility(discussion.spectatorVisibility);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || saving || !discussion) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: editTitle.trim(),
        description: editDescription.trim(),
      };
      if (badge?.role === "AGENT" || badge?.role === "BUREAU") {
        body.visibility = editVisibility;
      }
      if (badge?.role === "BUREAU") {
        body.spectatorVisibility = editSpectatorVisibility;
      }

      const res = await fetch(`/api/agent/discussions/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      <div className="mx-auto flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (error || !discussion) {
    return (
      <div className="mx-auto flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <MessageSquare className="mb-3 h-6 w-6 text-zinc-700" />
        <p className="text-sm text-zinc-500">{error || "Not found"}</p>
        <button
          onClick={() => router.push("/agent/discussions")}
          className="mt-4 inline-flex items-center gap-1 text-[10px] text-amber-500/70 transition-colors hover:text-amber-400 typewriter-label"
        >
          <ArrowLeft className="h-3 w-3" />
          BACK TO DISCUSSIONS
        </button>
      </div>
    );
  }

  const canClose = discussion.createdById === badge?.id || badge?.role === "BUREAU" || badge?.role === "AGENT";
  const canEditAudience = badge?.role === "AGENT" || badge?.role === "BUREAU";

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-[1600px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => router.push("/agent/discussions")}
          className="inline-flex min-h-[36px] items-center gap-1 text-[10px] text-zinc-600 transition-colors hover:text-zinc-400 typewriter-label"
        >
          <ArrowLeft className="h-3 w-3" />
          DISCUSSIONS
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[8px] text-zinc-500 typewriter-label">
            {isOnline ? <Wifi className="h-3 w-3 text-emerald-500/80" /> : <WifiOff className="h-3 w-3 text-red-400/80" />}
            {isOnline ? "LIVE SYNC" : "RECONNECTING"}
            {lastSyncedAt && <span className="hidden sm:inline">· {formatClock(lastSyncedAt)}</span>}
          </div>
          <button
            onClick={() => setShowSidebar((current) => !current)}
            className="inline-flex items-center gap-1 rounded border border-[rgba(168,144,112,0.1)] px-2 py-1.5 text-[8px] text-zinc-500 transition-colors hover:border-[rgba(168,144,112,0.2)] hover:text-zinc-300 typewriter-label lg:hidden"
          >
            <Users className="h-3 w-3" />
            PEOPLE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="sticky top-6 hidden h-[calc(100dvh-7rem)] flex-col gap-3 overflow-y-auto xl:flex">
          <div className="rounded-xl border border-[rgba(168,144,112,0.08)] bg-[#111113] p-4">
            <div className="mb-3 flex items-center gap-2 text-[9px] text-zinc-500 typewriter-label">
              <FileText className="h-3.5 w-3.5 text-amber-400/60" />
              CASE DOSSIER
            </div>
            <dl className="space-y-2.5 text-[9px]">
              <div className="flex items-start justify-between gap-2">
                <dt className="text-zinc-600">Opened</dt>
                <dd className="text-right text-zinc-300">{formatDate(discussion.createdAt)}</dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="text-zinc-600">Updated</dt>
                <dd className="text-right text-zinc-300">{formatDate(discussion.updatedAt)}</dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="text-zinc-600">Messages</dt>
                <dd className="font-mono text-zinc-300">{messages.length}</dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="text-zinc-600">Connected</dt>
                <dd className="font-mono text-emerald-400">{activeContributors.length}</dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="text-zinc-600">Created by</dt>
                <dd className="max-w-[150px] truncate text-right font-mono text-amber-400">
                  {creator?.user?.badgeCode || discussion.createdById}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-[rgba(168,144,112,0.08)] bg-[#111113] p-4">
            <div className="mb-3 flex items-center gap-2 text-[9px] text-zinc-500 typewriter-label">
              <Eye className="h-3.5 w-3.5 text-violet-400/60" />
              ACCESS PROFILE
            </div>
            <div className="space-y-2 text-[9px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-600">Audience</span>
                <span className={`rounded border px-1.5 py-0.5 typewriter-label ${audienceClasses[discussion.visibility]}`}>
                  {getAudienceLabel(discussion.visibility)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-600">Spectators</span>
                <span className="font-mono text-zinc-300">
                  {discussion.spectatorVisibility === "all" ? "ALL VISITORS" : "PARTICIPANTS"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-600">State</span>
                <span className={`font-mono ${discussion.isOpen ? "text-emerald-400" : "text-zinc-500"}`}>
                  {discussion.isOpen ? "OPEN" : "CLOSED"}
                </span>
              </div>
            </div>
          </div>

          {discussion.summary && (
            <div className="rounded-xl border border-[rgba(217,119,6,0.2)] bg-[#0d0c0a] p-4">
              <div className="mb-2 flex items-center gap-1.5 text-[8px] text-amber-500/80 typewriter-label">
                <Lock className="h-3 w-3" />
                SEALED FILE
              </div>
              <p className="text-[10px] leading-relaxed text-amber-100/60">{discussion.summary}</p>
            </div>
          )}
        </aside>

        <section className="flex min-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-2xl border border-[rgba(168,144,112,0.1)] bg-[#111113] shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          <header className="border-b border-[rgba(168,144,112,0.08)] bg-[#0a0a0c] p-4">
            {editing ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[9px] text-amber-400 typewriter-label">
                  <Pencil className="h-3.5 w-3.5" />
                  EDIT DISCUSSION
                </div>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={200}
                  placeholder="Title"
                  className="w-full rounded border border-[rgba(168,144,112,0.1)] bg-[#08080a] px-3 py-2 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-[rgba(217,119,6,0.3)]"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Description (optional)"
                  className="w-full resize-none rounded border border-[rgba(168,144,112,0.1)] bg-[#08080a] px-3 py-2 text-[11px] text-zinc-400 outline-none transition-colors placeholder:text-zinc-700 focus:border-[rgba(217,119,6,0.3)]"
                />
                {canEditAudience && (
                  <div className="space-y-2">
                    <label className="text-[8px] text-zinc-600 typewriter-label">AUDIENCE</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        ["bru_only", "BRU ONLY"],
                        ["bru_agt", "BRU + AGT"],
                        ["bru_agt_det", "BRU + AGT + DET"],
                      ] as Array<[DiscussionAudience, string]>).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          disabled={badge?.role === "AGENT" && value === "bru_only"}
                          onClick={() => setEditVisibility(value)}
                          className={`rounded border px-2 py-1.5 text-[8px] typewriter-label transition-colors ${
                            editVisibility === value
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                              : "border-[rgba(168,144,112,0.1)] text-zinc-600 hover:text-zinc-300"
                          } disabled:cursor-not-allowed disabled:opacity-30`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {badge?.role === "BUREAU" && (
                  <div className="space-y-2">
                    <label className="text-[8px] text-zinc-600 typewriter-label">SPECTATOR VISIBILITY</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([
                        ["participants_only", "PARTICIPANTS ONLY"],
                        ["all", "ALL VISITORS"],
                      ] as Array<[SpectatorVisibility, string]>).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setEditSpectatorVisibility(value)}
                          className={`rounded border px-2 py-1.5 text-[8px] typewriter-label transition-colors ${
                            editSpectatorVisibility === value
                              ? "border-violet-500/40 bg-violet-500/10 text-violet-400"
                              : "border-[rgba(168,144,112,0.1)] text-zinc-600 hover:text-zinc-300"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setEditing(false)}
                    className="inline-flex items-center gap-1 rounded border border-[rgba(168,144,112,0.1)] px-3 py-1.5 text-[9px] text-zinc-500 transition-colors hover:border-[rgba(168,144,112,0.2)] hover:text-zinc-300 typewriter-label"
                  >
                    <X className="h-3 w-3" />
                    CANCEL
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editTitle.trim() || saving}
                    className="inline-flex items-center gap-1 rounded bg-amber-600 px-3 py-1.5 text-[9px] font-medium text-black transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40 typewriter-label"
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    SAVE
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <MessageSquare className="h-4 w-4 shrink-0 text-amber-400/60" />
                    <h1 className="truncate text-base font-semibold text-zinc-200">{discussion.title}</h1>
                    {!discussion.isOpen && (
                      <span className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[8px] text-zinc-500 typewriter-label">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        CLOSED
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[7px] font-medium typewriter-label ${audienceClasses[discussion.visibility]}`}>
                      {getAudienceLabel(discussion.visibility)}
                    </span>
                    {discussion.spectatorVisibility === "all" && (
                      <span className="inline-flex items-center gap-1 rounded border border-violet-500/25 bg-violet-500/15 px-1.5 py-0.5 text-[7px] text-violet-400 typewriter-label">
                        <Eye className="h-2.5 w-2.5" />
                        SPECTATOR VIEW
                      </span>
                    )}
                  </div>
                  {discussion.description && <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{discussion.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[8px] text-zinc-700">
                    <span>Opened {formatDate(discussion.createdAt)}</span>
                    <span>{messages.length} message{messages.length !== 1 ? "s" : ""}</span>
                    <span>{visibleParticipants.length} people</span>
                    {lastMessage && <span>Last activity {formatDate(lastMessage.createdAt)}</span>}
                  </div>
                </div>
                {canClose && (
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    <button
                      onClick={startEdit}
                      className="inline-flex items-center gap-1 rounded border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 text-[8px] text-zinc-500 transition-colors hover:border-[rgba(168,144,112,0.2)] hover:text-zinc-300 typewriter-label"
                    >
                      <Pencil className="h-3 w-3" />
                      EDIT
                    </button>
                    {discussion.isOpen ? (
                      <button
                        onClick={handleClose}
                        className="inline-flex items-center gap-1 rounded border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 text-[8px] text-zinc-500 transition-colors hover:border-[rgba(168,144,112,0.2)] hover:text-zinc-300 typewriter-label"
                      >
                        CLOSE
                      </button>
                    ) : (
                      <button
                        onClick={handleReopen}
                        className="inline-flex items-center gap-1 rounded border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 text-[8px] text-zinc-500 transition-colors hover:border-[rgba(168,144,112,0.2)] hover:text-zinc-300 typewriter-label"
                      >
                        REOPEN
                      </button>
                    )}
                    {badge?.role === "BUREAU" && (
                      <button
                        onClick={() => {
                          setShowParticipantPanel(true);
                          void loadAvailableAgents();
                        }}
                        className="inline-flex items-center gap-1 rounded border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 text-[8px] text-zinc-500 transition-colors hover:border-[rgba(168,144,112,0.2)] hover:text-zinc-300 typewriter-label"
                      >
                        <Users className="h-3 w-3" />
                        PEOPLE
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </header>

          <div
            ref={messagesContainerRef}
            onScroll={(e) => {
              const element = e.currentTarget;
              followMessagesRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
            }}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-[#0a0a0c] p-3 sm:p-4"
          >
            {messageGroups.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="mb-3 h-6 w-6 text-zinc-700" />
                <p className="text-[10px] text-zinc-600 typewriter-label">NO MESSAGES YET</p>
                <p className="mt-1 text-[9px] text-zinc-700">Start the conversation with the first message.</p>
              </div>
            ) : (
              messageGroups.map((group) => (
                <div key={group.date} className="space-y-3">
                  <div className="flex items-center gap-3 py-1">
                    <div className="h-px flex-1 bg-[rgba(168,144,112,0.08)]" />
                    <span className="text-[8px] text-zinc-600 typewriter-label">{group.date}</span>
                    <div className="h-px flex-1 bg-[rgba(168,144,112,0.08)]" />
                  </div>
                  {group.messages.map((msg) => {
                    const isBRU = msg.user.role === "BUREAU";
                    const isAGT = msg.user.role === "AGENT";
                    const isMine = Boolean(badge && msg.user.badgeCode === badge.badgeCode);
                    const displayName = msg.user.isConnected ? msg.user.displayName : msg.user.badgeCode;
                    const isMatch = !searchQuery.trim() || msg.content.toLowerCase().includes(searchQuery.trim().toLowerCase());
                    const roleClass = roleClasses[msg.user.role] || "bg-zinc-500/15 text-zinc-400 border-zinc-500/25";

                    return (
                      <article
                        key={msg.id}
                        ref={(element: HTMLDivElement | null) => {
                          messageRefs.current[msg.id] = element;
                        }}
                        className={`flex gap-2 transition-opacity ${isMine ? "flex-row-reverse" : ""} ${isMatch ? "" : "opacity-45"}`}
                      >
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-[#111113] text-[8px] font-bold ${isMine ? "border-amber-500/30 text-amber-400" : "border-[rgba(168,144,112,0.12)] text-zinc-500"}`}>
                          {getInitials(displayName)}
                        </div>
                        <div className={`max-w-full rounded-xl border p-2.5 sm:max-w-[78%] ${isMine ? "border-[rgba(217,119,6,0.14)] bg-[#15110d]" : "border-[rgba(168,144,112,0.08)] bg-[#111113]"}`}>
                          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                            <span className={`max-w-[150px] truncate text-[8px] font-mono ${isBRU ? "text-amber-300/80" : isAGT ? "text-amber-500/80" : "text-zinc-500"}`}>
                              {displayName}
                            </span>
                            {msg.user.isConnected && (
                              <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1 py-px text-[6px] text-emerald-400/80">CONNECTED</span>
                            )}
                            <span className={`rounded border px-1 py-px text-[6px] typewriter-label ${roleClass}`}>
                              {roleLabels[msg.user.role] || "UNKNOWN"}
                            </span>
                            <time className="ml-auto text-[7px] text-zinc-700">{formatDate(msg.createdAt)}</time>
                          </div>
                          <p className="text-[11px] leading-relaxed text-zinc-400 whitespace-pre-wrap break-words">
                            <HighlightMatch text={msg.content} query={searchQuery} />
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {discussion.isOpen && canDiscuss && badge ? (
            <form onSubmit={handleSend} className="border-t border-[rgba(168,144,112,0.08)] bg-[#0a0a0c] p-3 sm:p-4">
              <div className="flex items-end gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Type your message..."
                  maxLength={5000}
                  rows={1}
                  className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-[rgba(168,144,112,0.1)] bg-[#08080a] px-3 py-2.5 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-[rgba(217,119,6,0.3)]"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-black transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-between px-1 text-[7px] text-zinc-700 typewriter-label">
                <span>Enter to send · Shift + Enter for a new line</span>
                <span>{newMessage.length}/5000</span>
              </div>
            </form>
          ) : (
            <div className="border-t border-[rgba(168,144,112,0.06)] bg-[#111113] p-3 text-center sm:p-4">
              {discussion.isOpen ? (
                <>
                  <Eye className="mx-auto mb-1 h-3.5 w-3.5 text-violet-400/70" />
                  <p className="text-[9px] text-zinc-600 typewriter-label">
                    {badge ? "THIS AUDIENCE IS READ-ONLY FOR YOUR ROLE" : "SPECTATOR MODE · CLAIM A BADGE TO DISCUSS"}
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="mx-auto mb-1 h-3.5 w-3.5 text-zinc-600" />
                  <p className="text-[9px] text-zinc-600 typewriter-label">DISCUSSION CLOSED</p>
                  {canClose && (
                    <button
                      onClick={handleReopen}
                      className="mt-1 text-[8px] text-amber-500/70 transition-colors hover:text-amber-400 typewriter-label"
                    >
                      REOPEN DISCUSSION
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        <aside
          className={`fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-[rgba(168,144,112,0.1)] bg-[#111113] transition-transform lg:static lg:w-auto lg:translate-x-0 ${showSidebar ? "translate-x-0" : "translate-x-full"}`}
        >
          {showSidebar && <button className="fixed inset-0 z-[-1] bg-black/50 lg:hidden" onClick={() => setShowSidebar(false)} aria-label="Close people panel" />}
          <div className="flex items-center justify-between border-b border-[rgba(168,144,112,0.08)] px-4 py-3">
            <div className="flex items-center gap-2 text-[9px] text-zinc-500 typewriter-label">
              <MessageSquare className="h-3.5 w-3.5 text-amber-400/60" />
              CONVERSATION
            </div>
            <button
              onClick={() => setShowSidebar(false)}
              className="text-zinc-600 transition-colors hover:text-zinc-300 lg:hidden"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 border-b border-[rgba(168,144,112,0.06)] p-2">
            <button
              onClick={() => setSidebarTab("people")}
              className={`flex items-center justify-center gap-1 rounded px-2 py-1.5 text-[8px] typewriter-label transition-colors ${sidebarTab === "people" ? "bg-[#0d0d0f] text-zinc-200" : "text-zinc-600 hover:text-zinc-400"}`}
            >
              <Users className="h-3 w-3" />
              PEOPLE
            </button>
            <button
              onClick={() => setSidebarTab("details")}
              className={`flex items-center justify-center gap-1 rounded px-2 py-1.5 text-[8px] typewriter-label transition-colors ${sidebarTab === "details" ? "bg-[#0d0d0f] text-zinc-200" : "text-zinc-600 hover:text-zinc-400"}`}
            >
              <FileText className="h-3 w-3" />
              DETAILS
            </button>
            <button
              onClick={() => setSidebarTab("search")}
              className={`flex items-center justify-center gap-1 rounded px-2 py-1.5 text-[8px] typewriter-label transition-colors ${sidebarTab === "search" ? "bg-[#0d0d0f] text-zinc-200" : "text-zinc-600 hover:text-zinc-400"}`}
            >
              <Search className="h-3 w-3" />
              SEARCH
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {sidebarTab === "people" && (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-[8px] text-zinc-600 typewriter-label">
                    <span>ACTIVE CONTRIBUTORS</span>
                    <span className="font-mono text-emerald-400">{activeContributors.length}</span>
                  </div>
                  {activeContributors.length === 0 ? (
                    <p className="rounded border border-[rgba(168,144,112,0.06)] bg-[#0a0a0c] p-3 text-center text-[9px] text-zinc-700">No connected contributors in this session.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {activeContributors.map((user) => (
                        <span key={user.badgeCode} className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[8px] text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {user.displayName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-[8px] text-zinc-600 typewriter-label">
                    <span>PEOPLE ({visibleParticipants.length})</span>
                    {badge?.role === "BUREAU" && (
                      <button
                        onClick={() => {
                          setShowParticipantPanel(true);
                          void loadAvailableAgents();
                        }}
                        className="inline-flex items-center gap-1 text-amber-400/80 transition-colors hover:text-amber-300"
                      >
                        <UserPlus className="h-3 w-3" />
                        MANAGE
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {visibleParticipants.map((participant) => {
                      const user = participant.user;
                      const badgeCode = user?.badgeCode || "?";
                      const displayName = user?.displayName || "Unknown";
                      const role = user?.role || "UNKNOWN";
                      const connected = activeContributors.some((contributor) => contributor.badgeCode === badgeCode);
                      const participantClass = roleClasses[role] || "bg-zinc-500/15 text-zinc-400 border-zinc-500/25";

                      return (
                        <div key={participant.id} className="flex items-center gap-2 rounded-lg border border-[rgba(168,144,112,0.06)] bg-[#0a0a0c] p-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(168,144,112,0.12)] bg-[#111113] text-[8px] font-bold text-zinc-500">
                            {getInitials(displayName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-[9px] font-mono text-zinc-300">{badgeCode}</span>
                              {participant.userId === discussion.createdById && <span className="text-[6px] text-amber-400/80">HOST</span>}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="truncate text-[8px] text-zinc-600">{displayName}</span>
                              {connected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                            </div>
                          </div>
                          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[7px] typewriter-label ${participantClass}`}>
                            {roleLabels[role] || role}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-[rgba(168,144,112,0.06)] bg-[#0a0a0c] p-3">
                  <div className="mb-2 text-[8px] text-zinc-600 typewriter-label">MESSAGE BREAKDOWN</div>
                  <div className="space-y-2 text-[8px]">
                    {Object.entries(messageCountByRole).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between">
                        <span className={`rounded border px-1.5 py-0.5 typewriter-label ${roleClasses[role] || "border-zinc-500/25 text-zinc-400"}`}>
                          {roleLabels[role] || role}
                        </span>
                        <span className="font-mono text-zinc-300">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {sidebarTab === "details" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-[rgba(168,144,112,0.08)] bg-[#0a0a0c] p-3">
                  <div className="mb-3 text-[8px] text-zinc-600 typewriter-label">SESSION INFORMATION</div>
                  <dl className="space-y-2.5 text-[9px]">
                    <div className="flex items-start justify-between gap-2">
                      <dt className="text-zinc-600">Opened</dt>
                      <dd className="text-right text-zinc-300">{formatDate(discussion.createdAt)}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <dt className="text-zinc-600">Last updated</dt>
                      <dd className="text-right text-zinc-300">{formatDate(discussion.updatedAt)}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <dt className="text-zinc-600">Messages</dt>
                      <dd className="font-mono text-zinc-300">{messages.length}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <dt className="text-zinc-600">Participants</dt>
                      <dd className="font-mono text-zinc-300">{visibleParticipants.length}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <dt className="text-zinc-600">Last activity</dt>
                      <dd className="text-right text-zinc-300">{lastMessage ? formatDate(lastMessage.createdAt) : "—"}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg border border-[rgba(168,144,112,0.08)] bg-[#0a0a0c] p-3">
                  <div className="mb-3 text-[8px] text-zinc-600 typewriter-label">VISIBILITY</div>
                  <div className="space-y-2 text-[9px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-600">Audience</span>
                      <span className={`rounded border px-1.5 py-0.5 typewriter-label ${audienceClasses[discussion.visibility]}`}>
                        {getAudienceLabel(discussion.visibility)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-600">Spectators</span>
                      <span className="font-mono text-zinc-300">
                        {discussion.spectatorVisibility === "all" ? "ALL VISITORS" : "PARTICIPANTS ONLY"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-600">Discussion</span>
                      <span className={`font-mono ${discussion.isOpen ? "text-emerald-400" : "text-zinc-500"}`}>
                        {discussion.isOpen ? "OPEN" : "CLOSED"}
                      </span>
                    </div>
                  </div>
                </div>

                {discussion.description && (
                  <div className="rounded-lg border border-[rgba(168,144,112,0.08)] bg-[#0a0a0c] p-3">
                    <div className="mb-2 text-[8px] text-zinc-600 typewriter-label">BRIEF</div>
                    <p className="text-[9px] leading-relaxed text-zinc-500">{discussion.description}</p>
                  </div>
                )}

                {discussion.summary && (
                  <div className="rounded-lg border border-[rgba(217,119,6,0.2)] bg-[#0d0c0a] p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-[8px] text-amber-500/80 typewriter-label">
                      <Lock className="h-3 w-3" />
                      SEALED SESSION
                    </div>
                    <p className="text-[9px] leading-relaxed text-amber-100/60">{discussion.summary}</p>
                  </div>
                )}
              </div>
            )}

            {sidebarTab === "search" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-700" />
                  <input
                    ref={(element) => {
                      if (element && sidebarTab === "search") element.focus();
                    }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full rounded-lg border border-[rgba(168,144,112,0.1)] bg-[#0a0a0c] py-2 pl-8 pr-8 text-[10px] text-zinc-300 outline-none transition-colors placeholder:text-zinc-700 focus:border-[rgba(217,119,6,0.3)]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors hover:text-zinc-300"
                      aria-label="Clear message search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[8px] text-zinc-600 typewriter-label">
                  <span>RESULTS</span>
                  <span className="font-mono text-zinc-400">{searchResults.length}</span>
                </div>

                <div className="space-y-2">
                  {searchQuery && searchResults.length === 0 && (
                    <div className="rounded-lg border border-[rgba(168,144,112,0.06)] bg-[#0a0a0c] p-4 text-center">
                      <Search className="mx-auto mb-2 h-4 w-4 text-zinc-700" />
                      <p className="text-[9px] text-zinc-600">No matching messages</p>
                    </div>
                  )}
                  {searchResults.map((message) => {
                    const isMine = Boolean(badge && message.user.badgeCode === badge.badgeCode);
                    return (
                      <button
                        key={message.id}
                        onClick={() => jumpToMessage(message.id)}
                        className={`w-full rounded-lg border p-2.5 text-left transition-colors ${isMine ? "border-[rgba(217,119,6,0.12)] bg-[#15110d]" : "border-[rgba(168,144,112,0.06)] bg-[#0a0a0c]"} hover:border-[rgba(217,119,6,0.25)]`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className={`truncate text-[8px] font-mono ${isMine ? "text-amber-400/80" : "text-zinc-500"}`}>
                            {message.user.badgeCode}
                          </span>
                          <span className="text-[7px] text-zinc-700">{formatDate(message.createdAt)}</span>
                        </div>
                        <p className="line-clamp-2 text-[9px] leading-relaxed text-zinc-500">
                          <HighlightMatch text={message.content} query={searchQuery} />
                        </p>
                        <span className="mt-2 inline-flex items-center gap-1 text-[7px] text-zinc-700 typewriter-label">
                          VIEW MESSAGE <ChevronRight className="h-2.5 w-2.5" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {showReopenConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-lg border-2 border-[rgba(220,38,38,0.3)] bg-[#111113] p-6"
          >
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <h3 className="text-sm font-semibold text-zinc-200 typewriter-label">CONFIRM REOPEN</h3>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-zinc-500">
              Reopening this discussion will <span className="font-medium text-red-400">permanently delete all previous messages</span>.
              A short summary of the previous session will be saved as a sealed file.
            </p>
            <p className="mb-6 text-[10px] text-zinc-600">This action cannot be undone. Are you sure?</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowReopenConfirm(false)}
                className="flex-1 rounded border border-[rgba(168,144,112,0.1)] px-3 py-2 text-[9px] font-medium text-zinc-500 transition-colors hover:border-[rgba(168,144,112,0.2)] hover:text-zinc-300 typewriter-label"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmReopen}
                className="flex-1 rounded bg-red-600 px-3 py-2 text-[9px] font-medium text-black transition-colors hover:bg-red-500 typewriter-label"
              >
                REOPEN &amp; WIPE HISTORY
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showParticipantPanel && badge?.role === "BUREAU" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl border-t border-[rgba(168,144,112,0.2)] bg-[#111113] p-4 sm:rounded-xl sm:border-2"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-400/70" />
                <h3 className="text-sm font-semibold text-zinc-200 typewriter-label">MANAGE PARTICIPANTS</h3>
              </div>
              <button onClick={() => setShowParticipantPanel(false)} className="text-zinc-500 transition-colors hover:text-zinc-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4">
              <h4 className="mb-2 text-[9px] text-zinc-500 typewriter-label">CURRENT PARTICIPANTS ({participants.length})</h4>
              {participants.length === 0 ? (
                <p className="text-[10px] text-zinc-600">No participants yet</p>
              ) : (
                <div className="space-y-1.5 overflow-auto">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between rounded border border-[rgba(168,144,112,0.06)] bg-[#0a0a0c] p-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-xs font-mono text-amber-400">{participant.user?.badgeCode ?? "?"}</span>
                        <span className="truncate text-xs text-zinc-400">{participant.user?.displayName ?? "Unknown"}</span>
                        <span className={`rounded px-1.5 py-px text-[8px] ${roleClasses[participant.user?.role || ""] || "bg-zinc-500/20 text-zinc-500"}`}>
                          {participant.user?.role ?? "UNKNOWN"}
                        </span>
                      </div>
                      {participant.userId !== discussion.createdById && (
                        <button
                          onClick={async () => {
                            try {
                              await fetch(`/api/agent/discussions/${params.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  participantIds: participants.filter((item) => item.userId !== participant.userId).map((item) => item.userId),
                                }),
                              });
                              await loadParticipants();
                            } catch {
                              toast.error("Failed to remove participant");
                            }
                          }}
                          className="text-red-400/70 transition-colors hover:text-red-400"
                          aria-label={`Remove ${participant.user?.badgeCode ?? "participant"}`}
                        >
                          <UserMinus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <h4 className="mb-2 text-[9px] text-zinc-500 typewriter-label">ADD PARTICIPANTS</h4>
              {loadingAgents ? (
                <div className="p-4 text-center text-sm text-zinc-500">Loading users...</div>
              ) : (
                <div className="max-h-56 space-y-1 overflow-auto">
                  {availableAgents
                    .filter((agent) => !participants.some((participant) => participant.userId === agent.id))
                    .map((agent) => (
                      <label key={agent.id} className={`flex items-center gap-2 rounded px-3 py-2 transition-colors hover:bg-[#0a0a0c] ${selectedAgentIds.includes(agent.id) ? "bg-amber-500/10" : ""}`}>
                        <input
                          type="checkbox"
                          checked={selectedAgentIds.includes(agent.id)}
                          onChange={() =>
                            setSelectedAgentIds((current) =>
                              current.includes(agent.id) ? current.filter((id) => id !== agent.id) : [...current, agent.id],
                            )
                          }
                          className="h-4 w-4 accent-amber-500"
                        />
                        <span className="text-xs font-mono text-amber-400">{agent.badgeCode}</span>
                        <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">{agent.displayName}</span>
                        <span className={`rounded px-1.5 py-px text-[9px] ${roleClasses[agent.role] || "bg-zinc-500/20 text-zinc-500"}`}>
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
                          participantIds: [...new Set([...participants.map((participant) => participant.userId), ...selectedAgentIds])],
                        }),
                      });
                      setSelectedAgentIds([]);
                      await loadParticipants();
                      toast.success("Participants added");
                    } catch {
                      toast.error("Failed to add participants");
                    }
                  }}
                  className="mt-2 w-full rounded bg-amber-600 px-3 py-2 text-[9px] font-medium text-black transition-colors hover:bg-amber-500 typewriter-label"
                >
                  ADD {selectedAgentIds.length} PARTICIPANT{selectedAgentIds.length !== 1 ? "S" : ""}
                </button>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-[rgba(168,144,112,0.1)] pt-4">
              <button onClick={() => setShowParticipantPanel(false)} className="flex-1 rounded border border-[rgba(168,144,112,0.1)] px-3 py-2 text-[9px] font-medium text-zinc-500 transition-colors hover:border-[rgba(168,144,112,0.2)] hover:text-zinc-300 typewriter-label">
                DONE
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
