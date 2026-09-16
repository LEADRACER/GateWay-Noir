import { getAllTasks, createTask, getAgentTasks } from "@/lib/task-actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TasksClient } from "./TasksClient";
import { BureauTasksClient } from "./BureauTasksClient";
import { getCurrentUser } from "@/lib/get-current-user";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminTasksPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "BUREAU" && user.role !== "AGENT")) redirect("/");

  const isBureau = user.role === "BUREAU";
  
  if (isBureau) {
    const tasks = await getAllTasks();
    const supabase = await createServerSupabaseClient();

    const { data: agents } = await supabase
      .from('User')
      .select("id, badgeCode, displayName")
      .eq("role", "AGENT");

    return <BureauTasksClient initialTasks={tasks} agents={agents || []} />;
  } else {
    // Agent view - show their own tasks
    const tasks = await getAgentTasks(user.id);
    return <TasksClient tasks={tasks} agents={[]} createTask={createTask} isAgentView={true} />;
  }
}
