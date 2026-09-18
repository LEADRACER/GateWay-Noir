import type { TopicWithCategory } from "@/lib/types/database";
import { getActiveAndConcludedTopics, getUpcomingTopics, getCategories, getConcludedTopics } from "@/lib/actions";
import { HeroSection } from "@/components/home/HeroSection";
import { HomeContent } from "./HomeContent";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [topics, upcomingTopics, categories, concludedTopics] = await Promise.all([
    getActiveAndConcludedTopics(),
    getUpcomingTopics(),
    getCategories(),
    getConcludedTopics(),
  ]);

  return (
    <>
      <HeroSection />
      <HomeContent
        topics={topics as TopicWithCategory[]}
        upcomingTopics={upcomingTopics as Array<TopicWithCategory & { _count: { votes: number } }>}
        categories={categories}
        concludedTopics={concludedTopics as Array<TopicWithCategory & { verdict: string }>}
      />
    </>
  );
}
