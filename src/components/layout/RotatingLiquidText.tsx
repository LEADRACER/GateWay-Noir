"use client";

import { useState, useEffect, useCallback } from "react";

const PHRASES = [
  "THE TRUTH IS IN THE DETAILS",
  "EVERY CASE HAS A LEAD",
  "JUSTICE IS A PROCESS, NOT A VERDICT",
  "THE NIGHT ALWAYS HAS WITNESSES",
  "FOLLOW THE EVIDENCE TRAIL",
  "IN THE SHADOWS, THE TRUTH WAITS",
  "NO CASE IS EVER TRULY COLD",
  "ALWAYS QUESTION THE OBVIOUS",
  "THE PAPER TRAIL NEVER LIES",
  "TRUST THE PROCESS, QUESTION THE STORY",
  "DIG DEEPER — THE ANSWER IS BURIED",
  "A CASE IS ONLY AS GOOD AS ITS EVIDENCE",
  "EVERY DETECTIVE NEEDS A LEAP OF FAITH",
  "THE CLOCK IS TICKING — EVERY SECOND COUNTS",
  "THREE LEADS, TWO SUSPECTS, ONE TRUTH",
];

export function RotatingLiquidText() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const nextPhrase = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % PHRASES.length);
      setIsTransitioning(false);
    }, 400);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextPhrase, 5000);
    return () => clearInterval(timer);
  }, [nextPhrase]);

  return (
    <div className="relative overflow-hidden border-t border-[rgba(168,144,112,0.06)] bg-[#0a0a0c]">
      {/* Liquid ripple line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d97706]/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-8">
          {/* Decorative dot */}
          <span className="w-1 h-1 rounded-full bg-[#d97706]/30 mr-3 flex-shrink-0" />

          {/* Text container */}
          <div className="relative h-4 overflow-hidden flex-1 max-w-2xl mx-auto">
            <span
              className={`
                absolute inset-0 flex items-center justify-center
                text-[9px] tracking-[0.3em] font-mono uppercase
                transition-all duration-500 ease-in-out
                ${isTransitioning
                  ? "opacity-0 translate-y-2 blur-sm scale-95"
                  : "opacity-100 translate-y-0 blur-none scale-100"
                }
              `}
              style={{
                color: "rgba(217, 119, 6, 0.45)",
                textShadow: "0 0 12px rgba(217, 119, 6, 0.06)",
              }}
            >
              {PHRASES[currentIndex]}
            </span>
          </div>

          {/* Decorative dot */}
          <span className="w-1 h-1 rounded-full bg-[#d97706]/30 ml-3 flex-shrink-0" />
        </div>

        {/* Bottom ripple */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d97706]/10 to-transparent" />
      </div>
    </div>
  );
}
