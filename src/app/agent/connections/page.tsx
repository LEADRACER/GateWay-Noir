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
  UserPlus,
  RefreshCw,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";

interface UserSummary {
  id: string;
  badgeCode: string;
  displayName: string;
  role: "AGENT" | "BUREAU" | "DETECTIVE";
}

interface Connection {
  id: string;
  userId: string;
  connectedUserId: string;
  status: "following" | "mutual";
  createdAt: string;
  connectedUser: UserSummary;
}

interface SearchResult extends UserSummary {
  isConnected: boolean;
  isSelf: boolean;
  hasFollowedMe: boolean;
}

type ConnectionState = "outgoing" | "incoming" | "mutual";

function ConnectionsPage() {
  const { badge, loading: badgeLoading } = useBadge();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [connectionState, setConnectionState] = useState<Record<string, ConnectionState>>({});

  const connectionsRef = useRef(connections);
  const badgeIdRef = useRef(badge?.id);

  useEffect(() => {
    connectionsRef.current = connections;
    badgeIdRef.current = badge?.id;
  }, [connections, badge?.id]);

  const refreshConnections = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/agent/connections", { signal });
      if (!res.ok) return;
      const data = await res.json();
      const allConnections: Connection[] = [
        ...(data.outgoing || []).map((c: { connectedUserId: string; userId: string }) => ({ ...c, status: "following" as const })),
        ...(data.incoming || []).map((c: { connectedUserId: string; userId: string }) => ({ ...c, status: "following" as const })),
        ...(data.mutual || []).map((c: { connectedUserId: string; userId: string }) => ({ ...c, status: "mutual" as const })),
      ];
      setConnections(allConnections);

      const states: Record<string, ConnectionState> = {};
      for (const c of allConnections) {
        if (c.status === "mutual") {
          states[c.connectedUserId] = "mutual";
        } else if (c.userId === badge?.id) {
          states[c.connectedUserId] = "outgoing";
        } else {
          states[c.connectedUserId] = "incoming";
        }
      }
      setConnectionState(states);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [badge]);

  useEffect(() => {
    if (badgeLoading) return undefined;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshConnections(controller.signal);
    return () => controller.abort();
  }, [badgeLoading, refreshConnections, badge?.id]);

  const searchUsers = useCallback(async () => {
    if (!searchQuery.trim() || searching) return;
    setSearching(true);
    try {
      const res = await fetch("/api/agent/users");
      if (!res.ok) return;
      const data = await res.json();
      const agents = data.agents || [];
      const query = searchQuery.trim().toLowerCase();
      const queryUpper = searchQuery.trim().toUpperCase();
      const filteredAgents = agents.filter((agent: UserSummary) => {
        if (agent.role === "DETECTIVE") return false;
        if (badge?.id === agent.id) return false;
        return (
          agent.badgeCode.toUpperCase().includes(queryUpper) ||
          agent.displayName.toLowerCase().includes(query)
        );
      });
      const connectedIds = new Set(connectionsRef.current.map((c) => c.connectedUserId));

      const results: SearchResult[] = filteredAgents.map((agent: UserSummary): SearchResult => {
        const isConnected = connectedIds.has(agent.id);
        const state = connectionState[agent.id];
        return {
          ...agent,
          isConnected: isConnected && state === "mutual",
          isSelf: false,
          hasFollowedMe: state === "incoming",
        };
      });

      setSearchResults(results);
      setShowSearchResults(true);
    } catch {
      toast.error("Failed to search users");
    } finally {
      setSearching(false);
    }
  }, [searchQuery, searching, connectionState, badge?.id]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(searchUsers, 300);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setShowSearchResults(false), 0);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const followUser = async (targetUserId: string, targetBadgeCode: string, signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/agent/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badgeCode: targetBadgeCode }),
        signal,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to follow");
        return;
      }
      toast.success("Follow request sent");
      await refreshConnections(signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Network error");
    }
  };

  const followBack = async (targetUserId: string, targetBadgeCode: string, signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/agent/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badgeCode: targetBadgeCode }),
        signal,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to follow back");
        return;
      }
      toast.success("Connection established");
      await refreshConnections(signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Network error");
    }
  };

  const unfollowUser = async (connectionId: string, targetBadgeCode: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/agent/connections/${connectionId}`, {
        method: "DELETE",
        signal,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to unfollow");
        return;
      }
      toast.success("Unfollowed");
      await refreshConnections(signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortController") return;
      toast.error("Network error");
    }
  };

  const filteredConnections = useMemo(() => {
    const outgoing = connections.filter((c) => c.userId === badge?.id && c.status === "following");
    const incoming = connections.filter((c) => c.connectedUserId === badge?.id && c.status === "following");
    const mutual = connections.filter((c) => c.status === "mutual");
    return { outgoing, incoming, mutual };
  }, [connections, badge?.id]);

  const allConnections = useMemo(() => {
    return [...filteredConnections.outgoing, ...filteredConnections.incoming, ...filteredConnections.mutual];
  }, [filteredConnections]);

  const connectionStats = useMemo(() => {
    const mutual = filteredConnections.mutual;
    const roleBreakdown = mutual.reduce<Record<string, number>>((acc, conn) => {
      const role = conn.connectedUser.role;
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
    return {
      totalMutual: mutual.length,
      pendingSent: filteredConnections.outgoing.length,
      pendingReceived: filteredConnections.incoming.length,
      roleBreakdown,
    };
  }, [filteredConnections]);

  if (badgeLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
      </div>
    );
  }

  if (!badge || !["AGENT", "BUREAU"].includes(badge.role)) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
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

  const roleColor = (role: string) => (role === "BUREAU" ? "bg-amber-400" : "bg-blue-400");
  const roleText = (role: string) => (role === "BUREAU" ? "text-amber-400" : "text-blue-400");
  const roleBgLight = (role: string) => (role === "BUREAU" ? "bg-amber-500/20" : "bg-blue-500/20");

  const ConnectionVisual = ({
    leftRole,
    rightRole,
    state,
  }: {
    leftRole?: string;
    rightRole?: string;
    state?: ConnectionState;
  }) => {
    const leftColor = state === "mutual" && leftRole ? roleColor(leftRole) : state === "outgoing" && leftRole ? roleColor(leftRole) : "bg-zinc-600";
    const rightColor = state === "mutual" && rightRole ? roleColor(rightRole) : state === "incoming" && rightRole ? roleColor(rightRole) : "bg-zinc-600";

    const leftActive = state === "mutual" || state === "outgoing";
    const rightActive = state === "mutual" || state === "incoming";
    const leftScore = leftActive ? 1 : 0;
    const rightScore = rightActive ? 1 : 0;

    return (
      <div className="flex items-center gap-1.5">
        <div className={`w-3 h-3 rounded-full ${leftColor} flex-shrink-0`} />
        <div className="w-6 h-px bg-zinc-600 flex-shrink-0" />
        <div className={`w-3 h-3 rounded-full ${rightColor} flex-shrink-0`} />
        <span className="text-[8px] font-mono text-zinc-500 typewriter-label px-1.5 py-[1px] bg-zinc-500/5 rounded">
          {leftScore}-{rightScore}
        </span>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/agent/discussions")}
            className="inline-flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 typewriter-label transition-colors min-h-[36px]"
          >
            <ArrowLeft className="w-3 h-3" />
            DISCUSSIONS
          </button>
          <button
            onClick={() => refreshConnections()}
            disabled={loading}
            className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors rounded hover:bg-[#111113] min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Refresh connections"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-200 typewriter-label">CONNECTIONS</h1>
            <p className="text-[10px] text-zinc-600">Follow and connect with other agents</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-500/5 rounded text-[8px] text-zinc-500 typewriter-label">
            <span className="text-zinc-400">◉</span>
            <span className="text-zinc-600">Your follow</span>
            <span className="mx-1">·</span>
            <span className="text-amber-400">◉</span>
            <span>BRU</span>
            <span className="mx-1">·</span>
            <span className="text-blue-400">◉</span>
            <span>AGT</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3 text-center">
              <p className="text-emerald-400 text-lg font-bold">{connectionStats.totalMutual}</p>
              <p className="text-[8px] text-zinc-600 typewriter-label">CONNECTED</p>
            </div>
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3 text-center">
              <p className="text-zinc-400 text-lg font-bold">{connectionStats.pendingSent}</p>
              <p className="text-[8px] text-zinc-600 typewriter-label">PENDING SENT</p>
            </div>
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3 text-center">
              <p className="text-rose-400 text-lg font-bold">{connectionStats.pendingReceived}</p>
              <p className="text-[8px] text-zinc-600 typewriter-label">PENDING RECV</p>
            </div>
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3 text-center">
              <p className="text-amber-400 text-lg font-bold">{connectionStats.roleBreakdown.BUREAU || 0}</p>
              <p className="text-[8px] text-zinc-600 typewriter-label">BUREAU</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative mb-6"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by badge code..."
            className="w-full bg-[#111113] border border-[rgba(168,144,112,0.1)] pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[rgba(168,144,112,0.25)] transition-colors"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 animate-spin" />}
        </motion.div>

        <AnimatePresence>
          {showSearchResults && searchResults.length > 0 && (
            <motion.div
              key="search-results"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg mb-6 max-h-80 overflow-auto"
            >
              <div className="px-4 py-2 border-b border-[rgba(168,144,112,0.08)] flex items-center justify-between">
                <p className="text-[9px] text-zinc-500 typewriter-label">SEARCH RESULTS</p>
                <span className="px-1.5 py-0.5 text-[8px] font-medium bg-zinc-500/10 text-zinc-400 rounded typewriter-label">{searchResults.length} found</span>
              </div>
              <div className="divide-y divide-[rgba(168,144,112,0.06)]">
                {searchResults.map((user) => {
                  const state = connectionState[user.id];
                  const isMutual = state === "mutual";
                  return (
                    <motion.div key={user.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between px-4 py-3 hover:bg-[#0a0a0c] transition-colors">
                      <div className="flex items-center gap-3">
                        <ConnectionVisual leftRole={badge?.role || "AGENT"} rightRole={user.role} state={state} />
                        <div>
                          <p className="text-sm text-zinc-300 font-mono">{user.badgeCode}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[8px] px-1.5 py-[1px] rounded ${roleBgLight(user.role)} ${roleText(user.role)}`}>{user.role}</span>
                            {isMutual && <span className="text-[8px] text-emerald-400 typewriter-label">CONNECTED</span>}
                            {state === "outgoing" && <span className="text-[8px] text-zinc-400 typewriter-label">FOLLOWING</span>}
                            {state === "incoming" && <span className="text-[8px] text-rose-400 typewriter-label">FOLLOWED YOU</span>}
                          </div>
                        </div>
                      </div>
                      {isMutual ? (
                        <span className="text-[9px] text-emerald-400 typewriter-label">CONNECTED</span>
                      ) : state === "outgoing" ? (
                        <span className="text-[9px] text-zinc-500 typewriter-label">FOLLOWING</span>
                      ) : state === "incoming" ? (
                        <button
                          onClick={() => followBack(user.id, user.badgeCode)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-medium bg-blue-600 text-black hover:bg-blue-500 typewriter-label transition-colors"
                        >
                          <UserPlus className="w-3 h-3" />
                          FOLLOW BACK
                        </button>
                      ) : (
                        <button
                          onClick={() => followUser(user.id, user.badgeCode)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-medium bg-amber-600 text-black hover:bg-amber-500 typewriter-label transition-colors"
                        >
                          <UserPlus className="w-3 h-3" />
                          FOLLOW
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
          {showSearchResults && searchResults.length === 0 && searchQuery.trim() && (
            <motion.div
              key="search-empty"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg mb-6 p-8 text-center"
            >
              <Search className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-600 text-xs typewriter-label mb-1">NO AGENTS FOUND</p>
              <p className="text-zinc-700 text-[10px] mt-1">Try a different badge code or display name</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {filteredConnections.outgoing.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-zinc-400/70" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200 typewriter-label">OUTGOING FOLLOWS</p>
                    <p className="text-[9px] text-zinc-600">If you connected to someone but they have not yet connected you</p>
                  </div>
                  <span className="ml-auto px-2 py-1 text-[9px] font-medium bg-zinc-500/20 text-zinc-400 rounded typewriter-label">{filteredConnections.outgoing.length}</span>
                </div>
                <div className="divide-y divide-[rgba(168,144,112,0.06)] rounded-lg border border-[rgba(168,144,112,0.08)] bg-[#111113] overflow-hidden">
                  {filteredConnections.outgoing.map((conn) => (
                    <ConnectionRow
                      key={conn.id}
                      conn={conn}
                      state="outgoing"
                      onUnfollow={(id) => unfollowUser(id, conn.connectedUser.badgeCode)}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {filteredConnections.incoming.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-rose-400/70" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200 typewriter-label">INCOMING FOLLOWS</p>
                    <p className="text-[9px] text-zinc-600">If someone connected you but you have not connected them yet</p>
                  </div>
                  <span className="ml-auto px-2 py-1 text-[9px] font-medium bg-rose-500/20 text-rose-400 rounded typewriter-label">{filteredConnections.incoming.length}</span>
                </div>
                <div className="divide-y divide-[rgba(168,144,112,0.06)] rounded-lg border border-[rgba(168,144,112,0.08)] bg-[#111113] overflow-hidden">
                  {filteredConnections.incoming.map((conn) => (
                    <ConnectionRow
                      key={conn.id}
                      conn={conn}
                      state="incoming"
                      onFollowBack={(id) => followBack(id, conn.connectedUser.badgeCode)}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {filteredConnections.mutual.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-emerald-400/70" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200 typewriter-label">CONNECTED</p>
                    <p className="text-[9px] text-zinc-600">Where your connection was successful from both sides</p>
                  </div>
                  <span className="ml-auto px-2 py-1 text-[9px] font-medium bg-emerald-500/20 text-emerald-400 rounded typewriter-label">{filteredConnections.mutual.length}</span>
                </div>
                {Object.keys(connectionStats.roleBreakdown).length > 0 && (
                  <div className="flex items-center gap-2 mb-3 px-2 text-[8px] text-zinc-500 typewriter-label">
                    <span>Roles:</span>
                    {Object.entries(connectionStats.roleBreakdown).map(([role, count]) => (
                      <span key={role} className={`px-1.5 py-0.5 rounded border ${
                        role === "BUREAU" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        role === "AGENT" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                      }`}>
                        {role} {count}
                      </span>
                    ))}
                  </div>
                )}
                <div className="divide-y divide-[rgba(168,144,112,0.06)] rounded-lg border border-[rgba(168,144,112,0.08)] bg-[#111113] overflow-hidden">
                  {filteredConnections.mutual.map((conn) => (
                    <ConnectionRow
                      key={conn.id}
                      conn={conn}
                      state="mutual"
                      showNames={true}
                      onUnfollow={(id) => unfollowUser(id, conn.connectedUser.badgeCode)}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {allConnections.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8 text-zinc-700" />
                </div>
                <p className="text-zinc-600 text-xs typewriter-label mb-1">NO CONNECTIONS YET</p>
                <p className="text-zinc-700 text-[10px] mt-1">Search for a badge code to follow an AGT or BRU</p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function ConnectionRow({
  conn,
  state,
  showNames = false,
  onUnfollow,
  onFollowBack,
}: {
  conn: Connection;
  state: ConnectionState;
  showNames?: boolean;
  onUnfollow?: (connectionId: string) => void;
  onFollowBack?: (connectionId: string) => void;
}) {
  const roleBg = (role: string) => (role === "BUREAU" ? "bg-amber-500/10" : "bg-blue-500/10");
  const roleText = (role: string) => (role === "BUREAU" ? "text-amber-400" : "text-blue-400");
  const roleBgLight = (role: string) => (role === "BUREAU" ? "bg-amber-500/20" : "bg-blue-500/20");

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between px-4 py-3 hover:bg-[#0a0a0c] transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${roleBg(conn.connectedUser.role)}`}>
          <span className={`text-xs font-mono ${roleText(conn.connectedUser.role)}`}>{conn.connectedUser.badgeCode}</span>
        </div>
        <div>
          {showNames ? (
            <p className="text-sm text-zinc-300 font-medium">{conn.connectedUser.displayName}</p>
          ) : (
            <p className="text-sm text-zinc-500 font-mono">{conn.connectedUser.badgeCode}</p>
          )}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[8px] px-1.5 py-[1px] rounded ${roleBgLight(conn.connectedUser.role)} ${roleText(conn.connectedUser.role)}`}>{conn.connectedUser.role}</span>
            {showNames && (
              <span className="text-[8px] text-emerald-400 typewriter-label">MUTUAL</span>
            )}
            {state === "outgoing" && (
              <span className="text-[8px] text-zinc-400 typewriter-label">FOLLOWING</span>
            )}
            {state === "incoming" && (
              <span className="text-[8px] text-rose-400 typewriter-label">FOLLOWED YOU</span>
            )}
          </div>
          {state === "mutual" && showNames && (
            <div className="flex items-center gap-1 mt-1 text-[8px] text-zinc-600">
              <Clock className="w-2.5 h-2.5" />
              <span className="typewriter-label">Connected {formatDate(conn.createdAt)}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {state === "incoming" && onFollowBack && (
          <button
            onClick={() => onFollowBack(conn.id)}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-[9px] font-medium bg-blue-600 text-black rounded hover:bg-blue-500 typewriter-label transition-colors"
          >
            <UserPlus className="w-3 h-3" />
            FOLLOW BACK
          </button>
        )}
        {state !== "incoming" && onUnfollow && (
          <button
            onClick={() => onUnfollow(conn.id)}
            className="p-1.5 text-red-400/70 hover:text-red-400 transition-colors rounded"
            title="Unfollow"
          >
            <UserMinus className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function ConnectionsPageWrapper() {
  return (
    <ErrorBoundary>
      <ConnectionsPage />
    </ErrorBoundary>
  );
}
