import { getCategories } from "@/lib/actions";
import { CreateTopicForm } from "./CreateTopicForm";
import { FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/get-current-user";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewTopicPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "BUREAU") redirect("/");

  const categories = await getCategories();

  return (
    <div>
      <div className="case-file rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-amber-500" />
          <span className="typewriter-label text-amber-400/60">New Investigation</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">Open Case File</h1>
        <p className="text-sm text-zinc-500">Register a new case for the bureau to investigate</p>
      </div>

      <div className="max-w-2xl">
        <div className="case-file rounded-2xl p-6">
          <CreateTopicForm categories={categories} />
        </div>
      </div>
    </div>
  );
}
