"use client";

import { motion } from "framer-motion";
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
    <div className="flex flex-wrap gap-2">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onSelect(null)}
        className={cn(
          "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
          !selected
            ? "bg-violet-600/20 text-violet-300 border-violet-500/30 shadow-sm shadow-violet-500/10"
            : "bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300"
        )}
      >
        All
      </motion.button>
      {categories.map((cat) => (
        <motion.button
          key={cat.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(selected === cat.slug ? null : cat.slug)}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
            selected === cat.slug
              ? "text-white border-current shadow-sm"
              : "bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300"
          )}
          style={
            selected === cat.slug
              ? { backgroundColor: `${cat.color}20`, borderColor: `${cat.color}50`, color: cat.color }
              : undefined
          }
        >
          {cat.name}
        </motion.button>
      ))}
    </div>
  );
}
