import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  className?: string;
}

export function StatsCard({ title, value, icon, color = "amber", className }: StatsCardProps) {
  const colorMap: Record<string, { text: string; border: string }> = {
    amber: { text: "text-[#d97706]", border: "border-[rgba(217,119,6,0.12)]" },
    green: { text: "text-[#16a34a]", border: "border-[rgba(22,163,74,0.12)]" },
    blue: { text: "text-[#2563eb]", border: "border-[rgba(37,99,235,0.12)]" },
    red: { text: "text-[#dc2626]", border: "border-[rgba(220,38,38,0.12)]" },
  };

  const c = colorMap[color] || colorMap.amber;

  return (
    <div className={cn("bg-[#111113] border border-[rgba(168,144,112,0.08)] p-3", className)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="case-number text-zinc-600">{title}</span>
        <div className={cn("p-1 border", c.border)}>
          <span className={cn("w-3 h-3", c.text)}>{icon}</span>
        </div>
      </div>
      <p className={cn("text-xl font-bold font-mono", c.text)}>{value}</p>
    </div>
  );
}
