"use client";

import { motion } from "framer-motion";
import { Shield, ShieldCheck, ShieldAlert, Stamp } from "lucide-react";

interface VerdictBannerProps {
  verdict: string | null;
  summary: string | null;
}

export function VerdictBanner({ verdict, summary }: VerdictBannerProps) {
  if (!verdict) return null;

  const config: Record<string, { icon: typeof Shield; color: string; bg: string; border: string; title: string }> = {
    SOLVED: { icon: ShieldAlert, color: "text-[#dc2626]", bg: "bg-[rgba(220,38,38,0.06)]", border: "border-[rgba(220,38,38,0.15)]", title: "CASE SOLVED" },
    CONFIRMED: { icon: ShieldCheck, color: "text-[#16a34a]", bg: "bg-[rgba(22,163,74,0.06)]", border: "border-[rgba(22,163,74,0.15)]", title: "ALLEGATION CONFIRMED" },
    UNSOLVED: { icon: Shield, color: "text-[#d97706]", bg: "bg-[rgba(217,119,6,0.06)]", border: "border-[rgba(217,119,6,0.15)]", title: "CASE UNSOLVED" },
  };

  const c = config[verdict] || config.UNSOLVED;
  const Icon = c.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={`${c.bg} border ${c.border} p-5 grain`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 ${c.bg} border ${c.border}`}>
          <Icon className={`w-5 h-5 ${c.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Stamp className={`w-3 h-3 ${c.color} opacity-50`} />
            <span className="case-number text-zinc-500">OFFICIAL VERDICT</span>
          </div>

          <h2 className={`text-base font-bold ${c.color} mb-2 tracking-wide`}>{c.title}</h2>

          <div className="mb-3">
            <span className={`rubber-stamp ${c.color} text-xs`}>
              {verdict}
            </span>
          </div>

          {summary && (
            <p className="text-zinc-400 leading-relaxed text-sm">{summary}</p>
          )}

          <div className="mt-3 pt-2 border-t border-[rgba(168,144,112,0.06)] flex items-center gap-1.5 text-[10px] text-zinc-600 typewriter-label">
            <Shield className="w-2.5 h-2.5" />
            CASE CLOSED — NO FURTHER TESTIMONY ACCEPTED
          </div>
        </div>
      </div>
    </motion.div>
  );
}
