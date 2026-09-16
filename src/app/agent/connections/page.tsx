"use client";

import { useBadge } from "@/components/badge/BadgeProvider";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Loader2,
  Users,
  Plus,
  UserMinus,
  AlertCircle,
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

export default function ConnectionsPage() {
  const { badge, loading: badgeLoading } = useBadge();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
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
          <Users className="w-5 h-5 text-amber-400/70" />
          <h1 className="text-sm font-semibold text-zinc-200 typewriter-label">CONNECTIONS</h1>
        </div>
        <p className="text-[10px] text-zinc-600 mb-6">
          Connect with other AGTs and BRUs to see their display names in discussions instead of badge codes.
        </p>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by badge code or display name..."
            className="w-full bg-[#111113] border border-[rgba(168,144,112,0.1)] pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[rgba(168,144,112,0.25)] transition-colors"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 animate-spin" />}
        </div>

        {/* Search Results */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg mb-6 max-h-60 overflow-auto">
            <div className="px-4 py-2 border-b border-[rgba(168,144,112,0.08)]">
              <p className="text-[9px] text-zinc-500 typewriter-label">SEARCH RESULTS</p>
            </div>
            <div className="divide-y divide-[rgba(168,144,112,0.06)]">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[#0a0a0c] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono ${
                      user.role === "BUREAU" ? "text-amber-400" :
                      user.role === "AGENT" ? "text-blue-400" : "text-zinc-500"
                    }`}>
                      {user.badgeCode}
                    </span>
                    <div>
                      <p className="text-sm text-zinc-300">{user.displayName}</p>
                      <span className={`text-[8px] px-1.5 py-[1px] rounded ${
                        user.role === "BUREAU" ? "bg-amber-500/20 text-amber-400" :
                        user.role === "AGENT" ? "bg-blue-500/20 text-blue-400" :
                        "bg-zinc-500/20 text-zinc-500"
                      }`}>
                        {user.role}
                      </span>
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
                      <Plus className="w-3 h-3" />
                      CONNECT
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {showSearchResults && searchResults.length === 0 && searchQuery.trim() && (
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg mb-6 p-6 text-center">
            <p className="text-zinc-600 text-sm">No users found matching &ldquo;{searchQuery}&rdquo;</p>
          </div>
        )}

        {/* Current Connections */}
        <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-lg">
          <div className="px-4 py-3 border-b border-[rgba(168,144,112,0.08)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400/70" />
              <p className="text-sm font-semibold text-zinc-200 typewriter-label">YOUR CONNECTIONS</p>
              <span className="px-1.5 py-0.5 text-[8px] font-medium bg-amber-500/20 text-amber-400 rounded typewriter-label">
                {connections.length}
              </span>
            </div>
          </div>
          {connections.length === 0 ? (
            <div className="p-6 text-center">
              <Users className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-600 text-xs typewriter-label">NO CONNECTIONS YET</p>
              <p className="text-zinc-700 text-[10px] mt-1">Search for AGTs and BRUs above to connect</p>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(168,144,112,0.06)]">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[#0a0a0c] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono ${
                      conn.connectedUser.role === "BUREAU" ? "text-amber-400" :
                      conn.connectedUser.role === "AGENT" ? "text-blue-400" : "text-zinc-500"
                    }`}>
                      {conn.connectedUser.badgeCode}
                    </span>
                    <div>
                      <p className="text-sm text-zinc-300">{conn.connectedUser.displayName}</p>
                      <span className={`text-[8px] px-1.5 py-[1px] rounded ${
                        conn.connectedUser.role === "BUREAU" ? "bg-amber-500/20 text-amber-400" :
                        conn.connectedUser.role === "AGENT" ? "bg-blue-500/20 text-blue-400" :
                        "bg-zinc-500/20 text-zinc-500"
                      }`}>
                        {conn.connectedUser.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeConnection(conn.id, conn.connectedUser.badgeCode)}
                    className="text-red-400/70 hover:text-red-400 text-[10px]"
                  >
                    <UserMinus className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}