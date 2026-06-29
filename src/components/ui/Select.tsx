interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, options, placeholder, className = "", ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-[10px] font-medium typewriter-label text-zinc-500">{label}</label>}
      <select
        className={`w-full px-3 py-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] text-zinc-300 focus:outline-none focus:border-[rgba(217,119,6,0.2)] transition-all text-xs font-mono ${className}`}
        {...props}
      >
        {placeholder && <option value="" className="text-zinc-700">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0a0a0c]">{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
