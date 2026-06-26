import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  className?: string;
}

export function StatsCard({ title, value, icon, color = "violet", className }: StatsCardProps) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    red: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  };

  const c = colorMap[color] || colorMap.violet;

  return (
    <div className={cn("rounded-2xl border bg-zinc-900/50 backdrop-blur-sm p-5", c.border, className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</span>
        <div className={cn("p-2 rounded-lg border", c.bg, c.border)}>
          <span className={cn("w-4 h-4", c.text)}>{icon}</span>
        </div>
      </div>
      <p className={cn("text-2xl font-bold", c.text)}>{value}</p>
    </div>
  );
}
