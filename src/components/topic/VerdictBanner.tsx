"use client";

import { motion } from "framer-motion";
import { Shield, ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";

interface VerdictBannerProps {
  verdict: string | null;
  summary: string | null;
}

export function VerdictBanner({ verdict, summary }: VerdictBannerProps) {
  if (!verdict) return null;

  const config: Record<string, { icon: typeof Shield; color: string; bg: string; border: string; title: string }> = {
    BUSTED: { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", title: "Myth Busted" },
    TRUE: { icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", title: "Confirmed True" },
    INCONCLUSIVE: { icon: Shield, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", title: "Inconclusive" },
  };

  const c = config[verdict] || config.INCONCLUSIVE;
  const Icon = c.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl ${c.bg} border ${c.border} p-6 md:p-8 mb-8`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${c.bg} ${c.border} border`}>
          <Icon className={`w-7 h-7 ${c.color}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className={`w-4 h-4 ${c.color}`} />
            <h2 className={`text-lg font-bold ${c.color}`}>{c.title}</h2>
          </div>
          {summary && (
            <p className="text-zinc-300 leading-relaxed text-sm md:text-base">{summary}</p>
          )}
          <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
            <Shield className="w-3 h-3" />
            <span>Official verdict — this case is closed for new comments</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
