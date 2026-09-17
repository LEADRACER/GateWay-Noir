"use client";

import { useBadge } from "@/components/badge/BadgeProvider";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Loader2,
  Users,
  Plus,
  UserMinus,
  AlertCircle,
  Shield,
  Activity,
  Link,
  Sparkles,
  BarChart2,
  Clock,
  UserCheck,
  Filter,
  TrendingUp,
  UserPlus,
  Network,
} from "lucide-react";
import toast from "react-hot-toast";

interface Connection {
  id: string;
  connectedUserId: string;
  createdAt: string;
  connectedUser: { badgeCode: string; displayName: string; role: string };
}

interface SearchResult {
  id: string;
  badgeCode: string;
  displayName: string;
  role: string;
  isConnected: boolean;
  isSelf: boolean;
}

interface ConnectionStats {
  total: number;
  agents: number;
  bureau: number;
  thisWeek: number;
  mutual: number;
}

type TabType = "all" | "agents" | "bureau" | "recent";

const statCards = [
  { key: "total", label: "TOTAL", icon: Users, color: "text-amber-400", bg: "bg-amber-500/10" },
  { key: "agents", label: "AGENTS", icon: UserCheck, color: "text-blue-400", bg: "bg-blue-500/10" },
  { key: "bureau", label: "BUREAU", icon: Shield, color: "text-amber-400", bg: "bg-amber-500/10" },
  { key: "thisWeek", label: "THIS WEEK", icon: Clock, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { key: "mutual", label: "MUTUAL", icon: Link, color: "text-purple-400", bg: "bg-purple-500/10" },
] as const;

export default function ConnectionsPage() {
  const { badge, loading: badgeLoading } = useBadge();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
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
  });
  const [activeTab, setActiveTab] = useState<TabType>("all");

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/connections");
      if (res.ok) {
        const data = await res.json();
        const connData = data.connections || [];
        setConnections(connData);
        
        // Calculate local stats
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const agents = connData.filter((c: Connection) => c.connectedUser.role === "AGENT").length;
        const bureau = connData.filter((c: Connection) => c.connectedUser.role === "BUREAU").length;
        const thisWeek = connData.filter((c: Connection) => new Date(c.createdAt) > weekAgo).length;
        
        setStats((prev) => ({
          ...prev,
          total: connData.length,
          agents,
          bureau,
          thisWeek,
        }));
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!badgeLoading) {
      queueMicrotask(() => {
        void fetchConnections();
      });
    }
  }, [badgeLoading, fetchConnections]);

  // Fetch enhanced stats from API
  useEffect(() => {
    if (!badgeLoading) {
      fetch("/api/agent/connections/stats")
        .then((res) => res.json())
        .then((data) => {
          if (data.totalConnections !== undefined) {
            setStats((prev) => ({
              ...prev,
              total: data.totalConnections,
              mutual: data.mutualConnections,
            }));
          }
        })
        .catch(() => {});
    }
  }, [badgeLoading]);

  const searchUsers = useCallback(async () => {
    if (!searchQuery.trim() || searching) return;
    setSearching(true);
    try {
      const res = await fetch("/api/agent/users");
      if (res.ok) {
        const data = await res.json();
        const agents = data.agents || [];
        const connectedIds = new Set(connections.map((c) => c.connectedUserId));
        const results = agents
          .filter((a: { id: string; badgeCode: string; displayName: string; role: string }) => 
            a.badgeCode.toUpperCase().includes(searchQuery.trim().toUpperCase()) ||
            a.displayName.toLowerCase().includes(searchQuery.trim().toLowerCase())
          )
          .map((a: { id: string; badgeCode: string; displayName: string; role: string }) => ({
            id: a.id,
            badgeCode: a.badgeCode,
            displayName: a.displayName,
            role: a.role,
            isConnected: connectedIds.has(a.id),
            isSelf: badge?.id === a.id,
          }));
        setSearchResults(results);
        setShowSearchResults(true);
      }
    } catch {
      toast.error("Failed to search users");
    } finally {
      setSearching(false);
    }
  }, [searchQuery, searching, connections, badge?.id]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(searchUsers, 300);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => setShowSearchResults(false), 0);
    }
  }, [searchQuery, searchUsers]);

  const addConnection = async (targetUserId: string, targetBadgeCode: string, targetDisplayName: string) => {
    try {
      const res = await fetch("/api/agent/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badgeCode: targetBadgeCode }),
      });
      const data = await res.json();
      if (data.connection) {
        setConnections((prev) => [...prev, { 
          id: data.connection.connectedUserId, 
          connectedUserId: data.connection.connectedUserId, 
          createdAt: new Date().toISOString(),
          connectedUser: { 
            badgeCode: data.connection.badgeCode, 
            displayName: data.connection.displayName, 
            role: data.connection.role 
          }
        }]);
        setSearchResults((prev) => prev.map((r) => r.id === targetUserId ? { ...r, isConnected: true } : r));
        toast.success(`Connected to ${targetDisplayName}`);
      } else {
        toast.error(data.error || "Failed to connect");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const removeConnection = async (connectionId: string, badgeCode: string) => {
    try {
      const res = await fetch(`/api/agent/connections/${connectionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConnections((prev) => prev.filter((c) => c.id !== connectionId));
        setSearchResults((prev) => prev.map((r) => r.badgeCode === badgeCode ? { ...r, isConnected: false } : r));
        toast.success("Connection removed");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to remove connection");
      }
    } catch {
      toast.error("Network error");
    }
  };

  // Filter connections based on active tab
  const filteredConnections = useMemo(() => {
    switch (activeTab) {
      case "agents":
        return connections.filter((c) => c.connectedUser.role === "AGENT");
      case "bureau":
        return connections.filter((c) => c.connectedUser.role === "BUREAU");
      case "recent":
        return [...connections].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
      default:
        return connections;
    }
  }, [connections, activeTab]);

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
            <p className="text-[10px] text-zinc-600">Network with AGTs and BRUs</p>
          </div>
        </div>
        <p className="text-[10px] text-zinc-600 mb-6">
          Connect with other AGTs and BRUs to see their display names in discussions instead of badge codes.
        </p>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6"
        >
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className={`rounded-lg border border-[rgba(168,144,112,0.08)] p-3 ${stat.bg} hover:border-[rgba(168,144,112,0.2)] transition-colors`}
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-[8px] font-medium typewriter-label uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="text-2xl font-mono font-bold text-zinc-100">
                {stats[stat.key as keyof ConnectionStats]}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-1 mb-6 bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg p-1"
        >
          {([
            { id: "all", label: "ALL", icon: Network },
            { id: "agents", label: "AGENTS", icon: UserCheck },
            { id: "bureau", label: "BUREAU", icon: Shield },
            { id: "recent", label: "RECENT", icon: Clock },
          ] as const).map((tab) => (
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

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="relative mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by badge code or display name..."
              className="w-full bg-[#111113] border border-[rgba(168,144,112,0.1)] pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[rgba(168,144,112,0.25)] transition-colors"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 animate-spin" />}
          </div>
          {/* Quick Tips */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-2 py-1 text-[8px] bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded text-zinc-600">
              Type badge code (AGT-XXXX) or name
            </span>
            <span className="px-2 py-1 text-[8px] bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded text-zinc-600">
              Press Enter to search
            </span>
          </div>
        </motion.div>

        {/* Search Results */}
        <AnimatePresence mode="wait">
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
                <span className="px-1.5 py-0.5 text-[8px] font-medium bg-zinc-500/10 text-zinc-400 rounded typewriter-label">
                  {searchResults.length} found
                </span>
              </div>
              <div className="divide-y divide-[rgba(168,144,112,0.06)]">
                {searchResults.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between px-4 py-3 hover:bg-[#0a0a0c] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user.role === "BUREAU" ? "bg-amber-500/10" : user.role === "AGENT" ? "bg-blue-500/10" : "bg-zinc-500/10"}`}>
                        <span className={`text-xs font-mono ${user.role === "BUREAU" ? "text-amber-400" : user.role === "AGENT" ? "text-blue-400" : "text-zinc-500"}`}>
                          {user.badgeCode}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-300">{user.displayName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[8px] px-1.5 py-[1px] rounded ${user.role === "BUREAU" ? "bg-amber-500/20 text-amber-400" : user.role === "AGENT" ? "bg-blue-500/20 text-blue-400" : "bg-zinc-500/20 text-zinc-500"}`}>
                            {user.role}
                          </span>
                          {user.isSelf && <span className="text-[8px] text-zinc-600 typewriter-label">YOU</span>}
                          {user.isConnected && !user.isSelf && <span className="text-[8px] text-emerald-400 typewriter-label">CONNECTED</span>}
                        </div>
                      </div>
                    </div>
                    {user.isSelf ? (
                      <span className="text-[9px] text-zinc-600 typewriter-label">YOU</span>
                    ) : user.isConnected ? (
                      <span className="text-[9px] text-emerald-400 typewriter-label">CONNECTED</span>
                    ) : (
                      <button
                        onClick={() => addConnection(user.id, user.badgeCode, user.displayName)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-medium bg-amber-600 text-black hover:bg-amber-500 typewriter-label transition-colors"
                      >
                        <UserPlus className="w-3 h-3" />
                        CONNECT
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showSearchResults && searchResults.length === 0 && searchQuery.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg mb-6 p-6 text-center"
          >
            <Search className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-zinc-600 text-sm">No users found matching &ldquo;{searchQuery}&rdquo;</p>
            <p className="text-[10px] text-zinc-700 mt-1">Try searching by badge code (e.g., AGT-ABCD) or display name</p>
          </motion.div>
        )}

        {/* Current Connections */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg"
        >
          <div className="px-4 py-3 border-b border-[rgba(168,144,112,0.08)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-amber-400/70" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200 typewriter-label">YOUR CONNECTIONS</p>
                <p className="text-[9px] text-zinc-600">Tap to view mutual connections</p>
              </div>
            </div>
            <span className="px-2 py-1 text-[9px] font-medium bg-amber-500/20 text-amber-400 rounded typewriter-label">
              {filteredConnections.length} / {stats.total}
            </span>
          </div>
          {filteredConnections.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-3">
                <Users className="w-8 h-8 text-zinc-700" />
              </div>
              <p className="text-zinc-600 text-xs typewriter-label mb-1">NO CONNECTIONS YET</p>
              <p className="text-zinc-700 text-[10px] mb-4">Search for AGTs and BRUs above to connect</p>
              {activeTab !== "all" && (
                <button
                  onClick={() => setActiveTab("all")}
                  className="text-[10px] text-amber-500/70 hover:text-amber-400 typewriter-label underline"
                >
                  Show all connections
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[rgba(168,144,112,0.06)]">
              {filteredConnections.map((conn, index) => (
                <motion.div
                  key={conn.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[#0a0a0c] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${conn.connectedUser.role === "BUREAU" ? "bg-amber-500/10" : conn.connectedUser.role === "AGENT" ? "bg-blue-500/10" : "bg-zinc-500/10"}`}>
                      <span className={`text-xs font-mono ${conn.connectedUser.role === "BUREAU" ? "text-amber-400" : conn.connectedUser.role === "AGENT" ? "text-blue-400" : "text-zinc-500"}`}>
                        {conn.connectedUser.badgeCode}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-300 font-medium">{conn.connectedUser.displayName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[8px] px-1.5 py-[1px] rounded ${conn.connectedUser.role === "BUREAU" ? "bg-amber-500/20 text-amber-400" : conn.connectedUser.role === "AGENT" ? "bg-blue-500/20 text-blue-400" : "bg-zinc-500/20 text-zinc-500"}`}>
                          {conn.connectedUser.role}
                        </span>
                        <span className="text-[8px] text-zinc-600 typewriter-label">
                          Since {new Date(conn.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        // Navigate to mutual connections if endpoint available
                        toast("Mutual connections feature coming soon");
                      }}
                      className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded"
                      title="View mutual connections"
                    >
                      <Link className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeConnection(conn.id, conn.connectedUser.badgeCode)}
                      className="p-1.5 text-red-400/70 hover:text-red-400 transition-colors rounded"
                      title="Remove connection"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick Actions Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 grid grid-cols-2 gap-3"
        >
          <button
            onClick={() => router.push("/agent/discussions")}
            className="flex flex-col items-center gap-2 p-4 bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg hover:border-[rgba(168,144,112,0.2)] transition-colors"
          >
            <Activity className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] font-medium typewriter-label text-zinc-300">DISCUSSIONS</span>
            <span className="text-[8px] text-zinc-600">Join active threads</span>
          </button>
          <button
            onClick={() => router.push("/agent/tasks")}
            className="flex flex-col items-center gap-2 p-4 bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg hover:border-[rgba(168,144,112,0.2)] transition-colors"
          >
            <Sparkles className="w-5 h-5 text-blue-400" />
            <span className="text-[10px] font-medium typewriter-label text-zinc-300">TASKS</span>
            <span className="text-[8px] text-zinc-600">View assignments</span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}