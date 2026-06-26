import { getTopicById } from "@/lib/actions";
import { notFound } from "next/navigation";
import { ConcludeTopicForm } from "./ConcludeTopicForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConcludeTopicPage({ params }: Props) {
  const { id } = await params;
  const topic = await getTopicById(id);

  if (!topic) notFound();

  if (topic.status === "CONCLUDED") {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400 text-lg">This topic has already been concluded.</p>
        <p className="text-zinc-600 text-sm mt-2">Verdict: {topic.verdict}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Conclude Investigation</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Reviewing: <span className="text-zinc-300">{topic.title}</span>
        </p>
      </div>

      <div className="max-w-2xl">
        <ConcludeTopicForm topic={topic} />
      </div>
    </div>
  );
}
