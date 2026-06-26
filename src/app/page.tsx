import { getActiveAndConcludedTopics, getUpcomingTopics, getCategories } from "@/lib/actions";
import { HeroSection } from "@/components/home/HeroSection";
import { HomeContent } from "./HomeContent";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [topics, upcomingTopics, categories] = await Promise.all([
    getActiveAndConcludedTopics(),
    getUpcomingTopics(),
    getCategories(),
  ]);

  return (
    <>
      <HeroSection />
      <HomeContent
        topics={topics}
        upcomingTopics={upcomingTopics}
        categories={categories}
      />
    </>
  );
}
