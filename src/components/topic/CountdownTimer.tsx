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
    return <span className="text-red-400 font-medium">Time's up!</span>;
  }

  const parts: { value: number; label: string }[] = [];
  if (remaining.days > 0) parts.push({ value: remaining.days, label: remaining.days === 1 ? "day" : "days" });
  if (remaining.hours > 0 || parts.length > 0) parts.push({ value: remaining.hours, label: "h" });
  parts.push({ value: remaining.minutes, label: "m" });

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {parts.map((p, i) => (
        <span key={p.label}>
          <span className="text-white font-medium">{p.value}</span>
          <span className="text-zinc-500 ml-0.5">{p.label}</span>
          {i < parts.length - 1 && <span className="mx-0.5 text-zinc-600">:</span>}
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

// Full display version for the topic detail page
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
      <div className="text-center py-4 px-6 rounded-2xl bg-red-500/10 border border-red-500/20">
        <p className="text-red-400 font-semibold text-lg">⏰ Time has expired</p>
        <p className="text-red-400/60 text-sm mt-1">This case is now closed for deliberation.</p>
      </div>
    );
  }

  const segments = [
    { value: remaining.days, label: "Days" },
    { value: remaining.hours, label: "Hours" },
    { value: remaining.minutes, label: "Min" },
    { value: remaining.seconds, label: "Sec" },
  ];

  return (
    <div className="flex items-center gap-3">
      {segments.map((seg, i) => (
        <div key={seg.label} className="flex items-center">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold font-mono text-white tabular-nums bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 min-w-[60px]">
              {String(seg.value).padStart(2, "0")}
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1 block">{seg.label}</span>
          </div>
          {i < segments.length - 1 && (
            <span className="text-zinc-700 text-xl font-bold mx-1 mt-[-16px]">:</span>
          )}
        </div>
      ))}
    </div>
  );
}
