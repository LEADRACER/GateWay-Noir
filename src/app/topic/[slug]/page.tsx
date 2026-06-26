import { notFound } from "next/navigation";
import { getTopicBySlug } from "@/lib/actions";
import { TopicDetailClient } from "./TopicDetailClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  if (!topic) return { title: "Topic Not Found — Myth:GateWay" };
  return {
    title: `${topic.title} — Myth:GateWay`,
    description: topic.description.substring(0, 160),
  };
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);

  if (!topic) notFound();

  return <TopicDetailClient topic={topic} />;
}
