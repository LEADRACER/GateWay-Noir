"use client";

import { motion } from "framer-motion";
import { Users, Fingerprint, MessageSquare, User } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PeopleSectionProps {
  comments: any[];
}

export function PeopleSection({ comments }: PeopleSectionProps) {
  // Extract unique commenters by displayName (or anonymousId for guests)
  const commentersMap = new Map<string, { 
    displayName: string; 
    actualName: string | null;
    anonymousId: string;
    count: number;
    lastCommentAt: string;
    role: string;
  }>();

  comments.forEach(comment => {
    const key = comment.displayName || comment.anonymousId;
    const existing = commentersMap.get(key);
    const role = comment.displayName?.split("-")[0] || "DET";
    const actualName = comment.userDisplayName || null;
    
    if (!existing || new Date(comment.createdAt) > new Date(existing.lastCommentAt)) {
      commentersMap.set(key, {
        displayName: comment.displayName || `DET-${comment.anonymousId.slice(0,4).toUpperCase()}`,
        actualName,
        anonymousId: comment.anonymousId,
        count: (existing?.count || 0) + 1,
        lastCommentAt: comment.createdAt,
        role
      });
    } else if (existing) {
      existing.count += 1;
      if (actualName && !existing.actualName) {
        existing.actualName = actualName;
      }
    }
  });

  const people = Array.from(commentersMap.values())
    .sort((a, b) => b.count - a.count || new Date(b.lastCommentAt).getTime() - new Date(a.lastCommentAt).getTime());

  if (people.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      <div className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-[#d97706] opacity-50" />
          <h3 className="text-xs font-semibold text-zinc-400 typewriter-label tracking-wide">
            PEOPLE OF INTEREST
          </h3>
          <span className="case-number text-zinc-700 ml-auto">
            {people.length} {people.length === 1 ? "PERSON" : "PEOPLE"}
          </span>
        </div>

        <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
          {people.map((person, i) => {
            const isBRU = person.role === "BRU";
            const isAGT = person.role === "AGT";
            const hasBadge = person.displayName.includes("-");
            
            return (
              <motion.div
                key={person.anonymousId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 bg-[#111113] border border-[rgba(168,144,112,0.04)] hover:border-[rgba(168,144,112,0.1)] transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-6 h-6 flex items-center justify-center text-[7px] font-bold flex-shrink-0 ${
                    hasBadge 
                      ? isBRU 
                        ? "bg-amber-500/15 text-amber-300" 
                        : isAGT 
                          ? "bg-amber-600/15 text-amber-500" 
                          : "bg-zinc-500/15 text-zinc-400"
                      : "bg-zinc-700 text-zinc-500"
                  }`}>
                    {hasBadge ? (
                      <Fingerprint className={`w-3 h-3 ${
                        isBRU ? "text-amber-300" : isAGT ? "text-amber-500" : "text-zinc-400"
                      }`} />
                    ) : (
                      <MessageSquare className="w-3 h-3" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-mono font-bold ${
                      hasBadge ? (isBRU ? "text-amber-300" : isAGT ? "text-amber-500" : "text-zinc-400") : "text-zinc-500"
                    }`}>
                      {person.displayName}
                    </span>
                    {person.actualName && person.actualName !== person.displayName && (
                      <span className="text-[9px] text-zinc-500 font-normal">
                        {person.actualName}
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] text-zinc-600 typewriter-label ml-auto">
                    {person.count} stmt{person.count !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[8px] text-zinc-600">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-2.5 h-2.5" />
                    Last: {formatDate(person.lastCommentAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-2.5 h-2.5" />
                    {person.actualName ? "Known" : "Anonymous"}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}