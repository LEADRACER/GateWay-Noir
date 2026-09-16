"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  PlusCircle,
  Play,
  CheckCircle2,
  Clock,
  Loader2,
  User,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ExternalLink,
  Eye,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import { updateTaskStatus, createTask } from "@/lib/task-actions";

interface TaskUser {
  badgeCode: string;
  displayName: string;
}

interface AgentOption {
  id: string;
  badgeCode: string;
  displayName: string;
}

interface Task {
  id: string;
  agentId: string;
  adminId: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string | Date;
  completedAt: string | Date | null;
  agent?: TaskUser;
  admin?: TaskUser;
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

const STATUS_FILTERS = ["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

// Responsive hook to calculate cards per view
function useTasksPerView() {
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    const updateWidth = () => setWidth(window.innerWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);
  
  // Card width ~380px + gap 12px = ~392px per card
  // 1 card: < 784px (mobile)
  // 2 cards: 784px - 1176px (tablet)  
  // 3 cards: 1176px - 1568px (desktop)
  // 4 cards: > 1568px (large desktop)
  if (width < 784) return 1;
  if (width < 1176) return 2;
  if (width < 1568) return 3;
  return 4;
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
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium border typewriter-label ${styles[status] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/15"}`}
    >
      {icons[status]}
      {status.replace("_", " ")}
    </span>
  );
}

function EvidenceEntry({ evidence }: { evidence: TaskEvidence }) {
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

function TaskCard({
  task,
  evidence,
  onStatusUpdate,
  updatingId,
  onViewDetails,
}: {
  task: Task;
  evidence: TaskEvidence[];
  onStatusUpdate: (taskId: string, status: string) => void;
  updatingId: string | null;
  onViewDetails: (taskId: string) => void;
}) {
  const maxDay = evidence.length > 0 ? Math.max(...evidence.map((e) => e.dayNumber)) : 0;

  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded overflow-hidden flex flex-col"
      style={{ minHeight: "380px", maxWidth: "100%" }}
    >
      {/* Header */}
      <div className="p-3 border-b border-[rgba(168,144,112,0.05)] flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <StatusBadge status={task.status} />
            {task.agent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono border bg-amber-500/10 text-amber-400 border-amber-500/20 typewriter-label">
                <User className="w-2.5 h-2.5" />
                {task.agent.badgeCode}
              </span>
            )}
          </div>
          <h4 className="text-xs font-medium text-zinc-300 truncate pr-4">{task.title}</h4>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onViewDetails(task.id)}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="View details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {task.status === "PENDING" && (
            <button
              onClick={() => onStatusUpdate(task.id, "IN_PROGRESS")}
              disabled={updatingId === task.id}
              className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/15 hover:bg-blue-500/20 typewriter-label disabled:opacity-40 transition-colors"
            >
              {updatingId === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              START
            </button>
          )}
          {task.status === "IN_PROGRESS" && (
            <button
              onClick={() => onStatusUpdate(task.id, "COMPLETED")}
              disabled={updatingId === task.id}
              className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 hover:bg-emerald-500/20 typewriter-label disabled:opacity-40 transition-colors"
            >
              {updatingId === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              COMPLETE
            </button>
          )}
          {task.status === "COMPLETED" && (
            <span className="text-[9px] text-emerald-400 typewriter-label">✓ DONE</span>
          )}
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <div className="px-3 py-2 border-b border-[rgba(168,144,112,0.05)]">
          <p className="text-[10px] text-zinc-500 line-clamp-2">{task.description}</p>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="px-3 py-2 border-b border-[rgba(168,144,112,0.05)] flex items-center justify-between">
        <div className="flex items-center gap-2 text-[9px] text-zinc-600">
          <span>Assigned {formatDate(task.createdAt)}</span>
          {task.status === "IN_PROGRESS" && maxDay > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded typewriter-label">
              <Calendar className="w-2.5 h-2.5" />
              Day {maxDay}
            </span>
          )}
        </div>
        {task.completedAt && (
          <span className="text-[9px] text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Completed {formatDate(task.completedAt)}
          </span>
        )}
      </div>

      {/* Evidence Log - scrollable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
        {evidence.length === 0 ? (
          <div className="text-center py-6">
            <ClipboardList className="w-6 h-6 text-zinc-700 mx-auto mb-1.5 opacity-50" />
            <p className="text-[9px] text-zinc-600 typewriter-label">NO EVIDENCE LOGGED</p>
            <p className="text-[8px] text-zinc-700 mt-0.5">Agent hasn&apos;t started daily logs</p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] text-zinc-500 typewriter-label">EVIDENCE LOG ({evidence.length} day{evidence.length !== 1 ? "s" : ""})</span>
              <span className="text-[8px] text-zinc-600">Latest: Day {maxDay}</span>
            </div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
              {evidence
                .slice()
                .sort((a, b) => b.dayNumber - a.dayNumber)
                .map((e) => (
                  <EvidenceEntry key={e.id} evidence={e} />
                ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function BureauTasksClient({ initialTasks, agents }: { initialTasks: Task[]; agents: AgentOption[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("ALL");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [evidenceMap, setEvidenceMap] = useState<Record<string, TaskEvidence[]>>({});
  const [loadingEvidence, setLoadingEvidence] = useState<Set<string>>(new Set());
  const [viewDetailsId, setViewDetailsId] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const filteredTasks = activeFilter === "ALL"
    ? tasks
    : tasks.filter((t) => t.status === activeFilter);

  // Sort: IN_PROGRESS first, then PENDING, then COMPLETED
  const statusPriority = { IN_PROGRESS: 0, PENDING: 1, COMPLETED: 2 };
  filteredTasks.sort((a, b) => (statusPriority[a.status as keyof typeof statusPriority] ?? 3) - (statusPriority[b.status as keyof typeof statusPriority] ?? 3));

  const fetchEvidence = useCallback(async (taskId: string) => {
    if (loadingEvidence.has(taskId)) return;
    setLoadingEvidence((prev) => new Set(prev).add(taskId));
    try {
      const res = await fetch(`/api/agent/tasks/${taskId}/evidence`);
      const data = await res.json();
      if (res.ok && data.evidence) {
        setEvidenceMap((prev) => ({ ...prev, [taskId]: data.evidence }));
      }
    } catch {
      // silent
    } finally {
      setLoadingEvidence((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }, [loadingEvidence]);

  // Pre-fetch evidence for first few tasks
  useEffect(() => {
    filteredTasks.slice(0, 4).forEach((task) => {
      if (!evidenceMap[task.id] && !loadingEvidence.has(task.id)) {
        fetchEvidence(task.id);
      }
    });
  }, [filteredTasks, evidenceMap, loadingEvidence, fetchEvidence]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedAgentId) {
      toast.error("Title and agent are required");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createTask(selectedAgentId, title, description);
      if (result?.success) {
        toast.success("Task assigned");
        setTitle("");
        setDescription("");
        setSelectedAgentId("");
        setTasks((prev) => [result.task, ...prev]);
        setActiveFilter("ALL");
      } else {
        toast.error(result?.error || "Failed to create task");
      }
    } catch {
      toast.error("Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (taskId: string, status: string) => {
    setUpdatingId(taskId);
    try {
      const result = await updateTaskStatus(taskId, status);
      if (result?.success) {
        toast.success(status === "IN_PROGRESS" ? "Task started" : "Task completed");
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, status, completedAt: status === "COMPLETED" ? new Date() : t.completedAt }
              : t
          )
        );
      } else {
        toast.error(result?.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update task");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleViewDetails = (taskId: string) => {
    setViewDetailsId(taskId);
    if (!evidenceMap[taskId]) fetchEvidence(taskId);
  };

  // Responsive cards per view
  const tasksPerView = useTasksPerView();
  const totalPages = Math.ceil(filteredTasks.length / tasksPerView);
  const currentPageTasks = filteredTasks.slice(carouselIndex * tasksPerView, (carouselIndex + 1) * tasksPerView);

  // Reset carousel index when tasksPerView changes
  useEffect(() => {
    if (carouselIndex >= totalPages && totalPages > 0) {
      setCarouselIndex(totalPages - 1);
    }
  }, [tasksPerView, totalPages, carouselIndex]);

  const goToPage = (page: number) => {
    setCarouselIndex(Math.max(0, Math.min(page, totalPages - 1)));
  };

  const goPrev = () => goToPage(carouselIndex - 1);
  const goNext = () => goToPage(carouselIndex + 1);

  // Stats
  const stats = {
    pending: tasks.filter((t) => t.status === "PENDING").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    completed: tasks.filter((t) => t.status === "COMPLETED").length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-[#d97706] opacity-50" />
        <h1 className="text-zinc-200 font-semibold typewriter-label text-sm">AGENT TASKS — BUREAU VIEW</h1>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3 text-center">
          <p className="text-amber-400 text-lg font-bold">{stats.pending}</p>
          <p className="text-zinc-600 text-[8px] typewriter-label">PENDING</p>
        </div>
        <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3 text-center">
          <p className="text-blue-400 text-lg font-bold">{stats.inProgress}</p>
          <p className="text-zinc-600 text-[8px] typewriter-label">IN PROGRESS</p>
        </div>
        <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3 text-center">
          <p className="text-emerald-400 text-lg font-bold">{stats.completed}</p>
          <p className="text-zinc-600 text-[8px] typewriter-label">COMPLETED</p>
        </div>
        <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3 text-center">
          <p className="text-violet-400 text-lg font-bold">{tasks.length}</p>
          <p className="text-zinc-600 text-[8px] typewriter-label">TOTAL</p>
        </div>
      </div>

      {/* New Task Form */}
      <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)]">
        <div className="h-0.5" style={{ background: "linear-gradient(90deg, transparent, #d97706, transparent)" }} />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <PlusCircle className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
            <h3 className="text-zinc-300 font-semibold typewriter-label text-xs">ASSIGN NEW TASK</h3>
          </div>
          <form onSubmit={handleCreate} className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Task title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-[rgba(217,119,6,0.3)] transition-colors"
              />
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] text-zinc-300 focus:outline-none focus:border-[rgba(217,119,6,0.3)] transition-colors"
              >
                <option value="">Select agent...</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.badgeCode} — {agent.displayName}</option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Description (optional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-[rgba(217,119,6,0.3)] transition-colors resize-none"
            />
            <button
              type="submit"
              disabled={submitting || !title.trim() || !selectedAgentId}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium bg-[#d97706] text-black typewriter-label disabled:opacity-40 hover:bg-[#e08810] transition-colors w-full sm:w-auto"
            >
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3 h-3" />}
              ASSIGN
            </button>
          </form>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-1 bg-[#111113] border border-[rgba(168,144,112,0.08)] p-1">
        <Filter className="w-3 h-3 text-zinc-600 ml-1.5 mr-1" />
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => {
              setActiveFilter(filter);
              setCarouselIndex(0);
            }}
            className={`px-2.5 py-1 text-[10px] font-medium typewriter-label transition-colors ${
              activeFilter === filter
                ? "bg-[#0d0d0f] text-zinc-200 border border-[rgba(168,144,112,0.12)]"
                : "text-zinc-600 hover:text-zinc-400 border border-transparent"
            }`}
          >
            {filter === "ALL"
              ? `ALL (${tasks.length})`
              : `${filter.replace("_", " ")} (${tasks.filter((t) => t.status === filter).length})`}
          </button>
        ))}
      </div>

      {/* Carousel */}
      {filteredTasks.length === 0 ? (
        <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-8 text-center">
          <ClipboardList className="w-6 h-6 text-zinc-700 mx-auto mb-2 opacity-50" />
          <p className="text-zinc-600 text-[10px] typewriter-label">NO TASKS FOUND</p>
          <p className="text-zinc-700 text-[10px] mt-0.5">
            {activeFilter === "ALL" ? "Assign a task to get started" : `No ${activeFilter.replace("_", " ").toLowerCase()} tasks`}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Carousel Viewport */}
          <div className="overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={carouselIndex}
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -30, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="flex gap-3"
              >
                {currentPageTasks.map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    evidence={evidenceMap[task.id] || []}
                    onStatusUpdate={handleStatusUpdate}
                    updatingId={updatingId}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Carousel Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={goPrev}
                disabled={carouselIndex === 0}
                className="p-2 bg-[#111113] border border-[rgba(168,144,112,0.1)] text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => goToPage(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === carouselIndex
                        ? "bg-amber-400 w-6"
                        : "bg-zinc-600 hover:bg-zinc-400"
                    }`} />
                ))}
              </div>
              <button
                onClick={goNext}
                disabled={carouselIndex >= totalPages - 1}
                className="p-2 bg-[#111113] border border-[rgba(168,144,112,0.1)] text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Page indicator */}
          <p className="text-center text-[9px] text-zinc-600 typewriter-label mt-2">
            Showing {carouselIndex * tasksPerView + 1}–{Math.min((carouselIndex + 1) * tasksPerView, filteredTasks.length)} of {filteredTasks.length} tasks
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {viewDetailsId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[#0d0d0f] border border-[rgba(168,144,112,0.12)] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-3 border-b border-[rgba(168,144,112,0.06)] bg-[#0a0a0c]">
              <div className="flex items-center gap-2">
                <StatusBadge status={tasks.find(t => t.id === viewDetailsId)?.status || ""} />
                <h3 className="text-xs font-medium text-zinc-300 typewriter-label truncate">
                  {tasks.find(t => t.id === viewDetailsId)?.title}
                </h3>
              </div>
              <button
                onClick={() => setViewDetailsId(null)}
                className="p-1 text-zinc-600 hover:text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <TaskCard
                task={tasks.find(t => t.id === viewDetailsId)!}
                evidence={evidenceMap[viewDetailsId] || []}
                onStatusUpdate={handleStatusUpdate}
                updatingId={updatingId}
                onViewDetails={() => {}}
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}