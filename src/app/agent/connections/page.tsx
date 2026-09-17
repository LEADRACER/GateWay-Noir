"use client";

import { useBadge } from "@/components/badge/BadgeProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Loader2,
  Users,
  UserMinus,
  AlertCircle,
  Shield,
  Activity,
  Link,
  Sparkles,
  Clock,
  UserCheck,
  UserPlus,
  Network,
  Hourglass,
  Check,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

interface UserSummary {
  id: string;
  badgeCode: string;
  displayName: string;
  role: "AGENT" | "BUREAU";
}

interface Connection {
  id: string;
  connectedUserId: string;
  createdAt: string;
  status: "accepted";
  connectedUser: UserSummary;
}

interface ConnectionRequestPayload {
  id: string;
  createdAt: string;
  connectedUser?: UserSummary;
  user?: UserSummary;
}

interface ConnectionRequestResponse {
  sent?: ConnectionRequestPayload[];
  received?: ConnectionRequestPayload[];
}

interface ConnectionRequest {
  id: string;
  createdAt: string;
  direction: "sent" | "received";
  user: UserSummary;
}

interface SearchResult extends UserSummary {
  isConnected: boolean;
  isSelf: boolean;
  requestState: "none" | "sent" | "received";
}

interface ConnectionStats {
  total: number;
  agents: number;
  bureau: number;
  thisWeek: number;
  mutual: number;
  pendingSent: number;
  pendingReceived: number;
}

type TabType = "all" | "requests" | "agents" | "bureau" | "recent";
type RequestView = "received" | "sent";

const statCards = [
  { key: "total", label: "TOTAL", icon: Users, color: "text-amber-400", bg: "bg-amber-500/10" },
  { key: "agents", label: "AGENTS", icon: UserCheck, color: "text-blue-400", bg: "bg-blue-500/10" },
  { key: "bureau", label: "BUREAU", icon: Shield, color: "text-amber-400", bg: "bg-amber-500/10" },
  { key: "thisWeek", label: "THIS WEEK", icon: Clock, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { key: "mutual", label: "MUTUAL", icon: Link, color: "text-purple-400", bg: "bg-purple-500/10" },
  { key: "pendingSent", label: "SENT", icon: Hourglass, color: "text-zinc-400", bg: "bg-zinc-500/10" },
  { key: "pendingReceived", label: "RECEIVED", icon: UserPlus, color: "text-rose-400", bg: "bg-rose-500/10" },
] as const;

const tabs = [
  { id: "all", label: "ALL", icon: Network },
  { id: "requests", label: "REQUESTS", icon: Hourglass },
  { id: "agents", label: "AGENTS", icon: UserCheck },
  { id: "bureau", label: "BUREAU", icon: Shield },
  { id: "recent", label: "RECENT", icon: Clock },
] as const;

function ConnectionsPage() {
  const { badge, loading: badgeLoading } = useBadge();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [stats, setStats] = useState<ConnectionStats>({
    total: 0,
    agents: 0,
    bureau: 0,
    thisWeek: 0,
    mutual: 0,
    pendingSent: 0,
    pendingReceived: 0,
  });
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [requestView, setRequestView] = useState<RequestView>("received");

  // Refs to avoid dependency loop in searchUsers
  const connectionsRef = useRef(connections);
  const requestsRef = useRef(requests);
  const badgeIdRef = useRef(badge?.id);

  // Keep refs in sync
  connectionsRef.current = connections;
  requestsRef.current = requests;
  badgeIdRef.current = badge?.id;

  const refreshConnections = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/agent/connections", { signal });
      if (!res.ok) return;
      const data = await res.json();
      const connData = data.connections || [];
      setConnections(connData);

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStats((prev) => ({
        ...prev,
        total: connData.length,
        agents: connData.filter((connection: Connection) => connection.connectedUser.role === "AGENT").length,
        bureau: connData.filter((connection: Connection) => connection.connectedUser.role === "BUREAU").length,
        thisWeek: connData.filter((connection: Connection) => new Date(connection.createdAt) > weekAgo).length,
      }));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Silent fail keeps the page usable when the API is unavailable.
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRequests = useCallback(async (signal?: AbortSignal) => {
    try {
      setRequestsLoading(true);
      const res = await fetch("/api/agent/connections/requests", { signal });
      if (!res.ok) return;
      const data = (await res.json()) as ConnectionRequestResponse;

      const sent = (data.sent || []).map((request) => ({
        id: request.id,
        createdAt: request.createdAt,
        direction: "sent" as const,
        user: request.connectedUser as UserSummary,
      }));
      const received = (data.received || []).map((request) => ({
        id: request.id,
        createdAt: request.createdAt,
        direction: "received" as const,
        user: request.user as UserSummary,
      }));

      setRequests([...sent, ...received]);
      setStats((prev) => ({
        ...prev,
        pendingSent: sent.length,
        pendingReceived: received.length,
      }));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Silent fail keeps the page usable when the API is unavailable.
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const refreshStats = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/agent/connections/stats", { signal });
      if (!res.ok) return;
      const data = await res.json();
      setStats((prev) => ({
        ...prev,
        total: data.totalConnections ?? prev.total,
        mutual: data.mutualConnections ?? prev.mutual,
        pendingSent: data.pendingSent ?? prev.pendingSent,
        pendingReceived: data.pendingReceived ?? prev.pendingReceived,
      }));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Silent fail keeps the page usable when the API is unavailable.
    }
  }, []);

  useEffect(() => {
    if (badgeLoading) return undefined;

    const controller = new AbortController();
    const { signal } = controller;

    const timeout = setTimeout(() => {
      void Promise.all([
        refreshConnections(signal),
        refreshRequests(signal),
        refreshStats(signal),
      ]);
    }, 0);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [badgeLoading, refreshConnections, refreshRequests, refreshStats]);

  const searchUsers = useCallback(async () => {
    if (!searchQuery.trim() || searching) return;
    setSearching(true);
    try {
      const res = await fetch("/api/agent/users");
      if (!res.ok) return;
      const data = await res.json();
      const connectedIds = new Set(connectionsRef.current.map((connection) => connection.connectedUserId));
      const sentRequestIds = new Set(requestsRef.current.filter((request) => request.direction === "sent").map((request) => request.user.id));
      const receivedRequestIds = new Set(requestsRef.current.filter((request) => request.direction === "received").map((request) => request.user.id));

      const results = (data.agents || [])
        .filter((agent: UserSummary) =>
          agent.badgeCode.toUpperCase().includes(searchQuery.trim().toUpperCase()) ||
          agent.displayName.toLowerCase().includes(searchQuery.trim().toLowerCase()),
        )
        .map((agent: UserSummary): SearchResult => {
          const isConnected = connectedIds.has(agent.id);
          const isSent = sentRequestIds.has(agent.id);
          const isReceived = receivedRequestIds.has(agent.id);
          return {
            ...agent,
            isConnected,
            isSelf: badgeIdRef.current === agent.id,
            requestState: isConnected ? "none" : isSent ? "sent" : isReceived ? "received" : "none",
          };
        });

      setSearchResults(results);
      setShowSearchResults(true);
    } catch {
      toast.error("Failed to search users");
    } finally {
      setSearching(false);
    }
  }, [searchQuery, searching]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(searchUsers, 300);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setShowSearchResults(false), 0);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const sendRequest = async (targetUserId: string, targetBadgeCode: string, targetDisplayName: string, signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/agent/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badgeCode: targetBadgeCode }),
        signal,
      });
      const data = await res.json();
      if (!data.request) {
        toast.error(data.error || "Failed to send request");
        return;
      }

      setRequests((prev) => {
        if (prev.some((request) => request.id === data.request.id)) return prev;
        return [
          {
            id: data.request.id,
            createdAt: new Date().toISOString(),
            direction: "sent",
            user: {
              id: data.request.connectedUserId,
              badgeCode: data.request.badgeCode,
              displayName: data.request.displayName,
              role: data.request.role,
            },
          },
          ...prev,
        ];
      });
      setSearchResults((prev) => prev.map((result) =>
        result.id === targetUserId ? { ...result, requestState: "sent" } : result,
      ));
      toast.success(`Request sent to ${targetDisplayName}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Network error");
    }
  };

  const respondToRequest = async (requestId: string, action: "accept" | "reject", signal?: AbortSignal) => {
    const request = requests.find((item) => item.id === requestId);
    try {
      const res = await fetch(`/api/agent/connections/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        signal,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || `Failed to ${action} request`);
        return;
      }

      setRequests((prev) => prev.filter((item) => item.id !== requestId));
      if (action === "accept" && request) {
        setConnections((prev) => [
          ...prev,
          {
            id: data.connectionId || requestId,
            connectedUserId: request.user.id,
            createdAt: new Date().toISOString(),
            status: "accepted",
            connectedUser: request.user,
          },
        ]);
        toast.success(`Connected to ${request.user.displayName}`);
      } else {
        toast.success("Request rejected");
      }

      // Optimistic update already applied, just refresh stats
      await refreshStats(signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Network error");
    }
  };

  const cancelRequest = async (requestId: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/agent/connections/${requestId}`, { method: "DELETE", signal });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to cancel request");
        return;
      }
      setRequests((prev) => prev.filter((request) => request.id !== requestId));
      toast.success("Request cancelled");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Network error");
    }
  };

  const removeConnection = async (connectionId: string, badgeCode: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/agent/connections/${connectionId}`, { method: "DELETE", signal });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to remove connection");
        return;
      }
      setConnections((prev) => prev.filter((connection) => connection.id !== connectionId));
      setSearchResults((prev) => prev.map((result) =>
        result.badgeCode === badgeCode ? { ...result, requestState: "none", isConnected: false } : result,
      ));
      toast.success("Connection removed");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Network error");
    }
  };

  const viewMutualConnections = async (userId: string, displayName: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/agent/connections/mutual/${userId}`, { signal });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${data.count || 0} mutual connections with ${displayName}`);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Failed to load mutual connections");
    }
  };

  const filteredConnections = useMemo(() => {
    if (activeTab === "agents") return connections.filter((connection) => connection.connectedUser.role === "AGENT");
    if (activeTab === "bureau") return connections.filter((connection) => connection.connectedUser.role === "BUREAU");
    if (activeTab === "recent") return [...connections].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
    return connections;
  }, [connections, activeTab]);

  const receivedRequests = requests.filter((request) => request.direction === "received");
  const sentRequests = requests.filter((request) => request.direction === "sent");

  if (badgeLoading || loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
      </div>
    );
  }

  if (!badge || !["AGENT", "BUREAU"].includes(badge.role)) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <AlertCircle className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
        <p className="text-zinc-500 text-sm">This feature is for AGT and BRU only</p>
        <button
          onClick={() => router.push("/agent/discussions")}
          className="mt-4 text-[10px] text-amber-500/70 hover:text-amber-400 typewriter-label"
        >
          ← BACK TO DISCUSSIONS
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => router.push("/agent/discussions")}
          className="inline-flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 mb-6 typewriter-label transition-colors min-h-[36px]"
        >
          <ArrowLeft className="w-3 h-3" />
          DISCUSSIONS
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-200 typewriter-label">CONNECTIONS</h1>
            <p className="text-[10px] text-zinc-600">Send requests and build your trusted network</p>
          </div>
        </div>
        <p className="text-[10px] text-zinc-600 mb-6">
          Connections are activated only after the other AGT or BRU accepts your request.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6"
        >
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.04 }}
              className={`rounded-lg border border-[rgba(168,144,112,0.08)] p-3 ${stat.bg} hover:border-[rgba(168,144,112,0.2)] transition-colors`}
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-[8px] font-medium typewriter-label uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="text-2xl font-mono font-bold text-zinc-100">{stats[stat.key as keyof ConnectionStats]}</div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-1 mb-6 bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg p-1"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[9px] font-medium rounded-md typewriter-label transition-all ${
                activeTab === tab.id
                  ? "bg-amber-600 text-black shadow-[0_4px_12px_rgba(217,119,6,0.3)]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative mb-6"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by badge code or display name..."
            className="w-full bg-[#111113] border border-[rgba(168,144,112,0.1)] pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[rgba(168,144,112,0.25)] transition-colors"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 animate-spin" />}
        </motion.div>

        <AnimatePresence>
          {activeTab !== "requests" && receivedRequests.length > 0 && (
            <motion.div
              key="request-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden rounded-lg border border-rose-500/20 bg-rose-500/5"
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-rose-400" />
                  <p className="text-[10px] text-rose-300 typewriter-label">{receivedRequests.length} REQUEST{receivedRequests.length === 1 ? "" : "S"} WAITING FOR YOU</p>
                </div>
                <button
                  onClick={() => setActiveTab("requests")}
                  className="text-[9px] text-rose-300 hover:text-rose-200 typewriter-label underline"
                >
                  REVIEW
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === "requests" ? (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-200 typewriter-label">CONNECTION REQUESTS</p>
                  <p className="text-[9px] text-zinc-600">Requests are private until accepted</p>
                </div>
                {requestsLoading && <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />}
              </div>

              <div className="flex gap-1 mb-4 bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg p-1">
                <button
                  onClick={() => setRequestView("received")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[9px] rounded-md typewriter-label transition-all ${
                    requestView === "received" ? "bg-rose-500/20 text-rose-300" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  RECEIVED {receivedRequests.length > 0 && `(${receivedRequests.length})`}
                </button>
                <button
                  onClick={() => setRequestView("sent")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[9px] rounded-md typewriter-label transition-all ${
                    requestView === "sent" ? "bg-zinc-500/20 text-zinc-300" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Hourglass className="w-3.5 h-3.5" />
                  SENT {sentRequests.length > 0 && `(${sentRequests.length})`}
                </button>
              </div>

              {requestView === "received" ? (
                receivedRequests.length === 0 ? (
                  <div className="rounded-lg border border-[rgba(168,144,112,0.08)] bg-[#111113] p-8 text-center">
                    <UserCheck className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-zinc-600 text-xs typewriter-label">NO PENDING REQUESTS</p>
                    <p className="text-zinc-700 text-[10px] mt-1">New requests will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {receivedRequests.map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        direction="received"
                        onRespond={respondToRequest}
                      />
                    ))}
                  </div>
                )
              ) : sentRequests.length === 0 ? (
                <div className="rounded-lg border border-[rgba(168,144,112,0.08)] bg-[#111113] p-8 text-center">
                  <Hourglass className="w-8 h-16 mx-auto mb-2 text-zinc-700" />
                  <p className="text-zinc-600 text-xs typewriter-label">NO SENT REQUESTS</p>
                  <p className="text-zinc-700 text-[10px] mt-1">Search for an AGT or BRU to send a request</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sentRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      direction="sent"
                      onCancel={cancelRequest}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="search-and-connections"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AnimatePresence>
                {showSearchResults && searchResults.length > 0 && (
                  <motion.div
                    key="search-results"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg mb-6 max-h-60 overflow-auto"
                  >
                    <div className="px-4 py-2 border-b border-[rgba(168,144,112,0.08)] flex items-center justify-between">
                      <p className="text-[9px] text-zinc-500 typewriter-label">SEARCH RESULTS</p>
                      <span className="px-1.5 py-0.5 text-[8px] font-medium bg-zinc-500/10 text-zinc-400 rounded typewriter-label">{searchResults.length} found</span>
                    </div>
                    <div className="divide-y divide-[rgba(168,144,112,0.06)]">
                      {searchResults.map((user) => (
                        <motion.div key={user.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between px-4 py-3 hover:bg-[#0a0a0c] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user.role === "BUREAU" ? "bg-amber-500/10" : "bg-blue-500/10"}`}>
                              <span className={`text-xs font-mono ${user.role === "BUREAU" ? "text-amber-400" : "text-blue-400"}`}>{user.badgeCode}</span>
                            </div>
                            <div>
                              <p className="text-sm text-zinc-300">{user.displayName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[8px] px-1.5 py-[1px] rounded ${user.role === "BUREAU" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>{user.role}</span>
                                {user.isSelf && <span className="text-[8px] text-zinc-600 typewriter-label">YOU</span>}
                                {user.isConnected && <span className="text-[8px] text-emerald-400 typewriter-label">CONNECTED</span>}
                                {user.requestState === "sent" && <span className="text-[8px] text-zinc-400 typewriter-label">REQUESTED</span>}
                                {user.requestState === "received" && <span className="text-[8px] text-rose-400 typewriter-label">REQUEST RECEIVED</span>}
                              </div>
                            </div>
                          </div>
                          {user.isSelf ? (
                            <span className="text-[9px] text-zinc-600 typewriter-label">YOU</span>
                          ) : user.isConnected ? (
                            <span className="text-[9px] text-emerald-400 typewriter-label">CONNECTED</span>
                          ) : user.requestState === "sent" ? (
                            <span className="text-[9px] text-zinc-500 typewriter-label">WAITING</span>
                          ) : user.requestState === "received" ? (
                            <button onClick={() => setActiveTab("requests")} className="text-[9px] text-rose-300 hover:text-rose-200 typewriter-label underline">REVIEW</button>
                          ) : (
                            <button onClick={() => sendRequest(user.id, user.badgeCode, user.displayName)} className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-medium bg-amber-600 text-black hover:bg-amber-500 typewriter-label transition-colors">
                              <UserPlus className="w-3 h-3" />
                              REQUEST
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {showSearchResults && searchResults.length === 0 && searchQuery.trim() && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg mb-6 p-6 text-center">
                  <Search className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-600 text-sm">No users found matching &ldquo;{searchQuery}&rdquo;</p>
                  <p className="text-[10px] text-zinc-700 mt-1">Try a badge code such as AGT-ABCD or a display name</p>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg">
                <div className="px-4 py-3 border-b border-[rgba(168,144,112,0.08)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-amber-400/70" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-200 typewriter-label">ACCEPTED CONNECTIONS</p>
                      <p className="text-[9px] text-zinc-600">Both members have accepted the request</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-[9px] font-medium bg-amber-500/20 text-amber-400 rounded typewriter-label">{filteredConnections.length} / {stats.total}</span>
                </div>
                {filteredConnections.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-3">
                      <Users className="w-8 h-8 text-zinc-700" />
                    </div>
                    <p className="text-zinc-600 text-xs typewriter-label mb-1">NO ACCEPTED CONNECTIONS</p>
                    <p className="text-zinc-700 text-[10px] mb-4">Send a request to start building your network</p>
                    {activeTab !== "all" && (
                      <button onClick={() => setActiveTab("all")} className="text-[10px] text-amber-500/70 hover:text-amber-400 typewriter-label underline">Show all connections</button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-[rgba(168,144,112,0.06)]">
                    {filteredConnections.map((connection, index) => (
                      <motion.div key={connection.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} className="flex items-center justify-between px-4 py-3 hover:bg-[#0a0a0c] transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${connection.connectedUser.role === "BUREAU" ? "bg-amber-500/10" : "bg-blue-500/10"}`}>
                            <span className={`text-xs font-mono ${connection.connectedUser.role === "BUREAU" ? "text-amber-400" : "text-blue-400"}`}>{connection.connectedUser.badgeCode}</span>
                          </div>
                          <div>
                            <p className="text-sm text-zinc-300 font-medium">{connection.connectedUser.displayName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[8px] px-1.5 py-[1px] rounded ${connection.connectedUser.role === "BUREAU" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>{connection.connectedUser.role}</span>
                              <span className="text-[8px] text-zinc-600 typewriter-label">Since {new Date(connection.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => viewMutualConnections(connection.connectedUserId, connection.connectedUser.displayName)} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded" title="View mutual connections"><Link className="w-4 h-4" /></button>
                          <button onClick={() => removeConnection(connection.id, connection.connectedUser.badgeCode)} className="p-1.5 text-red-400/70 hover:text-red-400 transition-colors rounded" title="Remove connection"><UserMinus className="w-4 h-4" /></button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-8 grid grid-cols-2 gap-3">
          <button onClick={() => router.push("/agent/discussions")} className="flex flex-col items-center gap-2 p-4 bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg hover:border-[rgba(168,144,112,0.2)] transition-colors">
            <Activity className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] font-medium typewriter-label text-zinc-300">DISCUSSIONS</span>
            <span className="text-[8px] text-zinc-600">Join active threads</span>
          </button>
          <button onClick={() => router.push("/agent/tasks")} className="flex flex-col items-center gap-2 p-4 bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg hover:border-[rgba(168,144,112,0.2)] transition-colors">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <span className="text-[10px] font-medium typewriter-label text-zinc-300">TASKS</span>
            <span className="text-[8px] text-zinc-600">View assignments</span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

function RequestCard({
  request,
  direction,
  onRespond,
  onCancel,
}: {
  request: ConnectionRequest;
  direction: "sent" | "received";
  onRespond?: (requestId: string, action: "accept" | "reject") => void;
  onCancel?: (requestId: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[rgba(168,144,112,0.08)] bg-[#111113] px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${direction === "received" ? "bg-rose-500/10" : "bg-zinc-500/10"}`}>
          {direction === "received" ? <UserPlus className="w-4 h-4 text-rose-400" /> : <Hourglass className="w-4 h-4 text-zinc-400" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-zinc-300 font-medium truncate">{request.user.displayName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[8px] px-1.5 py-[1px] rounded ${request.user.role === "BUREAU" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>{request.user.role}</span>
            <span className="text-[8px] font-mono text-zinc-500">{request.user.badgeCode}</span>
            <span className={`text-[8px] typewriter-label ${direction === "received" ? "text-rose-400" : "text-zinc-500"}`}>{direction === "received" ? "WANTS TO CONNECT" : "WAITING FOR RESPONSE"}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {direction === "received" && onRespond && (
          <>
            <button onClick={() => onRespond(request.id, "accept")} className="inline-flex items-center gap-1 px-2 py-1.5 text-[9px] font-medium bg-emerald-600 text-black rounded hover:bg-emerald-500 typewriter-label transition-colors"><Check className="w-3 h-3" />ACCEPT</button>
            <button onClick={() => onRespond(request.id, "reject")} className="inline-flex items-center gap-1 px-2 py-1.5 text-[9px] font-medium bg-zinc-700 text-zinc-200 rounded hover:bg-zinc-600 typewriter-label transition-colors"><X className="w-3 h-3" />DECLINE</button>
          </>
        )}
        {direction === "sent" && onCancel && (
          <button onClick={() => onCancel(request.id)} className="inline-flex items-center gap-1 px-2 py-1.5 text-[9px] font-medium bg-zinc-700 text-zinc-200 rounded hover:bg-zinc-600 typewriter-label transition-colors">CANCEL</button>
        )}
      </div>
    </div>
  );
}

export default function ConnectionsPageWrapper() {
  return (
    <ErrorBoundary>
      <ConnectionsPage />
    </ErrorBoundary>
  );
}