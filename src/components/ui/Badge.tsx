import { cn, getStatusColor, getVerdictColor } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "status" | "verdict";
  status?: string;
  verdict?: string | null;
  style?: React.CSSProperties;
}

export function Badge({ children, className, variant = "default", status, verdict, style }: BadgeProps) {
  const variantStyles: Record<string, string> = {
    default: "bg-[#111113] text-zinc-500 border-[rgba(168,144,112,0.1)]",
    status: status ? getStatusColor(status) : "bg-[#111113] text-zinc-500",
    verdict: verdict ? getVerdictColor(verdict) : "bg-[#111113] text-zinc-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium border typewriter-label",
        variantStyles[variant],
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}
