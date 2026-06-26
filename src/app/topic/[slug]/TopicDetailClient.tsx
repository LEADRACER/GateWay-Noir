"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Clock, MessageSquare, BookOpen, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { CountdownFull } from "@/components/topic/CountdownTimer";
import { VerdictBanner } from "@/components/topic/VerdictBanner";
import { CommentSection } from "@/components/topic/CommentSection";
import { formatDate } from "@/lib/utils";

interface TopicDetailClientProps {
  topic: any;
}

export function TopicDetailClient({ topic }: TopicDetailClientProps) {
  const isConcluded = topic.status === "CONCLUDED";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to all myths
      </Link>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Badge
            className="text-xs uppercase tracking-wider font-semibold"
            style={{
              backgroundColor: `${topic.category.color}15`,
              borderColor: `${topic.category.color}30`,
              color: topic.category.color,
            }}
          >
            {topic.category.name}
          </Badge>
          <Badge variant={isConcluded ? "verdict" : "status"} status={topic.status} verdict={topic.verdict}>
            {isConcluded ? topic.verdict : "Active Investigation"}
          </Badge>
          {topic.durationDays && (
            <span className="text-xs text-zinc-600">
              {topic.durationDays}-day investigation
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
          {topic.title}
        </h1>

        <p className="text-base md:text-lg text-zinc-400 leading-relaxed mb-8">
          {topic.description}
        </p>

        {/* Timer Section */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-violet-400" />
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                {isConcluded ? "Case Closed" : "Time Remaining"}
              </h3>
              {!isConcluded && (
                <span className="text-xs text-zinc-600">
                  Started {formatDate(topic.createdAt)}
                </span>
              )}
            </div>
            <CountdownFull endsAt={topic.endsAt} />
          </CardContent>
        </Card>

        {/* Verdict Banner */}
        {isConcluded && topic.verdict && (
          <VerdictBanner verdict={topic.verdict} summary={topic.summary} />
        )}

        {/* Evidence Section */}
        {topic.evidence && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Evidence & Background</h3>
              </div>
              <div className="prose prose-invert prose-sm max-w-none text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {topic.evidence}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments Section */}
        <Card>
          <CardContent className="p-6">
            <CommentSection
              topicId={topic.id}
              initialComments={topic.comments || []}
              isConcluded={isConcluded}
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
