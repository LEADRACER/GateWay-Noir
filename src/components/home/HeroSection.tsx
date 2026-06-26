"use client";

import { motion } from "framer-motion";
import { Scale, Users, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function HeroSection() {
  const features = [
    { icon: Scale, text: "Investigate myths with the community" },
    { icon: Users, text: "Anonymous debate — speak freely" },
    { icon: Clock, text: "Timed verdicts — no endless arguments" },
    { icon: Shield, text: "Evidence-driven conclusions" },
  ];

  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium mb-6">
            <Scale className="w-3.5 h-3.5" />
            Crowd-Sourced Truth
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
            Every myth enters the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Gate</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Post a conspiracy. The community debates it. When the timer runs out, the verdict is delivered. 
            No echo chambers — just evidence, opinions, and a conclusion.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <a href="#topics">
              <Button size="lg" className="text-base">
                <Scale className="w-5 h-5" />
                Browse Active Myths
              </Button>
            </a>
            <a href="/admin/topics/new">
              <Button variant="outline" size="lg" className="text-base">
                Submit a Myth
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/50"
              >
                <f.icon className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <span className="text-xs text-zinc-400">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
