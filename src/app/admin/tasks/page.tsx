import { getAllTasks, createTask } from "@/lib/task-actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TasksClient } from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function AdminTasksPage() {
  const tasks = await getAllTasks();
  const supabase = await createServerSupabaseClient();

  const { data: agents } = await supabase
    .from('User')
    .select("id, badgeCode, displayName")
    .eq("role", "AGENT");

  return <TasksClient tasks={tasks} agents={agents || []} createTask={createTask} />;
}
