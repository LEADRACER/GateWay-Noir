"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Scale, MessageSquare, CheckCircle2, Sparkles, AlertCircle,
  Users, UserPlus, UserMinus, Loader2, ShieldCheck, ListChecks, User, Trash2, Gavel, FileText,
  ClipboardList, BarChart2, Settings, Search, Filter, MoreHorizontal, Bell, Shield,
  ArrowUpRight, RefreshCw, Eye, Edit, Trash, Clock,
  Activity, Target, Award, Crown, Star, Zap, ShieldAlert
} from "lucide-react";
import { useBadge } from "@/components/badge/BadgeProvider";
import { promoteToBureau, demoteAgent, createBureauUser, getAllUsers } from "@/lib/admin-actions";
import { getActiveAndConcludedTopics, concludeTopic } from "@/lib/actions";
import { getAllTasks, updateTaskStatus } from "@/lib/task-actions";
import { getAgentDiscussions } from "@/lib/discussion-actions";
import { getAudienceLabel, type DiscussionAudience, type SpectatorVisibility } from "@/lib/discussion-access";
import toast from "react-hot-toast";
import Link from "next/link";

interface AgentUser {
  id: string;
  badgeCode: string;
  displayName: string;
  bio: string | null;
  phone: string | null;
  handler: string | null;
  createdAt: Date | string;
  voteCount?: number;
  commentCount?: number;
  taskCounts?: Record<string, number>;
}

interface Topic {
  id: string;
  title: string;
  slug: string;
  status: string;
  announced: boolean;
  createdAt: string;
}

interface AgentTask {
  id: string;
  agentId: string;
  adminId: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string | Date;
  completedAt: string | Date | null;
  agent: { badgeCode: string; displayName: string };
  admin: { badgeCode: string; displayName: string };
}

interface Discussion {
  id: string;
  title: string;
  description: string | null;
  isOpen: boolean;
  visibility: DiscussionAudience;
  spectatorVisibility: SpectatorVisibility;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { badgeCode: string; displayName: string } | null;
  _count: { messages: number; participants: number };
}

interface BureauHQProps {
  stats: {
    totalTopics: number;
    activeTopics: number;
    upcomingTopics: number;
    totalComments: number;
    flaggedComments: number;
  };
  children?: React.ReactNode;
}

type TabKey = "dashboard" | "agents" | "cases" | "tasks" | "discussions" | "analytics" | "settings";

export function BureauHQ({ stats, children }: BureauHQProps) {
  const { badge } = useBadge();
  const [agents, setAgents] = useState<AgentUser[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [demotingId, setDemotingId] = useState<string | null>(null);
  const [concludingId, setConcludingId] = useState<string | null>(null);
  const [activeCases, setActiveCases] = useState<Topic[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingDiscussions, setLoadingDiscussions] = useState(false);
const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [notifications, setNotifications] = useState<{id: string; message: string; type: "info" | "success" | "warning" | "error"; time: Date}[]>([]);

  // Fetch functions - defined before useEffects
  const fetchAgents = useCallback(async () => {
    try {
      const data = await getAllUsers();
      setAgents(data as AgentUser[]);
    } catch {
      console.error("Failed to fetch agents");
    }
  }, []);

  const fetchActiveCases = useCallback(async () => {
    try {
      const data = await getActiveAndConcludedTopics();
      const filtered = (data as Topic[]).filter(t => t.status === "ACTIVE" || (t.status === "CONCLUDED" && !t.announced));
      setActiveCases(filtered);
    } catch {
      console.error("Failed to fetch active cases");
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const data = await getAllTasks();
      setTasks(data as AgentTask[]);
    } catch {
      console.error("Failed to fetch tasks");
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const fetchDiscussions = useCallback(async () => {
    setLoadingDiscussions(true);
    try {
      const data = await getAgentDiscussions();
      setDiscussions(data);
    } catch {
      console.error("Failed to fetch discussions");
    } finally {
      setLoadingDiscussions(false);
    }
  }, []);

  const addNotification = useCallback((message: string, type: "info" | "success" | "warning" | "error" = "info") => {
    const id = Math.random().toString(36).substring(2, 10);
    setNotifications(prev => [...prev, { id, message, type, time: new Date() }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchActiveCases();
  }, [fetchAgents, fetchActiveCases]);

  useEffect(() => {
    if (activeTab === "tasks") {
      fetchTasks();
    }
  }, [activeTab, fetchTasks]);

  useEffect(() => {
    if (activeTab === "discussions") {
      fetchDiscussions();
    }
  }, [activeTab, fetchDiscussions]);

  const handleConclude = async (topicId: string, verdict: string) => {
    setConcludingId(topicId);
    try {
      const formData = new FormData();
      formData.set("id", topicId);
      formData.set("verdict", verdict);
      formData.set("summary", "Verdict delivered via HQ quick actions");
      const result = await concludeTopic(formData);
      if (result.error) {
        toast.error(result.error);
        addNotification(result.error, "error");
      } else {
        toast.success("Verdict delivered!");
        addNotification(`Case concluded with verdict: ${verdict}`, "success");
        fetchActiveCases();
      }
    } catch {
      toast.error("Failed to conclude topic");
      addNotification("Failed to conclude case", "error");
    }
    setConcludingId(null);
  };

  const handlePromoteToBureau = async (agentId: string) => {
    setPromotingId(agentId);
    try {
      const result = await promoteToBureau(agentId, badge?.badgeCode || "", badge?.id || "");
      if ("success" in result && result.success) {
        toast.success(`Promoted to BRU — new badge: ${result.newBadgeCode}`);
        addNotification(`Agent promoted to BRU: ${result.newBadgeCode}`, "success");
        setAgents((prev) => prev.filter((a) => a.id !== agentId));
      } else {
        toast.error(result.error || "Failed to promote");
        addNotification(result.error || "Failed to promote", "error");
      }
    } catch {
      toast.error("Network error");
      addNotification("Network error during promotion", "error");
    }
    setPromotingId(null);
  };

  const handleDemote = async (agentId: string) => {
    setDemotingId(agentId);
    try {
      const result = await demoteAgent(agentId);
      if ("success" in result && result.success) {
        const targetLabel = result.newRole === "AGENT" ? "AGT" : "DET";
        toast.success(`Demoted → ${targetLabel} — new badge: ${result.newBadgeCode}`);
        addNotification(`Agent demoted to ${targetLabel}: ${result.newBadgeCode}`, "warning");
        setAgents((prev) => prev.filter((a) => a.id !== agentId));
      } else {
        toast.error(result.error || "Failed to demote");
        addNotification(result.error || "Failed to demote", "error");
      }
    } catch {
      toast.error("Network error");
      addNotification("Network error during demotion", "error");
    }
    setDemotingId(null);
  };

  const handleTaskStatus = async (taskId: string, status: string) => {
    setUpdatingTaskId(taskId);
    try {
      const result = await updateTaskStatus(taskId, status);
      if (result?.success) {
        toast.success(status === "IN_PROGRESS" ? "Task started" : "Task completed");
        addNotification(`Task ${status === "IN_PROGRESS" ? "started" : "completed"}`, "success");
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status, completedAt: status === "COMPLETED" ? new Date() : t.completedAt } : t));
      } else {
        toast.error(result?.error || "Failed");
        addNotification(result?.error || "Failed to update task", "error");
      }
    } catch {
      toast.error("Network error");
      addNotification("Network error updating task", "error");
    }
    setUpdatingTaskId(null);
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          agent.badgeCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.agent.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredDiscussions = discussions.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "open" ? d.isOpen : !d.isOpen);
    return matchesSearch && matchesStatus;
  });

  // Get agent role from badge code
  const getAgentRole = (badgeCode: string) => {
    if (badgeCode.startsWith("BRU-")) return "BUREAU";
    if (badgeCode.startsWith("AGT-")) return "AGENT";
    if (badgeCode.startsWith("DET-")) return "DETECTIVE";
    return "UNKNOWN";
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "BUREAU": return "text-[#d97706] border-[#d97706]/30 bg-[#d97706]/10";
      case "AGENT": return "text-amber-400 border-amber-500/30 bg-amber-500/10";
      case "DETECTIVE": return "text-blue-400 border-blue-500/30 bg-blue-500/10";
      default: return "text-zinc-400 border-zinc-500/30 bg-zinc-500/10";
    }
  };

  return (
    <div className="space-y-4 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-xs w-full sm:max-w-sm">
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className={`px-3 py-2 rounded text-[10px] font-medium typewriter-label flex items-center gap-2 shadow-lg ${
                n.type === "success" ? "bg-emerald-900/90 text-emerald-300 border border-emerald-700/50" :
                n.type === "error" ? "bg-red-900/90 text-red-300 border border-red-700/50" :
                n.type === "warning" ? "bg-amber-900/90 text-amber-300 border border-amber-700/50" :
                "bg-blue-900/90 text-blue-300 border border-blue-700/50"
              }`}
            >
              {n.message}
            </motion.div>
          ))}
        </div>
      )}

      {/* Tab Bar — scrollable on mobile */}
      <div className="tab-scroll -mx-4 sm:mx-0 bg-[#111113] border border-[rgba(168,144,112,0.08)] p-1 flex gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] sm:text-[10px] font-medium typewriter-label transition-colors whitespace-nowrap ${
            activeTab === "dashboard"
              ? "bg-[#0d0d0f] text-zinc-200 border border-[rgba(168,144,112,0.12)]"
              : "text-zinc-600 hover:text-zinc-400 border border-transparent"
          }`}
        >
          <Scale className="w-3 h-3" />
          DASHBOARD
        </button>
        <button
          onClick={() => setActiveTab("agents")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] sm:text-[10px] font-medium typewriter-label transition-colors whitespace-nowrap ${
            activeTab === "agents"
              ? "bg-[#0d0d0f] text-zinc-200 border border-[rgba(168,144,112,0.12)]"
              : "text-zinc-600 hover:text-zinc-400 border border-transparent"
          }`}
        >
          <Users className="w-3 h-3" />
          AGENTS
          {agents.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 bg-zinc-600 text-black text-[8px] font-bold">
              {agents.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("cases")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] sm:text-[10px] font-medium typewriter-label transition-colors whitespace-nowrap ${
            activeTab === "cases"
              ? "bg-[#0d0d0f] text-zinc-200 border border-[rgba(168,144,112,0.12)]"
              : "text-zinc-600 hover:text-zinc-400 border border-transparent"
          }`}
        >
          <FileText className="w-3 h-3" />
          CASES
          {activeCases.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 bg-amber-500/20 text-amber-400 text-[8px] font-bold">
              {activeCases.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] sm:text-[10px] font-medium typewriter-label transition-colors whitespace-nowrap ${
            activeTab === "tasks"
              ? "bg-[#0d0d0f] text-zinc-200 border border-[rgba(168,144,112,0.12)]"
              : "text-zinc-600 hover:text-zinc-400 border border-transparent"
          }`}
        >
          <ClipboardList className="w-3 h-3" />
          TASKS
          {tasks.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 bg-blue-500/20 text-blue-400 text-[8px] font-bold">
              {tasks.filter(t => t.status === "PENDING").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("discussions")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] sm:text-[10px] font-medium typewriter-label transition-colors whitespace-nowrap ${
            activeTab === "discussions"
              ? "bg-[#0d0d0f] text-zinc-200 border border-[rgba(168,144,112,0.12)]"
              : "text-zinc-600 hover:text-zinc-400 border border-transparent"
          }`}
        >
          <MessageSquare className="w-3 h-3" />
          DISCUSSIONS
          {discussions.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 bg-purple-500/20 text-purple-400 text-[8px] font-bold">
              {discussions.filter(d => d.isOpen).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] sm:text-[10px] font-medium typewriter-label transition-colors whitespace-nowrap ${
            activeTab === "analytics"
              ? "bg-[#0d0d0f] text-zinc-200 border border-[rgba(168,144,112,0.12)]"
              : "text-zinc-600 hover:text-zinc-400 border border-transparent"
          }`}
        >
          <BarChart2 className="w-3 h-3" />
          ANALYTICS
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] sm:text-[10px] font-medium typewriter-label transition-colors whitespace-nowrap ${
            activeTab === "settings"
              ? "bg-[#0d0d0f] text-zinc-200 border border-[rgba(168,144,112,0.12)]"
              : "text-zinc-600 hover:text-zinc-400 border border-transparent"
          }`}
        >
          <Settings className="w-3 h-3" />
          SETTINGS
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-3 text-center">
              <Scale className="w-4 h-4 text-[#d97706] opacity-50 mx-auto mb-1" />
              <p className="text-lg font-bold text-zinc-100">{stats.totalTopics}</p>
              <p className="text-[10px] text-zinc-500">Total Cases</p>
            </div>
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-3 text-center">
              <CheckCircle2 className="w-4 h-4 text-green-500 opacity-60 mx-auto mb-1" />
              <p className="text-lg font-bold text-zinc-100">{stats.activeTopics}</p>
              <p className="text-[10px] text-zinc-500">Active</p>
            </div>
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-3 text-center">
              <Sparkles className="w-4 h-4 text-amber-400 opacity-60 mx-auto mb-1" />
              <p className="text-lg font-bold text-zinc-100">{stats.upcomingTopics}</p>
              <p className="text-[10px] text-zinc-500">Pending</p>
            </div>
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-3 text-center">
              <MessageSquare className="w-4 h-4 text-blue-400 opacity-60 mx-auto mb-1" />
              <p className="text-lg font-bold text-zinc-100">{stats.totalComments}</p>
              <p className="text-[10px] text-zinc-500">Statements</p>
            </div>
          </div>
          {children}
        </div>
      )}

      {/* Agents Tab */}
      {activeTab === "agents" && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded">
            <div className="h-0.5 evidence-tape" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-[#d97706] opacity-50" />
                <h2 className="text-xs font-semibold text-zinc-300 typewriter-label">ALL FIELD AGENTS</h2>
              </div>

              {agents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-6 h-6 text-zinc-700 mx-auto mb-2 opacity-50" />
                  <p className="text-zinc-600 text-[10px] typewriter-label">NO ACTIVE AGENTS</p>
                  <p className="text-zinc-700 text-[10px] mt-0.5">Approve elevation requests to recruit agents</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold text-[#d97706]">{agent.badgeCode}</span>
                          <span className="text-[10px] text-zinc-400">—</span>
                          <span className="text-xs text-zinc-300 truncate">{agent.displayName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-zinc-500">
                          {agent.handler && <span>Handler: <span className="font-mono">{agent.handler}</span></span>}
                          {agent.phone && <span>• {agent.phone}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDemote(agent.id)}
                          disabled={demotingId === agent.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-red-500/10 border border-red-500/25 text-red-400 typewriter-label hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                        >
                          {demotingId === agent.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <UserMinus className="w-3 h-3" />
                          )}
                          DEMOTE
                        </button>
                        <button
                          onClick={() => handlePromoteToBureau(agent.id)}
                          disabled={promotingId === agent.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-[#d97706]/15 border border-[#d97706]/30 text-[#d97706] typewriter-label hover:bg-[#d97706]/25 disabled:opacity-40 transition-colors"
                        >
                          {promotingId === agent.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <UserPlus className="w-3 h-3" />
                          )}
                          PROMOTE TO BRU
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Create New Admin */}
              <div className="mt-4 pt-4 border-t border-[rgba(168,144,112,0.06)]">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
                  <h3 className="text-[10px] text-zinc-500 typewriter-label">CREATE NEW ADMIN</h3>
                </div>
                <CreateAdminForm />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Cases Tab */}
      {activeTab === "cases" && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded">
            <div className="h-0.5 evidence-tape" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-[#d97706] opacity-50" />
                <h2 className="text-xs font-semibold text-zinc-300 typewriter-label">ACTIVE CASES</h2>
              </div>

              {activeCases.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-6 h-6 text-zinc-700 mx-auto mb-2 opacity-50" />
                  <p className="text-zinc-600 text-[10px] typewriter-label">NO ACTIVE CASES</p>
                  <p className="text-zinc-700 text-[10px] mt-0.5">All investigations are concluded or announced</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {activeCases.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold text-[#d97706]">{topic.status}</span>
                          <span className="text-xs text-zinc-300 truncate">{topic.title}</span>
                        </div>
                        <div className="text-[9px] text-zinc-500">
                          Created {new Date(topic.createdAt).toLocaleDateString()}
                          {topic.status === "CONCLUDED" && <span className="ml-2 text-amber-400">• CONCLUDED (not announced)</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {topic.status === "ACTIVE" && (
                          <>
                            <button
                              onClick={() => handleConclude(topic.id, "BUSTED")}
                              disabled={concludingId === topic.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-red-500/10 border border-red-500/25 text-red-400 typewriter-label hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                            >
                              {concludingId === topic.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gavel className="w-3 h-3" />}
                              BUSTED
                            </button>
                            <button
                              onClick={() => handleConclude(topic.id, "TRUE")}
                              disabled={concludingId === topic.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-green-500/10 border border-green-500/25 text-green-400 typewriter-label hover:bg-green-500/20 disabled:opacity-40 transition-colors"
                            >
                              {concludingId === topic.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              TRUE
                            </button>
                            <button
                              onClick={() => handleConclude(topic.id, "INCONCLUSIVE")}
                              disabled={concludingId === topic.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-amber-500/10 border border-amber-500/25 text-amber-400 typewriter-label hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
                            >
                              {concludingId === topic.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertCircle className="w-3 h-3" />}
                              INCONCLUSIVE
                            </button>
                          </>
                        )}
                        {topic.status === "CONCLUDED" && !topic.announced && (
                          <span className="text-[9px] text-amber-400 typewriter-label">PENDING ANNOUNCEMENT</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded">
            <div className="h-0.5 evidence-tape" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#d97706] opacity-50" />
                  <h2 className="text-xs font-semibold text-zinc-300 typewriter-label">ALL AGENT TASKS</h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] px-2 py-1 text-[10px] text-zinc-300 rounded outline-none focus:border-[#d97706]/30"
                  >
                    <option value="all">ALL STATUSES</option>
                    <option value="PENDING">PENDING</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] px-2 py-1 text-[10px] text-zinc-300 rounded outline-none focus:border-[#d97706]/30 placeholder:text-zinc-700 w-full sm:w-48"
                  />
                  <button
                    onClick={fetchTasks}
                    disabled={loadingTasks}
                    className="px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 typewriter-label disabled:opacity-40"
                    title="Refresh tasks"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingTasks ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {loadingTasks ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 text-zinc-700 mx-auto animate-spin opacity-50" />
                  <p className="text-zinc-600 text-[10px] typewriter-label mt-2">LOADING TASKS...</p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="w-6 h-6 text-zinc-700 mx-auto mb-2 opacity-50" />
                  <p className="text-zinc-600 text-[10px] typewriter-label">NO TASKS FOUND</p>
                  <p className="text-zinc-700 text-[10px] mt-0.5">{tasks.length === 0 ? "No tasks assigned yet" : "Try adjusting your filters"}</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium border typewriter-label ${
                            task.status === "PENDING" ? "bg-amber-500/10 text-amber-400 border-amber-500/15" :
                            task.status === "IN_PROGRESS" ? "bg-blue-500/10 text-blue-400 border-blue-500/15" :
                            "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                          }`}>
                            {task.status.replace("_", " ")}
                          </span>
                        </div>
                        <h4 className="text-xs font-medium text-zinc-300 truncate">{task.title}</h4>
                        {task.description && (
                          <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-zinc-500">
                          <span>Agent: <span className="font-mono text-amber-400">{task.agent.badgeCode}</span></span>
                          <span>•</span>
                          <span>By: <span className="font-mono text-[#d97706]">{task.admin.badgeCode}</span></span>
                          <span>•</span>
                          <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
                          {task.completedAt && <span>• ✓ Completed {new Date(task.completedAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {task.status === "PENDING" && (
                          <button
                            onClick={() => handleTaskStatus(task.id, "IN_PROGRESS")}
                            disabled={updatingTaskId === task.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/15 hover:bg-blue-500/20 typewriter-label disabled:opacity-40 transition-colors"
                          >
                            {updatingTaskId === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                            START
                          </button>
                        )}
                        {task.status === "IN_PROGRESS" && (
                          <button
                            onClick={() => handleTaskStatus(task.id, "COMPLETED")}
                            disabled={updatingTaskId === task.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 hover:bg-emerald-500/20 typewriter-label disabled:opacity-40 transition-colors"
                          >
                            {updatingTaskId === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            COMPLETE
                          </button>
                        )}
                        {task.status === "COMPLETED" && (
                          <span className="text-[9px] text-emerald-400 typewriter-label">DONE</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Discussions Tab */}
      {activeTab === "discussions" && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded">
            <div className="h-0.5 evidence-tape" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#d97706] opacity-50" />
                  <h2 className="text-xs font-semibold text-zinc-300 typewriter-label">AGENT DISCUSSIONS</h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] px-2 py-1 text-[10px] text-zinc-300 rounded outline-none focus:border-[#d97706]/30"
                  >
                    <option value="all">ALL</option>
                    <option value="open">OPEN</option>
                    <option value="closed">CLOSED</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Search discussions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] px-2 py-1 text-[10px] text-zinc-300 rounded outline-none focus:border-[#d97706]/30 placeholder:text-zinc-700 w-full sm:w-48"
                  />
                  <button
                    onClick={fetchDiscussions}
                    disabled={loadingDiscussions}
                    className="px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 typewriter-label disabled:opacity-40"
                    title="Refresh discussions"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingDiscussions ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {loadingDiscussions ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 text-zinc-700 mx-auto animate-spin opacity-50" />
                  <p className="text-zinc-600 text-[10px] typewriter-label mt-2">LOADING DISCUSSIONS...</p>
                </div>
              ) : filteredDiscussions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-6 h-6 text-zinc-700 mx-auto mb-2 opacity-50" />
                  <p className="text-zinc-600 text-[10px] typewriter-label">NO DISCUSSIONS FOUND</p>
                  <p className="text-zinc-700 text-[10px] mt-0.5">{discussions.length === 0 ? "No discussions created yet" : "Try adjusting your filters"}</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredDiscussions.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 text-[8px] font-medium rounded border typewriter-label ${
                            d.visibility === "bru_only"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/20"
                              : d.visibility === "bru_agt"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/20"
                              : d.visibility === "bru_agt_det"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                              : "bg-violet-500/20 text-violet-400 border border-violet-500/20"
                          }`}>
                            {getAudienceLabel(d.visibility)}
                          </span>
                          {d.spectatorVisibility === "all" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[8px] font-medium rounded border bg-violet-500/15 text-violet-400 border-violet-500/25 typewriter-label">
                              SPECTATOR
                            </span>
                          )}
                          {d.isOpen && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Open" />}
                          {!d.isOpen && <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" title="Closed" />}
                        </div>
                        <h4 className="text-xs font-medium text-zinc-300 truncate">{d.title}</h4>
                        {d.description && (
                          <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{d.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-zinc-500">
                          <span>By: <span className="font-mono">{d.createdBy?.badgeCode ?? "?"}</span></span>
                          <span>•</span>
                          <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>💬 {d._count.messages} messages</span>
                          <span>•</span>
                          <span>👥 {d._count.participants} participants</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Link
                          href={`/agent/discussions/${d.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-[#d97706]/15 border border-[#d97706]/30 text-[#d97706] typewriter-label hover:bg-[#d97706]/25 transition-colors"
                        >
                          <ArrowUpRight className="w-3 h-3" />
                          VIEW
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4 text-center">
                <Users className="w-5 h-5 text-[#d97706] opacity-50 mx-auto mb-2" />
                <p className="text-2xl font-bold text-zinc-100">{agents.length}</p>
                <p className="text-[10px] text-zinc-500">TOTAL AGENTS</p>
              </div>
              <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4 text-center">
                <FileText className="w-5 h-5 text-green-500 opacity-50 mx-auto mb-2" />
                <p className="text-2xl font-bold text-zinc-100">{activeCases.length + stats.upcomingTopics}</p>
                <p className="text-[10px] text-zinc-500">ACTIVE CASES</p>
              </div>
              <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4 text-center">
                <ClipboardList className="w-5 h-5 text-blue-500 opacity-50 mx-auto mb-2" />
                <p className="text-2xl font-bold text-zinc-100">{tasks.length}</p>
                <p className="text-[10px] text-zinc-500">TOTAL TASKS</p>
              </div>
              <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4 text-center">
                <MessageSquare className="w-5 h-5 text-purple-500 opacity-50 mx-auto mb-2" />
                <p className="text-2xl font-bold text-zinc-100">{discussions.length}</p>
                <p className="text-[10px] text-zinc-500">DISCUSSIONS</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4">
                <h3 className="text-xs font-semibold text-zinc-300 mb-3 typewriter-label">AGENT BREAKDOWN</h3>
                <div className="space-y-2">
                  {["BRU", "AGT", "DET"].map(role => {
                    const count = agents.filter(a => a.badgeCode.startsWith(`${role}-`)).length;
                    const color = role === "BRU" ? "#d97706" : role === "AGT" ? "#f59e0b" : "#3b82f6";
                    return (
                      <div key={role} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-xs font-mono text-zinc-400">{role}</span>
                        </div>
                        <span className="text-sm font-bold text-zinc-100">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4">
                <h3 className="text-xs font-semibold text-zinc-300 mb-3 typewriter-label">TASK STATUS DISTRIBUTION</h3>
                <div className="space-y-2">
                  {["PENDING", "IN_PROGRESS", "COMPLETED"].map(status => {
                    const count = tasks.filter(t => t.status === status).length;
                    const color = status === "PENDING" ? "#f59e0b" : status === "IN_PROGRESS" ? "#3b82f6" : "#16a34a";
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-xs font-mono text-zinc-400">{status.replace("_", " ")}</span>
                        </div>
                        <span className="text-sm font-bold text-zinc-100">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4 md:col-span-2">
                <h3 className="text-xs font-semibold text-zinc-300 mb-3 typewriter-label">DISCUSSION ACTIVITY</h3>
                <div className="space-y-2">
                  {discussions.slice(0, 5).map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] rounded">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${d.isOpen ? "bg-emerald-500" : "bg-zinc-500"}`} />
                        <span className="text-xs text-zinc-300 truncate max-w-[200px]">{d.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-zinc-500">
                        <span>💬 {d._count.messages}</span>
                        <span>👥 {d._count.participants}</span>
                        <span className="font-mono">{d.createdBy?.badgeCode}</span>
                      </div>
                    </div>
                  ))}
                  {discussions.length === 0 && (
                    <p className="text-center text-zinc-600 text-[10px] py-4">No discussions yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="space-y-4">
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4">
              <h3 className="text-xs font-semibold text-zinc-300 mb-4 typewriter-label">GENERAL SETTINGS</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Auto-refresh dashboard</span>
                  <input type="checkbox" className="w-4 h-4 accent-[#d97706]" defaultChecked />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Show notifications</span>
                  <input type="checkbox" className="w-4 h-4 accent-[#d97706]" defaultChecked />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Compact mode</span>
                  <input type="checkbox" className="w-4 h-4 accent-[#d97706]" />
                </label>
              </div>
            </div>

            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4">
              <h3 className="text-xs font-semibold text-zinc-300 mb-4 typewriter-label">DANGER ZONE</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center justify-between px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded hover:bg-red-500/20 transition-colors typewriter-label text-[10px]">
                  <span>Clear all notifications</span>
                  <Trash2 className="w-3 h-3" />
                </button>
                <button className="w-full flex items-center justify-between px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded hover:bg-red-500/20 transition-colors typewriter-label text-[10px]">
                  <span>Reset dashboard layout</span>
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4">
              <h3 className="text-xs font-semibold text-zinc-300 mb-4 typewriter-label">QUICK ACTIONS</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Link href="/admin/topics/new" className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] rounded hover:border-[#d97706]/30 transition-colors">
                  <FileText className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
                  <span className="text-xs text-zinc-300">New Case File</span>
                </Link>
                <Link href="/admin/comments" className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] rounded hover:border-[#d97706]/30 transition-colors">
                  <MessageSquare className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
                  <span className="text-xs text-zinc-300">Moderate Testimony</span>
                </Link>
                <Link href="/admin/tasks" className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] rounded hover:border-[#d97706]/30 transition-colors">
                  <ClipboardList className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
                  <span className="text-xs text-zinc-300">Manage Tasks</span>
                </Link>
                <Link href="/agent/discussions" className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] rounded hover:border-[#d97706]/30 transition-colors">
                  <MessageSquare className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
                  <span className="text-xs text-zinc-300">Agent Discussions</span>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function CreateAdminForm() {
  const { badge } = useBadge();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ badgeCode: string; temporaryPassword: string } | null>(null);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    setResult(null);
    try {
      const res = await createBureauUser(name.trim(), badge?.badgeCode || "");
      if (res.success) {
        setResult(res);
        setName("");
      } else {
        setError(res.error || "Failed to create admin");
      }
    } catch {
      setError("Network error");
    }
    setCreating(false);
  };

  if (result) {
    return (
      <div className="bg-[#0a0a0c] border border-[rgba(22,163,74,0.15)] p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          <span className="text-[10px] text-green-400/80 typewriter-label">ADMIN BADGE CREATED</span>
        </div>
        <p className="text-xs font-mono font-bold text-[#d97706] mb-1">{result.badgeCode}</p>
        <p className="text-[9px] text-zinc-500 mb-1">
          Passcode: <span className="font-mono text-[#d97706]">{result.temporaryPassword}</span>
        </p>
        <p className="text-[9px] text-zinc-500 mb-2">Share the code + passcode with the new admin. They sign in via passcode, then claim on their device.</p>
        <button
          onClick={() => setResult(null)}
          className="text-[9px] text-zinc-600 hover:text-zinc-400 typewriter-label transition-colors"
        >
          + CREATE ANOTHER
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Admin display name..."
          className="flex-1 bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] px-2.5 py-1.5 text-[11px] text-zinc-300 outline-none focus:border-[#d97706]/30 transition-colors placeholder:text-zinc-700"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !name.trim()}
          className="px-3 py-1.5 bg-[#d97706]/15 border border-[#d97706]/30 text-[10px] text-[#d97706] typewriter-label hover:bg-[#d97706]/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? "..." : "GENERATE BRU"}
        </button>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[9px] text-red-400/80 mt-1.5">
          <AlertCircle className="w-2.5 h-2.5" />
          {error}
        </p>
      )}
    </>
  );
}