import { getAllTasks, createTask } from "@/lib/task-actions";
import { prisma } from "@/lib/prisma";
import { TasksClient } from "./TasksClient";

export default async function AdminTasksPage() {
  const tasks = await getAllTasks();
  const agents = await prisma.user.findMany({
    where: { role: { in: ["AGENT"] } },
    select: { id: true, badgeCode: true, displayName: true },
  });

  return <TasksClient tasks={tasks} agents={agents} createTask={createTask} />;
}
