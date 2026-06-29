"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  PlusCircle,
  Play,
  CheckCircle2,
  Clock,
  Loader2,
  User,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import { updateTaskStatus } from "@/lib/task-actions";

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

interface TasksClientProps {
  tasks: Task[];
  agents: AgentOption[];
  createTask: (
    agentId: string,
    adminId: string,
    title: string,
    description?: string
  ) => Promise<any>;
}

const STATUS_FILTERS = ["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

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

export function TasksClient({ tasks: initialTasks, agents, createTask }: TasksClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("ALL");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredTasks =
    activeFilter === "ALL"
      ? tasks
      : tasks.filter((t) => t.status === activeFilter);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedAgentId) {
      toast.error("Title and agent are required");
      return;
    }
    setSubmitting(true);
    try {
      // Use a placeholder adminId — in production this would come from session
      const adminId = "admin";
      const result = await createTask(selectedAgentId, adminId, title, description);
      if (result?.success) {
        toast.success("Task assigned");
        setTitle("");
        setDescription("");
        setSelectedAgentId("");
        // Optimistically add to list
        setTasks((prev) => [result.task, ...prev]);
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
        toast.success(
          status === "IN_PROGRESS" ? "Task started" : "Task completed"
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
      } else {
        toast.error(result?.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update task");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-[#d97706] opacity-50" />
        <h1 className="text-zinc-200 font-semibold typewriter-label text-sm">
          AGENT TASKS
        </h1>
      </div>

      {/* New Task Form */}
      <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)]">
        <div className="h-0.5 evidence-tape" />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <PlusCircle className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
            <h3 className="text-zinc-300 font-semibold typewriter-label text-xs">
              ASSIGN NEW TASK
            </h3>
          </div>
          <form onSubmit={handleCreate} className="space-y-2.5">
            <input
              type="text"
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-[rgba(217,119,6,0.3)] transition-colors"
            />
            <textarea
              placeholder="Description (optional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-[rgba(217,119,6,0.3)] transition-colors resize-none"
            />
            <div className="flex items-center gap-2">
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] text-zinc-300 focus:outline-none focus:border-[rgba(217,119,6,0.3)] transition-colors"
              >
                <option value="">Select agent...</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.badgeCode} — {agent.displayName}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={submitting || !title.trim() || !selectedAgentId}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium bg-[#d97706] text-black typewriter-label disabled:opacity-40 hover:bg-[#e08810] transition-colors"
              >
                {submitting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <PlusCircle className="w-3 h-3" />
                )}
                ASSIGN
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-1 bg-[#111113] border border-[rgba(168,144,112,0.08)] p-1">
        <Filter className="w-3 h-3 text-zinc-600 ml-1.5 mr-1" />
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
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

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-8 text-center">
          <ClipboardList className="w-6 h-6 text-zinc-700 mx-auto mb-2 opacity-50" />
          <p className="text-zinc-600 text-[10px] typewriter-label">
            NO TASKS FOUND
          </p>
          <p className="text-zinc-700 text-[10px] mt-0.5">
            {activeFilter === "ALL"
              ? "Assign a task to get started"
              : `No ${activeFilter.replace("_", " ").toLowerCase()} tasks`}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredTasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={task.status} />
                    {task.agent && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono border"
                        style={{
                          backgroundColor: "#d9770612",
                          borderColor: "#d9770625",
                          color: "#d97706",
                        }}
                      >
                        <User className="w-2.5 h-2.5" />
                        {task.agent.badgeCode}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-medium text-zinc-300 truncate">
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-zinc-600">
                      {formatDate(task.createdAt)}
                    </span>
                    {task.completedAt && (
                      <span className="text-[9px] text-emerald-600">
                        ✓ Completed {formatDate(task.completedAt)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {task.status === "PENDING" && (
                    <button
                      onClick={() => handleStatusUpdate(task.id, "IN_PROGRESS")}
                      disabled={updatingId === task.id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/15 hover:bg-blue-500/20 typewriter-label disabled:opacity-40 transition-colors"
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
                    <button
                      onClick={() => handleStatusUpdate(task.id, "COMPLETED")}
                      disabled={updatingId === task.id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 hover:bg-emerald-500/20 typewriter-label disabled:opacity-40 transition-colors"
                    >
                      {updatingId === task.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
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
  );
}
