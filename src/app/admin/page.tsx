import { getStats, getUpcomingTopics } from "@/lib/actions";
import { LayoutDashboard, Scale, MessageSquare, Sparkles, CheckCircle2 } from "lucide-react";
import { StatsCard } from "@/components/admin/StatsCard";
import Link from "next/link";
import { PromoteSection } from "./PromoteSection";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [stats, upcomingTopics] = await Promise.all([
    getStats(),
    getUpcomingTopics(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage myths, verdicts, and community comments
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Topics"
          value={stats.totalTopics}
          icon={<Scale className="w-5 h-5" />}
          color="violet"
        />
        <StatsCard
          title="Active"
          value={stats.activeTopics}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
        />
        <StatsCard
          title="Upcoming"
          value={stats.upcomingTopics}
          icon={<Sparkles className="w-5 h-5" />}
          color="amber"
        />
        <StatsCard
          title="Comments"
          value={stats.totalComments}
          icon={<MessageSquare className="w-5 h-5" />}
          color="blue"
        />
      </div>

      {upcomingTopics.length > 0 && <PromoteSection topics={upcomingTopics} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/topics/new"
          className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-violet-500/50 transition-all group"
        >
          <h3 className="text-white font-semibold mb-1 group-hover:text-violet-300 transition-colors">
            + New Topic
          </h3>
          <p className="text-sm text-zinc-500">
            Create a new myth or conspiracy to investigate
          </p>
        </Link>
        <Link
          href="/admin/comments"
          className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-violet-500/50 transition-all group"
        >
          <h3 className="text-white font-semibold mb-1 group-hover:text-violet-300 transition-colors">
            Moderate Comments
          </h3>
          <p className="text-sm text-zinc-500">
            Review flagged comments ({stats.flaggedComments} flagged)
          </p>
        </Link>
      </div>
    </div>
  );
}
