"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  endsAt: string | Date;
  className?: string;
}

export function CountdownTimer({ endsAt, className = "" }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(calcRemaining(endsAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(calcRemaining(endsAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (remaining.total <= 0) {
    return <span className="text-[#dc2626] font-medium typewriter-label text-xs">TIME EXPIRED</span>;
  }

  const parts: { value: number; label: string }[] = [];
  if (remaining.days > 0) parts.push({ value: remaining.days, label: remaining.days === 1 ? "day" : "days" });
  if (remaining.hours > 0 || parts.length > 0) parts.push({ value: remaining.hours, label: "h" });
  parts.push({ value: remaining.minutes, label: "m" });

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {parts.map((p, i) => (
        <span key={p.label}>
          <span className="text-zinc-300 font-medium">{p.value}</span>
          <span className="text-zinc-600 ml-0.5">{p.label}</span>
          {i < parts.length - 1 && <span className="mx-0.5 text-zinc-700">:</span>}
        </span>
      ))}
    </span>
  );
}

function calcRemaining(endsAt: string | Date) {
  const total = new Date(endsAt).getTime() - Date.now();
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((total % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((total % (1000 * 60)) / 1000),
    total,
  };
}

export function CountdownFull({ endsAt }: { endsAt: string | Date }) {
  const [remaining, setRemaining] = useState(calcRemaining(endsAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(calcRemaining(endsAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (remaining.total <= 0) {
    return (
      <div className="text-center py-3 px-4 bg-[rgba(220,38,38,0.06)] border border-[rgba(220,38,38,0.12)]">
        <p className="text-[#dc2626] font-semibold text-sm typewriter-label">⏰ TIME EXPIRED</p>
        <p className="text-[#dc2626]/40 text-[10px] mt-0.5 typewriter-label">CASE CLOSED FOR DELIBERATION</p>
      </div>
    );
  }

  const segments = [
    { value: remaining.days, label: "DAYS" },
    { value: remaining.hours, label: "HRS" },
    { value: remaining.minutes, label: "MIN" },
    { value: remaining.seconds, label: "SEC" },
  ];

  return (
    <div className="flex items-center gap-2">
      {segments.map((seg, i) => (
        <div key={seg.label} className="flex items-center">
          <div className="text-center">
            <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-zinc-300 tabular-nums bg-[#08080a] border border-[rgba(168,144,112,0.08)] px-2 py-1 min-w-[40px]">
              {String(seg.value).padStart(2, "0")}
            </div>
            <span className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5 block typewriter-label">{seg.label}</span>
          </div>
          {i < segments.length - 1 && (
            <span className="text-zinc-700 text-sm font-bold mx-1 mt-[-10px]">:</span>
          )}
        </div>
      ))}
    </div>
  );
}
