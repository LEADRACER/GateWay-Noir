"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Clock, MessageSquare, BookOpen, Fingerprint, FileText, Stamp } from "lucide-react";
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
  const caseId = `GWN-${topic.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors mb-4 typewriter-label"
      >
        <ArrowLeft className="w-3 h-3" />
        RETURN TO CASE BOARD
      </Link>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {/* Case File Folder */}
        <div className="bg-[#111113] border-2 border-[rgba(168,144,112,0.12)] shadow-[0_4px_0_rgba(0,0,0,0.5),0_8px_24px_rgba(0,0,0,0.6),0_16px_60px_rgba(0,0,0,0.3)] overflow-hidden">
          {/* Evidence tape top */}
          <div className="h-0.5 evidence-tape" />

          {/* Case Header Strip */}
          <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-[rgba(168,144,112,0.06)]">
            <div className="flex items-center justify-between mb-2">
              <span className="case-number">{caseId}</span>
              <span className="case-number">{formatDate(topic.createdAt)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <Badge
                className="text-[9px]"
                style={{
                  backgroundColor: `${topic.category.color}12`,
                  borderColor: `${topic.category.color}25`,
                  color: topic.category.color,
                }}
              >
                {topic.category.name}
              </Badge>
              <Badge variant={isConcluded ? "verdict" : "status"} status={topic.status} verdict={topic.verdict}>
                {isConcluded ? topic.verdict : "UNDER INVESTIGATION"}
              </Badge>
              {topic.durationDays && (
                <span className="case-number">
                  <span className="status-dot active mr-1" />
                  {topic.durationDays}-DAY INVESTIGATION
                </span>
              )}
            </div>
          </div>

          {/* Case Title Block */}
          <div className="px-5 sm:px-6 py-5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-zinc-200 mb-2 leading-tight">
              {topic.title}
            </h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              {topic.description}
            </p>
          </div>

          {/* Timer Section */}
          <div className="mx-5 sm:mx-6 mb-5">
            <div className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
                <h3 className="case-number text-zinc-500">
                  {isConcluded ? "CASE CLOSED" : "TIME REMAINING"}
                </h3>
              </div>
              <CountdownFull endsAt={topic.endsAt} />
            </div>
          </div>

          {/* Verdict Banner */}
          {isConcluded && topic.verdict && (
            <div className="mx-5 sm:mx-6 mb-5">
              <VerdictBanner verdict={topic.verdict} summary={topic.summary} />
            </div>
          )}

          {/* Evidence Section */}
          {topic.evidence && (
            <div className="mx-5 sm:mx-6 mb-5">
              <div className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
                  <h3 className="case-number text-zinc-500">EVIDENCE & BACKGROUND</h3>
                </div>
                <div className="text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                  {topic.evidence}
                </div>
              </div>
            </div>
          )}

          {/* Witness Statements */}
          <div className="mx-5 sm:mx-6 mb-5">
            <div className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] p-4">
              <CommentSection
                topicId={topic.id}
                initialComments={topic.comments || []}
                isConcluded={isConcluded}
              />
            </div>
          </div>

          {/* Case Footer */}
          <div className="px-5 sm:px-6 py-3 border-t border-[rgba(168,144,112,0.06)] evidence-tape">
            <div className="case-meta justify-center">
              <Stamp className="w-3 h-3" />
              <span>GATEWAY:NOIR</span>
              <span>•</span>
              <span>{caseId}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
