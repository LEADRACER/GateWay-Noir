interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-[10px] font-medium typewriter-label text-zinc-500">{label}</label>}
      <textarea
        className={`w-full px-3 py-2 bg-[#0a0a0c] border ${error ? "border-[rgba(220,38,38,0.3)]" : "border-[rgba(168,144,112,0.08)]"} text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-[rgba(217,119,6,0.2)] focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] transition-all resize-y min-h-[80px] text-xs font-mono ${className}`}
        {...props}
      />
      {error && <p className="text-[10px] text-[#dc2626]">{error}</p>}
    </div>
  );
}
