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
    default: "bg-zinc-800 text-zinc-300 border-zinc-700",
    status: status ? getStatusColor(status) : "bg-zinc-800 text-zinc-300",
    verdict: verdict ? getVerdictColor(verdict) : "bg-zinc-800 text-zinc-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variantStyles[variant],
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}
