"use client";

import { motion } from "framer-motion";
import { Scale } from "lucide-react";

export function HeroSection() {
  return (
    <section className="border-b border-[rgba(168,144,112,0.08)] bg-[#0a0a0c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 bg-[#d97706]">
              <Scale className="w-3.5 h-3.5 text-black" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-300 tracking-tight">GATEWAY:NOIR</h1>
              <p className="text-[9px] text-zinc-600 typewriter-label">CROWD-SOURCED JUSTICE — CASE FILE ARCHIVE</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[9px] typewriter-label text-zinc-600">
            <span>EST. 2026</span>
            <span className="w-px h-3 bg-[rgba(168,144,112,0.1)]" />
            <span>BUREAU NO. 001</span>
          </div>
        </div>
      </div>
    </section>
  );
}
