import { getTopicById } from "@/lib/actions";
import { notFound, redirect } from "next/navigation";
import { ConcludeTopicForm } from "./ConcludeTopicForm";
import { Stamp } from "lucide-react";
import { getCurrentUser } from "@/lib/get-current-user";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConcludeTopicPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "BUREAU") redirect("/");

  const topic = await getTopicById(id);

  if (!topic) notFound();

  if (topic.status === "CONCLUDED") {
    return (
      <div className="case-file rounded-2xl p-8 text-center">
        <p className="text-zinc-400 text-lg">This case has already been concluded.</p>
        <p className="text-zinc-600 text-sm mt-2">Verdict: {topic.verdict}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="case-file rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Stamp className="w-4 h-4 text-amber-500" />
          <span className="typewriter-label text-amber-400/60">Final Verdict</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">Conclude Investigation</h1>
        <p className="text-sm text-zinc-500">
          Reviewing: <span className="text-zinc-300">{topic.title}</span>
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="case-file rounded-2xl p-6">
          <ConcludeTopicForm topic={topic} />
        </div>
      </div>
    </div>
  );
}
