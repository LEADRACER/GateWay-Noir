"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, FileText, Link, ExternalLink, Eye, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface EvidenceItem {
  url: string;
  source: "topic" | "comment";
  commentId?: string;
  author?: string;
  commentContent?: string;
  createdAt?: string;
}

interface EvidenceSectionProps {
  topicId: string;
  topicEvidence: string | null;
}

export function EvidenceSection({ topicId, topicEvidence }: EvidenceSectionProps) {
  const [commentEvidence, setCommentEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchEvidence() {
      try {
        const res = await fetch(`/api/topics/${topicId}/evidence`);
        if (res.ok) {
          const data = await res.json();
          setCommentEvidence(data.commentEvidence || []);
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchEvidence();
  }, [topicId]);

  const hasEvidence = Boolean(topicEvidence) || commentEvidence.length > 0 || loading;

  if (!hasEvidence) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mx-0 sm:mx-5 lg:mx-6 mb-4 sm:mb-5"
    >
      <div className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-[#111113] transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#d97706] opacity-50" />
            <h3 className="text-xs font-semibold text-zinc-400 typewriter-label tracking-wide">
              EVIDENCE ARCHIVE
            </h3>
            <span className="case-number text-zinc-700">
              {commentEvidence.length + (topicEvidence ? 1 : 0)} ITEM{commentEvidence.length + (topicEvidence ? 1 : 0) !== 1 ? "S" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="w-3.5 h-3.5 text-zinc-600 animate-spin" />}
            <Eye className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        </button>

        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: expanded ? 1 : 0, height: expanded ? "auto" : 0 }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-4 border-t border-[rgba(168,144,112,0.06)]">
            {/* Topic Evidence (Case File) */}
            {topicEvidence && (
              <div className="mb-4 p-3 bg-[#111113] border border-[rgba(168,144,112,0.06)]">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-3 h-3 text-amber-400/60" />
                  <span className="text-[9px] text-amber-400/80 typewriter-label">CASE FILE EVIDENCE</span>
                  <span className="ml-auto text-[8px] text-zinc-600 typewriter-label">CREATED AT LAUNCH</span>
                </div>
                <div className="text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto max-h-60">
                  {topicEvidence}
                </div>
              </div>
            )}

            {/* Comment Evidence */}
            {commentEvidence.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Link className="w-3 h-3 text-blue-400/60" />
                  <span className="text-[9px] text-blue-400/80 typewriter-label">TESTIMONY EVIDENCE</span>
                  <span className="ml-auto text-[8px] text-zinc-600 typewriter-label">FROM WITNESS STATEMENTS</span>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {commentEvidence.map((item, i) => (
                    <motion.div
                      key={`${item.commentId}-${i}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="p-2 bg-[#111113] border border-[rgba(168,144,112,0.04)] hover:border-[rgba(168,144,112,0.1)] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono text-amber-400">{item.author}</span>
                          <span className="case-number">{formatDate(item.createdAt || "")}</span>
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[8px] text-amber-500/80 hover:text-amber-400 typewriter-label"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          VIEW
                        </a>
                      </div>
                      <div className="text-[9px] text-zinc-600 typewriter-label font-mono break-all bg-[#0a0a0c] p-1.5 rounded">
                        {item.url}
                      </div>
                      {item.commentContent && (
                        <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2 italic">
                          "{item.commentContent}..."
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}