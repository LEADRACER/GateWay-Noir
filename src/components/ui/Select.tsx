interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, options, placeholder, className = "", ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-zinc-300">{label}</label>}
      <select
        className={`w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 ${className}`}
        {...props}
      >
        {placeholder && <option value="" className="text-zinc-500">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-zinc-800">{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
