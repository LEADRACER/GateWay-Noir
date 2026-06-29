import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[#111113] border border-[rgba(168,144,112,0.08)] shadow-[0_1px_0_rgba(0,0,0,0.2),0_2px_8px_rgba(0,0,0,0.4)]",
        hover && "transition-shadow duration-200 hover:border-[rgba(168,144,112,0.18)] hover:shadow-[0_2px_0_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.5)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-4 pb-0", className)}>{children}</div>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-4 pt-0 flex items-center gap-2", className)}>{children}</div>;
}
