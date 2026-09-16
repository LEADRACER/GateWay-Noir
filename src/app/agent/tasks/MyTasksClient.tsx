"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Play,
  CheckCircle2,
  Clock,
  Loader2,
  FileX,
  Plus,
  Edit,
  Link,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Calendar,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import { updateTaskStatus } from "@/lib/task-actions";

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

interface TaskEvidence {
  id: string;
  taskId: string;
  agentId: string;
  dayNumber: number;
  content: string;
  evidenceUrls: string[];
  createdAt: string;
  updatedAt: string;
}

interface MyTasksClientProps {
  tasks: Task[];
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/15",
    ASSIGNED: "bg-blue-500/10 text-blue-400 border-blue-500/15",
    IN_PROGRESS: "bg-blue-500/10 text-blue-400 border-blue-500/15",
    COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/15",
    CANCELLED: "bg-red-500/10 text-red-400 border-red-500/15",
  };
  const icons: Record<string, React.ReactNode> = {
    PENDING: <Clock className="w-2.5 h-2.5" />,
    ASSIGNED: <ClipboardList className="w-2.5 h-2.5" />,
    IN_PROGRESS: <Loader2 className="w-2.5 h-2.5 animate-spin" />,
    COMPLETED: <CheckCircle2 className="w-2.5 h-2.5" />,
    CANCELLED: <FileX className="w-2.5 h-2.5" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium border typewriter-label ${styles[status] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/15"}`}
    >
      {icons[status]}
      {status.replace("_", " ")}
    </span>
  );
}

function EvidenceEntry({ evidence, index }: { evidence: TaskEvidence; index: number }) {
  return (
    <div className="border-l-2 border-[rgba(168,144,112,0.15)] pl-3 ml-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-5 h-5 text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded typewriter-label">
          {evidence.dayNumber}
        </span>
        <span className="text-[9px] text-zinc-500 typewriter-label">DAY {evidence.dayNumber}</span>
        <span className="text-[8px] text-zinc-600">—</span>
        <span className="text-[8px] text-zinc-500">{formatDate(evidence.createdAt)}</span>
      </div>
      <p className="text-[10px] text-zinc-300 ml-7 leading-relaxed whitespace-pre-wrap">{evidence.content}</p>
      {evidence.evidenceUrls.length > 0 && (
        <div className="ml-7 flex flex-wrap gap-1.5">
          {evidence.evidenceUrls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded hover:bg-blue-500/20 transition-colors typewriter-label"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              Evidence {i + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function AddEvidenceForm({ taskId, onClose, onSaved }: { taskId: string; onClose: () => void; onSaved: () => void }) {
  const [dayNumber, setDayNumber] = useState(1);
  const [content, setContent] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }

    const urls = evidenceUrls.filter((u) => u.trim()).map((u) => u.trim());

    setSaving(true);
    try {
      const res = await fetch(`/api/agent/tasks/${taskId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayNumber, content, evidenceUrls: urls }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save evidence");
        return;
      }

      toast.success(`Day ${dayNumber} evidence saved`);
      onSaved();
      onClose();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const addUrlField = () => {
    if (evidenceUrls.length < 5) {
      setEvidenceUrls([...evidenceUrls, ""]);
    }
  };

  const removeUrlField = (index: number) => {
    setEvidenceUrls(evidenceUrls.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.1)] rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-zinc-300 typewriter-label">ADD DAILY EVIDENCE</h4>
        <button onClick={onClose} className="p-1 text-zinc-600 hover:text-zinc-400"><X className="w-4 h-4" /></button>
      </div>

      <div>
        <label className="text-[9px] text-zinc-500 typewriter-label block mb-1">DAY NUMBER</label>
        <input
          type="number"
          min="1"
          max="999"
          value={dayNumber}
          onChange={(e) => setDayNumber(parseInt(e.target.value) || 1)}
          className="w-full bg-black/40 border border-[rgba(168,144,112,0.1)] px-2.5 py-2 text-[11px] text-zinc-300 outline-none focus:border-amber-500/40 rounded"
        />
      </div>

      <div>
        <label className="text-[9px] text-zinc-500 typewriter-label block mb-1">EVIDENCE / NOTES</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What did you do today? Any findings, observations, links..."
          rows={4}
          className="w-full bg-black/40 border border-[rgba(168,144,112,0.1)] px-2.5 py-2 text-[11px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-amber-500/40 rounded resize-none"
        />
      </div>

      <div>
        <label className="text-[9px] text-zinc-500 typewriter-label block mb-1">EVIDENCE LINKS (optional)</label>
        <div className="space-y-1.5">
          {evidenceUrls.map((url, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  const newUrls = [...evidenceUrls];
                  newUrls[index] = e.target.value;
                  setEvidenceUrls(newUrls);
                }}
                placeholder="https://example.com/evidence"
                className="flex-1 bg-black/40 border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 text-[10px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-amber-500/40 rounded"
              />
              {evidenceUrls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeUrlField(index)}
                  className="p-1 text-zinc-600 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {evidenceUrls.length < 5 && (
            <button
              type="button"
              onClick={addUrlField}
              className="text-[9px] text-zinc-500 hover:text-zinc-400 typewriter-label flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              ADD LINK
            </button>
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !content.trim()}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-400 typewriter-label hover:bg-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
        {saving ? "SAVING..." : "SAVE EVIDENCE"}
      </button>
    </div>
  );
}

export function MyTasksClient({ tasks: initialTasks }: MyTasksClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [evidenceMap, setEvidenceMap] = useState<Record<string, TaskEvidence[]>>({});
  const [showEvidenceForm, setShowEvidenceForm] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const fetchEvidence = async (taskId: string) => {
    try {
      const res = await fetch(`/api/agent/tasks/${taskId}/evidence`);
      const data = await res.json();
      if (res.ok && data.evidence) {
        setEvidenceMap((prev) => ({ ...prev, [taskId]: data.evidence }));
      }
    } catch {
      // silent fail
    }
  };

  const handleStatusUpdate = async (taskId: string, status: string) => {
    setUpdatingId(taskId);
    try {
      const result = await updateTaskStatus(taskId, status);
      if (result?.success) {
        toast.success(
          status === "IN_PROGRESS" ? "Task started — add daily evidence" : "Task completed"
        );
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status,
                  completedAt: status === "COMPLETED" ? new Date() : t.completedAt,
                }
              : t
          )
        );
        if (status === "IN_PROGRESS") {
          setShowEvidenceForm(taskId);
        }
      } else {
        toast.error(result?.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update task");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
    if (!expandedTasks.has(taskId) && !evidenceMap[taskId]) {
      fetchEvidence(taskId);
    }
  };

  const handleEvidenceSaved = () => {
    if (showEvidenceForm) {
      fetchEvidence(showEvidenceForm);
    }
  };

  const pendingCount = tasks.filter((t) => t.status === "PENDING").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-[#d97706] opacity-50" />
        <h1 className="text-zinc-200 font-semibold typewriter-label text-sm">
          MY ASSIGNED TASKS
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3 text-center">
          <p className="text-amber-400 text-lg font-bold">{pendingCount}</p>
          <p className="text-zinc-600 text-[9px] typewriter-label">PENDING</p>
        </div>
        <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3 text-center">
          <p className="text-blue-400 text-lg font-bold">{inProgressCount}</p>
          <p className="text-zinc-600 text-[9px] typewriter-label">IN PROGRESS</p>
        </div>
        <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3 text-center">
          <p className="text-emerald-400 text-lg font-bold">{completedCount}</p>
          <p className="text-zinc-600 text-[9px] typewriter-label">COMPLETED</p>
        </div>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-10 text-center">
          <FileX className="w-8 h-8 text-zinc-700 mx-auto mb-3 opacity-50" />
          <p className="text-zinc-500 text-xs typewriter-label">
            NO TASKS ASSIGNED YET
          </p>
          <p className="text-zinc-700 text-[10px] mt-1">
            Check back later for new assignments
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((task) => {
            const isExpanded = expandedTasks.has(task.id);
            const evidence = evidenceMap[task.id] || [];
            const maxDay = evidence.length > 0 ? Math.max(...evidence.map((e) => e.dayNumber)) : 0;

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#111113] border border-[rgba(168,144,112,0.08)] overflow-hidden"
              >
                {/* Task Header - always visible */}
                <button
                  onClick={() => toggleExpand(task.id)}
                  className="w-full p-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={task.status} />
                    </div>
                    <h4 className="text-xs font-medium text-zinc-300">{task.title}</h4>
                    {task.description && (
                      <p className="text-[10px] text-zinc-500 mt-0.5">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-zinc-600">
                        Assigned {formatDate(task.createdAt)}
                      </span>
                      {task.status === "IN_PROGRESS" && maxDay > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded typewriter-label">
                          <Calendar className="w-2.5 h-2.5" />
                          Day {maxDay}
                        </span>
                      )}
                      {task.completedAt && (
                        <span className="text-[9px] text-emerald-600">
                          <CheckCircle2 className="w-2.5 h-2.5 inline" />
                          Completed {formatDate(task.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {task.status === "PENDING" && (
                      <button
                        onClick={() => handleStatusUpdate(task.id, "IN_PROGRESS")}
                        disabled={updatingId === task.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/15 hover:bg-blue-500/20 typewriter-label disabled:opacity-40 transition-colors"
                      >
                        {updatingId === task.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        START
                      </button>
                    )}
                    {task.status === "IN_PROGRESS" && (
                      <>
                        <button
                          onClick={() => setShowEvidenceForm(task.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/15 hover:bg-amber-500/20 typewriter-label transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          ADD EVIDENCE
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(task.id, "COMPLETED")}
                          disabled={updatingId === task.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 hover:bg-emerald-500/20 typewriter-label disabled:opacity-40 transition-colors"
                        >
                          {updatingId === task.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          COMPLETE
                        </button>
                      </>
                    )}
                    {task.status === "COMPLETED" && (
                      <span className="text-[9px] text-emerald-400 typewriter-label">✓ DONE</span>
                    )}
                  </div>
                </button>

                {/* Expanded Evidence Section */}
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: isExpanded ? 1 : 0, height: isExpanded ? "auto" : 0 }}
                  className="overflow-hidden border-t border-[rgba(168,144,112,0.05)] bg-[#0a0a0c]"
                >
                  {showEvidenceForm === task.id && (
                    <AddEvidenceForm
                      taskId={task.id}
                      onClose={() => setShowEvidenceForm(null)}
                      onSaved={handleEvidenceSaved}
                    />
                  )}
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-400 typewriter-label">DAILY EVIDENCE LOG</span>
                      {evidence.length > 0 && (
                        <span className="text-[9px] text-zinc-600">
                          {evidence.length} day{evidence.length !== 1 ? "s" : ""} logged
                        </span>
                      )}
                    </div>
                    {evidence.length === 0 && !showEvidenceForm ? (
                      <p className="text-[10px] text-zinc-600 text-center py-4">
                        No evidence logged yet. Start the task and add your first entry.
                      </p>
                    ) : (
                      <div className="space-y-0">
                        {evidence
                          .slice()
                          .sort((a, b) => b.dayNumber - a.dayNumber)
                          .map((e, idx) => (
                            <EvidenceEntry key={e.id} evidence={e} index={idx} />
                          ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}