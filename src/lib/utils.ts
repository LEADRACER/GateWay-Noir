import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function timeRemaining(endsAt: string | Date): { days: number; hours: number; minutes: number; total: number } {
  const total = new Date(endsAt).getTime() - Date.now();
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, total: 0 };
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes, total };
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/15";
    case "CONCLUDED": return "bg-amber-500/10 text-amber-400 border-amber-500/15";
    default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/15";
  }
}

export function getVerdictColor(verdict: string | null): string {
  switch (verdict) {
    case "SOLVED": return "bg-red-500/10 text-red-400 border-red-500/15";
    case "CONFIRMED": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/15";
    case "UNSOLVED": return "bg-amber-500/10 text-amber-400 border-amber-500/15";
    default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/15";
  }
}

export function generateColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}
