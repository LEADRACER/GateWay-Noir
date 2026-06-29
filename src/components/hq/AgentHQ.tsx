"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList, Play, CheckCircle2, Clock, Loader2, FileX,
  User, Smartphone, AlertCircle, CheckCircle, Scale, Save,
  MessageSquare, ArrowUpRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { useBadge } from "@/components/badge/BadgeProvider";
import { registerPhone } from "@/lib/badge-client";
import { getAgentProfile, updateAgentProfile } from "@/lib/profile-actions";
import { getAgentTasks, updateTaskStatus } from "@/lib/task-actions";
import { formatDate } from "@/lib/utils";

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
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
  const [activeTab, setActiveTab] = useState<"tasks" | "profile">("tasks");

  useEffect(() => {
    if (!badge) {
      setLoading(false);
      return;
    }

    Promise.all([
      getAgentProfile(badge.id),
      getAgentTasks(badge.id),
    ]).then(([profileData, taskData]) => {
      if (profileData) {
        const p = profileData as ProfileData;
        setProfile(p);
        setDisplayName(p.displayName || "");
        setBio(p.bio || "");
      }
      setTasks(taskData as Task[]);
      setLoading(false);
    });
  }, [badge]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const result = await updateAgentProfile(profile.id, { displayName, bio });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Profile updated");
        if (displayName !== badge?.displayName) {
          updateBadge({ displayName });
        }
      }
    } catch {
      toast.error("Failed to save");
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
    } else {
      setPhoneError(result.error || "Failed");
    }
    setPhoneSaving(false);
  };

  const handleTaskStatus = async (taskId: string, status: string) => {
    setUpdatingId(taskId);
    try {
      const result = await updateTaskStatus(taskId, status);
      if (result?.success) {
        toast.success(status === "IN_PROGRESS" ? "Task started" : "Task completed");
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status, completedAt: status === "COMPLETED" ? new Date() : t.completedAt } : t));
      } else {
        toast.error(result?.error || "Failed");
      }
    } catch {
      toast.error("Network error");
    }
    setUpdatingId(null);
  };

  const maskPhone = (p: string) => {
    if (p.length <= 4) return p;
    return p.slice(0, 3) + "****" + p.slice(-2);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (!badge) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-zinc-500 text-sm">No badge linked. Claim a badge first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111113] border border-[rgba(168,144,112,0.12)] rounded-lg p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#d97706]/10 border border-[#d97706]/20">
              <User className="w-4 h-4 text-[#d97706]" />
            </div>
            <div>
              <p className="text-sm font-mono font-bold text-[#d97706]">{badge.badgeCode}</p>
              <p className="text-[10px] text-zinc-500">{badge.displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#d97706]/10 border border-[#d97706]/20">
            <span className="text-[10px] font-medium text-[#d97706] typewriter-label">FIELD AGENT</span>
          </div>
        </div>
        {profile?.handlerInfo && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] rounded">
            <Scale className="w-3 h-3 text-[#d97706] opacity-50" />
            <span className="text-[10px] text-zinc-500">
              Handler: <span className="text-[#d97706] font-mono">{profile.handlerInfo.badgeCode}</span> — {profile.handlerInfo.displayName}
            </span>
          </div>
        )}
      </motion.div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 bg-[#111113] border border-[rgba(168,144,112,0.08)] p-1">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium typewriter-label transition-colors ${
            activeTab === "tasks"
              ? "bg-[#0d0d0f] text-zinc-200 border border-[rgba(168,144,112,0.12)]"
              : "text-zinc-600 hover:text-zinc-400 border border-transparent"
          }`}
        >
          <ClipboardList className="w-3 h-3" />
          TASKS
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium typewriter-label transition-colors ${
            activeTab === "profile"
              ? "bg-[#0d0d0f] text-zinc-200 border border-[rgba(168,144,112,0.12)]"
              : "text-zinc-600 hover:text-zinc-400 border border-transparent"
          }`}
        >
          <User className="w-3 h-3" />
          PROFILE
        </button>
        <div className="flex-1" />
        <a
          href="/agent/discussions"
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-zinc-500 hover:text-amber-400 typewriter-label transition-colors border border-transparent hover:border-[rgba(168,144,112,0.08)]"
        >
          <MessageSquare className="w-3 h-3" />
          DISCUSSIONS
          <ArrowUpRight className="w-2.5 h-2.5" />
        </a>
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
              <div className="flex gap-2">
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
                  className="px-3 py-1.5 bg-[#d97706]/20 border border-[#d97706]/30 text-[10px] text-[#d97706] typewriter-label hover:bg-[#d97706]/30 disabled:opacity-40 transition-all"
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
