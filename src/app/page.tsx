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
        topics={topics}
        upcomingTopics={upcomingTopics}
        categories={categories}
        concludedTopics={concludedTopics}
      />
    </>
  );
}
