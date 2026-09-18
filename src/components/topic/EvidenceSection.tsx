"use client";

import { FileText, Image, Link2, ExternalLink, Shield } from "lucide-react";

interface EvidenceSectionProps {
  topicId: string;
  topicEvidence: string | null;
}

export function EvidenceSection({ topicEvidence }: EvidenceSectionProps) {
  if (!topicEvidence || topicEvidence.trim() === "") {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2 typewriter-label">
        <Shield className="w-4 h-4 text-amber-500" />
        EVIDENCE ARCHIVE
      </h2>
      <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded-xl p-5">
        <div className="prose prose-invert max-w-none text-sm text-zinc-300">
          {topicEvidence.split("\n").map((paragraph, i) => (
            <p key={i} className="mb-3 leading-relaxed">{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}