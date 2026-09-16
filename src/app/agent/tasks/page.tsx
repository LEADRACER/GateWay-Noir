import { getAgentTasks } from "@/lib/task-actions";
import { getCurrentUser } from "@/lib/get-current-user";
import { redirect } from "next/navigation";
import { MyTasksClient } from "./MyTasksClient";

export const dynamic = "force-dynamic";

export default async function AgentTasksPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "AGENT" && user.role !== "BUREAU" && user.role !== "DETECTIVE") redirect("/");

  if (user.role === "BUREAU") {
    redirect("/admin/tasks");
  }

  const tasks = await getAgentTasks(user.id);
  return <MyTasksClient tasks={tasks} />;
}
