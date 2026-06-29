import { getConcludedTopics, getUpcomingTopics } from "@/lib/actions";
import Link from "next/link";
import { ArrowLeft, Archive, Inbox, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const [concludedTopics, upcomingTopics] = await Promise.all([
    getConcludedTopics(),
    getUpcomingTopics(),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors mb-4 typewriter-label"
      >
        <ArrowLeft className="w-3 h-3" />
        RETURN TO CASE BOARD
      </Link>

      {/* Header */}
      <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] mb-4">
        <div className="h-0.5 evidence-tape" />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Archive className="w-4 h-4 text-[#d97706] opacity-50" />
            <span className="case-number text-zinc-500">ANNOUNCEMENTS</span>
          </div>
          <h1 className="text-base font-bold text-zinc-200 mb-0.5">Concluded Cases</h1>
          <p className="text-xs text-zinc-600">
            {concludedTopics.length} case{concludedTopics.length !== 1 ? "s" : ""} with final verdicts delivered
          </p>
        </div>
      </div>

      {/* Concluded Cases List */}
      {concludedTopics.length === 0 ? (
        <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] p-8 text-center mb-6">
          <Archive className="w-6 h-6 text-zinc-800 mx-auto mb-2" />
          <p className="text-zinc-600 text-xs typewriter-label">NO CONCLUDED CASES YET</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {concludedTopics.map((topic: any) => (
            <Link
              key={topic.id}
              href={`/topic/${topic.slug}`}
              className="block bg-[#111113] border border-[rgba(168,144,112,0.08)] hover:border-[#d97706]/30 transition-all duration-200 group pixelated-amber-hover"
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      className="text-[8px]"
                      style={{
                        backgroundColor: `${topic.category.color}10`,
                        borderColor: `${topic.category.color}20`,
                        color: topic.category.color,
                      }}
                    >
                      {topic.category.name}
                    </Badge>
                    <span className="case-number text-zinc-600">{formatDate(topic.createdAt)}</span>
                  </div>
                  <Badge
                    variant="verdict"
                    verdict={topic.verdict}
                    className="text-[8px]"
                  >
                    {topic.verdict}
                  </Badge>
                </div>
                <h3 className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors leading-snug">
                  {topic.title}
                </h3>
                {topic.summary && (
                  <p className="text-[10px] text-zinc-600 mt-1 line-clamp-2 leading-relaxed">
                    {topic.summary}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pending Cases Section */}
      {upcomingTopics.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Inbox className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
            <h2 className="text-[10px] font-semibold text-zinc-500 typewriter-label">
              PENDING INTAKE ({upcomingTopics.length})
            </h2>
            <span className="case-number text-zinc-700">AWAITING REVIEW</span>
          </div>
          <div className="space-y-2">
            {upcomingTopics.map((topic: any) => (
              <div
                key={topic.id}
                className="bg-[#111113] border border-[rgba(168,144,112,0.08)] hover:border-[#d97706]/30 transition-all duration-200 pixelated-amber-hover"
              >
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        className="text-[8px]"
                        style={{
                          backgroundColor: `${topic.category.color}10`,
                          borderColor: `${topic.category.color}20`,
                          color: topic.category.color,
                        }}
                      >
                        {topic.category.name}
                      </Badge>
                      <span className="case-number text-zinc-700">
                        <span className="status-dot pending mr-1" />
                        {topic._count.votes} TIPS
                      </span>
                    </div>
                    <Clock className="w-3 h-3 text-zinc-700" />
                  </div>
                  <h3 className="text-xs font-medium text-zinc-400 leading-snug">
                    {topic.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
