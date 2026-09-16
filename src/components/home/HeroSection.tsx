"use client";

import { useState, useRef } from "react";
import { Scale, ChevronDown } from "lucide-react";
import { BureauHallDropdown } from "@/components/bureau/BureauHallDropdown";

export function HeroSection() {
  const [showHalls, setShowHalls] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <section className="border-b border-[rgba(168,144,112,0.08)] bg-[#0a0a0c] relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
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
            <button
              ref={triggerRef}
              onClick={() => setShowHalls(!showHalls)}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-[#d97706] transition-colors pr-2"
              aria-expanded={showHalls}
              aria-haspopup="true"
            >
              <span>BUREAU NO. 001</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showHalls ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>
      <BureauHallDropdown
        isOpen={showHalls}
        onClose={() => setShowHalls(false)}
        triggerRef={triggerRef}
      />
    </section>
  );
}
