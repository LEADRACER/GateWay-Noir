"use client";

import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-1">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "px-2 py-0.5 text-[9px] font-medium border transition-colors typewriter-label",
          !selected
            ? "bg-[#d97706] text-black border-[#d97706]"
            : "bg-[#0d0d0f] text-zinc-600 border-[rgba(168,144,112,0.08)] hover:border-[rgba(168,144,112,0.15)]"
        )}
      >
        ALL
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(selected === cat.slug ? null : cat.slug)}
          className={cn(
            "px-2 py-0.5 text-[9px] font-medium border transition-colors typewriter-label",
            selected === cat.slug
              ? "text-black border-current"
              : "bg-[#0d0d0f] text-zinc-600 border-[rgba(168,144,112,0.08)] hover:border-[rgba(168,144,112,0.15)]"
          )}
          style={
            selected === cat.slug
              ? { backgroundColor: cat.color, borderColor: cat.color }
              : undefined
          }
        >
          {cat.name.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
