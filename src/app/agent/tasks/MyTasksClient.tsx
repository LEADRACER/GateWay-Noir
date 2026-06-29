"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Play,
  CheckCircle2,
  Clock,
  Loader2,
  FileX,
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

interface MyTasksClientProps {
  tasks: Task[];
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

export function MyTasksClient({ tasks: initialTasks }: MyTasksClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
          {tasks.map((task) => (
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
                  </div>
                  <h4 className="text-xs font-medium text-zinc-300">
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-zinc-600">
                      Assigned {formatDate(task.createdAt)}
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
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/15 hover:bg-blue-500/20 typewriter-label disabled:opacity-40 transition-colors"
                    >
                      {updatingId === task.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      START TASK
                    </button>
                  )}
                  {task.status === "IN_PROGRESS" && (
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
                      MARK COMPLETE
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
