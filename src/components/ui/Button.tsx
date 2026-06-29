interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed typewriter-label tracking-wide border-none";
  const variants: Record<string, string> = {
    primary: "bg-[#d97706] text-black hover:bg-[#b45309] shadow-[0_2px_0_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.3)] active:shadow-[0_1px_0_rgba(0,0,0,0.3)] active:translate-y-[1px]",
    secondary: "bg-[#1c1c1f] text-zinc-300 hover:bg-[#252528] border border-[rgba(168,144,112,0.12)] shadow-[0_1px_0_rgba(0,0,0,0.2)]",
    outline: "bg-transparent text-zinc-400 hover:text-zinc-200 border border-[rgba(168,144,112,0.15)] hover:border-[rgba(168,144,112,0.3)]",
    ghost: "bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-[#111113]",
    danger: "bg-[#dc2626] text-white hover:bg-[#b91c1c] shadow-[0_2px_0_rgba(0,0,0,0.3)]",
  };
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1 text-[10px] gap-1",
    md: "px-3.5 py-1.5 text-xs gap-1.5",
    lg: "px-5 py-2.5 text-sm gap-2",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
