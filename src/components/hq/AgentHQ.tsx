"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList, Play, CheckCircle2, Clock, Loader2, FileX,
  Smartphone, AlertCircle, CheckCircle, Scale, Save,
  MessageSquare, ArrowUpRight, Search, Filter, RefreshCw, BarChart2,
  Activity, Target, Award, Zap, Shield, User, Settings, Bell,
  ArrowUp, Download, Eye, Edit, Trash, Mail, Phone, MapPin
} from "lucide-react";
import toast from "react-hot-toast";
import { useBadge } from "@/components/badge/BadgeProvider";
import { registerPhone } from "@/lib/badge-client";
import { getAgentProfile, updateAgentProfile } from "@/lib/profile-actions";
import { getAgentTasks, updateTaskStatus } from "@/lib/task-actions";
import { getAgentDiscussions } from "@/lib/discussion-actions";
import { getAudienceLabel, type DiscussionAudience, type SpectatorVisibility } from "@/lib/discussion-access";
import { formatDate } from "@/lib/utils";
import { BadgeCard } from "@/components/badge/BadgeCard";
import { RoleAvatar } from "@/components/badge/RoleAvatar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

interface Task {
  id: string;
  agentId: string;
  adminId: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string | Date;
  completedAt: string | Date | null;
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

interface ProfileData {
  id: string;
  badgeCode: string;
  displayName: string;
  role: string;
  bio: string | null;
  phone: string | null;
  handler: string | null;
  handlerInfo: { badgeCode: string; displayName: string } | null;
  voteCount: number;
  commentCount: number;
  taskCounts: Record<string, number>;
}

type TabKey = "tasks" | "discussions" | "analytics" | "profile";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/15",
    IN_PROGRESS: "bg-blue-500/10 text-blue-400 border-blue-500/15",
    COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/15",
  };
  const icons: Record<string, React.ReactNode> = {
    PENDING: <Clock className="w-2.5 h-2.5" />,
    IN_PROGRESS: <Loader2 className="w-2.5 h-2.5 animate-spin" />,
    COMPLETED: <CheckCircle2 className="w-2.5 h-2.5" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium border typewriter-label ${styles[status] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/15"}`}>
      {icons[status]}
      {status.replace("_", " ")}
    </span>
  );
}

export function AgentHQ() {
  const { badge, updateBadge } = useBadge();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [loadingDiscussions, setLoadingDiscussions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [notifications, setNotifications] = useState<{id: string; message: string; type: "info" | "success" | "warning" | "error"; time: Date}[]>([]);

  // Profile editing
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  // Phone
  const [phone, setPhone] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [phoneSuccess, setPhoneSuccess] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<TabKey>("tasks");

  const addNotification = (message: string, type: "info" | "success" | "warning" | "error" = "info") => {
    const id = Math.random().toString(36).substring(2, 10);
    setNotifications(prev => [...prev, { id, message, type, time: new Date() }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const fetchTasks = useCallback(async () => {
    if (!badge) return;
    const taskData = await getAgentTasks(badge.id);
    setTasks(taskData as Task[]);
  }, [badge]);

  const fetchDiscussions = useCallback(async () => {
    if (!badge) return;
    setLoadingDiscussions(true);
    try {
      const data = await getAgentDiscussions();
      setDiscussions(data);
    } catch {
      console.error("Failed to fetch discussions");
    } finally {
      setLoadingDiscussions(false);
    }
  }, [badge]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!badge) {
        setLoading(false);
        return;
      }

      const loadInitialData = async () => {
        try {
          const [profileData, taskData, discussionsData] = await Promise.all([
            getAgentProfile(badge.id),
            getAgentTasks(badge.id),
            getAgentDiscussions(),
          ]);
          if (profileData) {
            const p = profileData as ProfileData;
            setProfile(p);
            setDisplayName(p.displayName || "");
            setBio(p.bio || "");
          }
          setTasks(taskData as Task[]);
          setDiscussions(discussionsData as Discussion[]);
        } catch (err) {
          console.error("Failed to load initial data:", err);
          addNotification("Failed to load data", "error");
        } finally {
          setLoading(false);
        }
      };

      loadInitialData();
    }, 0);

    return () => clearTimeout(timeout);
  }, [badge, addNotification]);

  useEffect(() => {
    if (activeTab !== "discussions") return;

    const timeout = setTimeout(() => {
      fetchDiscussions();
    }, 0);

    return () => clearTimeout(timeout);
  }, [activeTab, fetchDiscussions]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const result = await updateAgentProfile(profile.id, { displayName, bio });
      if (result?.error) {
        toast.error(result.error);
        addNotification(result.error, "error");
      } else {
        toast.success("Profile updated");
        addNotification("Profile updated successfully", "success");
        if (displayName !== badge?.displayName) {
          updateBadge({ displayName });
        }
      }
    } catch {
      toast.error("Failed to save");
      addNotification("Failed to save profile", "error");
    }
    setSaving(false);
  };

  const handlePhoneRegister = async () => {
    if (!badge || phone.trim().length < 7) return;
    setPhoneSaving(true);
    setPhoneError("");
    setPhoneSuccess(false);
    const result = await registerPhone(badge.badgeCode, phone.trim());
    if (result.success) {
      setPhoneSuccess(true);
      updateBadge({ phone: result.phone });
      setPhone("");
      addNotification("Phone registered successfully", "success");
    } else {
      setPhoneError(result.error || "Failed");
      addNotification(result.error || "Failed to register phone", "error");
    }
    setPhoneSaving(false);
  };

  const handleTaskStatus = async (taskId: string, status: string) => {
    setUpdatingId(taskId);
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
    setUpdatingId(null);
  };

  const maskPhone = (p: string) => {
    if (p.length <= 4) return p;
    return p.slice(0, 3) + "****" + p.slice(-2);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredDiscussions = discussions.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "open" ? d.isOpen : !d.isOpen);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (!badge) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-500 text-sm">No badge linked. Claim a badge first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-2xl mx-auto px-4 sm:px-6">
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

      {/* Badge Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111113] border-2 border-[rgba(168,144,112,0.12)] p-6"
      >
        <div className="flex flex-col items-center mb-4">
          <RoleAvatar role={badge.role} size="lg" className="mb-2" />
          <div className="flex justify-center">
            <BadgeCard badge={badge} />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] p-3 text-center">
            <p className="text-sm font-bold text-amber-400">{profile?.voteCount ?? 0}</p>
            <p className="text-[9px] text-zinc-600 typewriter-label">VOTES</p>
          </div>
          <div className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] p-3 text-center">
            <p className="text-sm font-bold text-amber-400">{profile?.commentCount ?? 0}</p>
            <p className="text-[9px] text-zinc-600 typewriter-label">COMMENTS</p>
          </div>
          <div className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] p-3 text-center">
            <p className="text-sm font-bold text-amber-400">{Object.values(profile?.taskCounts || {}).reduce((a: number, b: number) => a + b, 0)}</p>
            <p className="text-[9px] text-zinc-600 typewriter-label">TASKS</p>
          </div>
        </div>

        {/* Handler info */}
        {profile?.handlerInfo && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)]">
            <Scale className="w-3 h-3 text-amber-400 opacity-50" />
            <span className="text-[10px] text-zinc-500">
              Handler: <span className="text-amber-400 font-mono">{profile.handlerInfo.badgeCode}</span> — {profile.handlerInfo.displayName}
            </span>
          </div>
        )}
      </motion.div>

      {/* Tab navigation — scrollable on mobile */}
      <div className="tab-scroll -mx-4 sm:mx-0 flex items-center gap-1 bg-[#111113] border border-[rgba(168,144,112,0.08)] p-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-[9px] sm:text-[10px] font-medium typewriter-label transition-colors whitespace-nowrap ${
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
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-[9px] sm:text-[10px] font-medium typewriter-label transition-colors whitespace-nowrap ${
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
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-[9px] sm:text-[10px] font-medium typewriter-label transition-colors whitespace-nowrap ${
            activeTab === "analytics"
              ? "bg-[#0d0d0f] text-zinc-200 border border-[rgba(168,144,112,0.12)]"
              : "text-zinc-600 hover:text-zinc-400 border border-transparent"
          }`}
        >
          <BarChart2 className="w-3 h-3" />
          ANALYTICS
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-[9px] sm:text-[10px] font-medium typewriter-label transition-colors whitespace-nowrap ${
            activeTab === "profile"
              ? "bg-[#0d0d0f] text-zinc-200 border border-[rgba(168,144,112,0.12)]"
              : "text-zinc-600 hover:text-zinc-400 border border-transparent"
          }`}
        >
          <RoleAvatar role={badge.role} size="sm" />
          PROFILE
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] px-2 py-1 text-[10px] text-zinc-300 rounded outline-none focus:border-[#d97706]/30 placeholder:text-zinc-700 w-32 sm:w-40"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] px-2 py-1 text-[10px] text-zinc-300 rounded outline-none focus:border-[#d97706]/30"
          >
            <option value="all">ALL</option>
            <option value="PENDING">PENDING</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="open">OPEN</option>
            <option value="closed">CLOSED</option>
          </select>
        </div>
      </div>

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <div className="space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3 text-center rounded">
              <p className="text-amber-400 text-lg font-bold">{tasks.filter(t => t.status === "PENDING").length}</p>
              <p className="text-zinc-600 text-[9px] typewriter-label">PENDING</p>
            </div>
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3 text-center rounded">
              <p className="text-blue-400 text-lg font-bold">{tasks.filter(t => t.status === "IN_PROGRESS").length}</p>
              <p className="text-zinc-600 text-[9px] typewriter-label">IN PROGRESS</p>
            </div>
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3 text-center rounded">
              <p className="text-emerald-400 text-lg font-bold">{tasks.filter(t => t.status === "COMPLETED").length}</p>
              <p className="text-zinc-600 text-[9px] typewriter-label">COMPLETED</p>
            </div>
          </div>

          {/* Task list */}
          {tasks.length === 0 ? (
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-10 text-center rounded">
              <FileX className="w-8 h-8 text-zinc-700 mx-auto mb-3 opacity-50" />
              <p className="text-zinc-500 text-xs typewriter-label">NO TASKS ASSIGNED</p>
              <p className="text-zinc-700 text-[10px] mt-1">Check back later for new assignments</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {tasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3 rounded"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={task.status} />
                      </div>
                      <h4 className="text-xs font-medium text-zinc-300">{task.title}</h4>
                      {task.description && (
                        <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{task.description}</p>
                      )}
                      <span className="text-[9px] text-zinc-600 mt-1 block">
                        Assigned {formatDate(task.createdAt)}
                        {task.completedAt && <> — ✓ Completed {formatDate(task.completedAt)}</>}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {task.status === "PENDING" && (
                        <button
                          onClick={() => handleTaskStatus(task.id, "IN_PROGRESS")}
                          disabled={updatingId === task.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/15 hover:bg-blue-500/20 typewriter-label disabled:opacity-40 transition-colors"
                        >
                          {updatingId === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                          START
                        </button>
                      )}
                      {task.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => handleTaskStatus(task.id, "COMPLETED")}
                          disabled={updatingId === task.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 hover:bg-emerald-500/20 typewriter-label disabled:opacity-40 transition-colors"
                        >
                          {updatingId === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          COMPLETE
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Discussions Tab */}
      {activeTab === "discussions" && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded">
            <div className="h-0.5 evidence-tape" />
            <div className="p-4">
              {loadingDiscussions ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 text-zinc-700 mx-auto animate-spin opacity-50" />
                  <p className="text-zinc-600 text-[10px] typewriter-label mt-2">LOADING DISCUSSIONS...</p>
                </div>
              ) : filteredDiscussions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-6 h-6 text-zinc-700 mx-auto mb-2 opacity-50" />
                  <p className="text-zinc-600 text-[10px] typewriter-label">NO DISCUSSIONS FOUND</p>
                  <p className="text-zinc-700 text-[10px] mt-0.5">{discussions.length === 0 ? "No discussions you can access yet" : "Try adjusting your filters"}</p>
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
                        <a
                          href={`/agent/discussions/${d.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-[#d97706]/15 border border-[#d97706]/30 text-[#d97706] typewriter-label hover:bg-[#d97706]/25 transition-colors"
                        >
                          <ArrowUpRight className="w-3 h-3" />
                          VIEW
                        </a>
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
      {activeTab === "analytics" && profile && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4 text-center">
                <Target className="w-5 h-5 text-amber-400 opacity-50 mx-auto mb-2" />
                <p className="text-2xl font-bold text-zinc-100">{tasks.filter(t => t.status === "PENDING").length}</p>
                <p className="text-[10px] text-zinc-500">PENDING TASKS</p>
              </div>
              <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4 text-center">
                <Activity className="w-5 h-5 text-blue-500 opacity-50 mx-auto mb-2" />
                <p className="text-2xl font-bold text-zinc-100">{tasks.filter(t => t.status === "IN_PROGRESS").length}</p>
                <p className="text-[10px] text-zinc-500">IN PROGRESS</p>
              </div>
              <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4 text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-50 mx-auto mb-2" />
                <p className="text-2xl font-bold text-zinc-100">{tasks.filter(t => t.status === "COMPLETED").length}</p>
                <p className="text-[10px] text-zinc-500">COMPLETED</p>
              </div>
              <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4 text-center">
                <MessageSquare className="w-5 h-5 text-purple-500 opacity-50 mx-auto mb-2" />
                <p className="text-2xl font-bold text-zinc-100">{discussions.filter(d => d.isOpen).length}</p>
                <p className="text-[10px] text-zinc-500">OPEN DISCUSSIONS</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4">
                <h3 className="text-xs font-semibold text-zinc-300 mb-3 typewriter-label">TASK COMPLETION RATE</h3>
                <div className="space-y-3">
                  {["PENDING", "IN_PROGRESS", "COMPLETED"].map(status => {
                    const count = tasks.filter(t => t.status === status).length;
                    const total = tasks.length;
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    const color = status === "PENDING" ? "#f59e0b" : status === "IN_PROGRESS" ? "#3b82f6" : "#16a34a";
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-zinc-400">{status.replace("_", " ")}</span>
                          </span>
                          <span className="font-bold text-zinc-100">{percentage}%</span>
                        </div>
                        <div className="h-1.5 bg-[#0a0a0c] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4">
                <h3 className="text-xs font-semibold text-zinc-300 mb-3 typewriter-label">YOUR STATS</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] rounded">
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-amber-400 opacity-50" />
                      <span className="text-xs text-zinc-400">Votes Cast</span>
                    </div>
                    <span className="text-lg font-bold text-zinc-100">{profile.voteCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] rounded">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400 opacity-50" />
                      <span className="text-xs text-zinc-400">Comments</span>
                    </div>
                    <span className="text-lg font-bold text-zinc-100">{profile.commentCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] rounded">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-3.5 h-3.5 text-emerald-400 opacity-50" />
                      <span className="text-xs text-zinc-400">Total Tasks</span>
                    </div>
                    <span className="text-lg font-bold text-zinc-100">{Object.values(profile.taskCounts || {}).reduce((a, b) => a + b, 0)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] rounded">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-purple-400 opacity-50" />
                      <span className="text-xs text-zinc-400">Discussions Joined</span>
                    </div>
                    <span className="text-lg font-bold text-zinc-100">{discussions.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4 md:col-span-2">
                <h3 className="text-xs font-semibold text-zinc-300 mb-3 typewriter-label">RECENT DISCUSSIONS</h3>
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

      {/* Profile Tab */}
      {activeTab === "profile" && profile && (
        <div className="space-y-3">
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.12)] rounded-lg p-6">
            <h2 className="text-xs font-semibold text-zinc-300 mb-4 uppercase tracking-wider typewriter-label">DETAILS</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-zinc-500 mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#08080a] border border-[rgba(168,144,112,0.15)] rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#d97706]/40"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 mb-1">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 500))}
                  rows={3}
                  className="w-full bg-[#08080a] border border-[rgba(168,144,112,0.15)] rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#d97706]/40 resize-none"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#d97706]/15 border border-[#d97706]/30 text-xs text-[#d97706] typewriter-label hover:bg-[#d97706]/25 disabled:opacity-50 transition-colors"
              >
                <Save className="w-3 h-3" />
                {saving ? "SAVING..." : "SAVE CHANGES"}
              </button>
            </div>
          </div>

          {/* Phone */}
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.12)] rounded-lg p-6">
            <h2 className="text-xs font-semibold text-zinc-300 mb-4 uppercase tracking-wider typewriter-label">PHONE</h2>
            {badge.phone ? (
              <div className="flex items-center gap-1.5 text-[10px] text-green-500/70">
                <Smartphone className="w-3 h-3" />
                <span className="typewriter-label">{maskPhone(badge.phone)}</span>
              </div>
            ) : (
               <div className="flex flex-col sm:flex-row gap-2">
                 <input
                   type="tel"
                   value={phone}
                   onChange={(e) => setPhone(e.target.value)}
                   placeholder="+1 (555) 000-0000"
                   className="flex-1 bg-[#08080a] border border-[rgba(168,144,112,0.15)] rounded px-2.5 py-1.5 text-xs font-mono text-zinc-300 outline-none focus:border-[#d97706]/40 placeholder:text-zinc-700"
                   onKeyDown={(e) => e.key === "Enter" && handlePhoneRegister()}
                 />
                 <button
                   onClick={handlePhoneRegister}
                   disabled={phoneSaving || phone.trim().length < 7}
                   className="px-3 py-1.5 bg-[#d97706]/20 border border-[#d97706]/30 text-[10px] text-[#d97706] typewriter-label hover:bg-[#d97706]/30 disabled:opacity-40 transition-all min-h-[44px] justify-center sm:justify-normal"
                 >
                   {phoneSaving ? "..." : "SAVE"}
                 </button>
               </div>
             )}
            {phoneError && <p className="flex items-center gap-1 text-[9px] text-red-400/80 mt-1.5"><AlertCircle className="w-2.5 h-2.5" />{phoneError}</p>}
            {phoneSuccess && <p className="flex items-center gap-1 text-[9px] text-green-400/80 mt-1.5"><CheckCircle className="w-2.5 h-2.5" />Phone registered</p>}
          </div>

          {/* Stats */}
          {profile && (
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.12)] rounded-lg p-6">
              <h2 className="text-xs font-semibold text-zinc-300 mb-4 uppercase tracking-wider typewriter-label">STATISTICS</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-[#08080a] border border-[rgba(168,144,112,0.08)] rounded p-3 text-center">
                  <p className="text-lg font-bold text-zinc-100">{profile.voteCount}</p>
                  <p className="text-[10px] text-zinc-500">Votes</p>
                </div>
                <div className="bg-[#08080a] border border-[rgba(168,144,112,0.08)] rounded p-3 text-center">
                  <p className="text-lg font-bold text-zinc-100">{profile.commentCount}</p>
                  <p className="text-[10px] text-zinc-500">Comments</p>
                </div>
                <div className="bg-[#08080a] border border-[rgba(168,144,112,0.08)] rounded p-3 text-center">
                  <p className="text-lg font-bold text-zinc-100">{Object.values(profile.taskCounts || {}).reduce((a, b) => a + b, 0)}</p>
                  <p className="text-[10px] text-zinc-500">Tasks</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentHQWrapper() {
  return (
    <ErrorBoundary>
      <AgentHQ />
    </ErrorBoundary>
  );
}
