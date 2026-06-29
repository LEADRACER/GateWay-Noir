"use client";

import Link from "next/link";

export default function TopicError({ reset }: { reset: () => void }) {
  return (
    <div className="max-w-2xl mx-auto py-24 text-center px-4">
      <p className="text-sm text-zinc-500 mb-4">Failed to load this investigation.</p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={reset}
          className="text-xs px-3 py-1.5 bg-[#d97706] text-black font-semibold cursor-pointer"
        >
          RETRY
        </button>
        <Link
          href="/"
          className="text-xs px-3 py-1.5 border border-zinc-700 text-zinc-400"
        >
          BACK
        </Link>
      </div>
    </div>
  );
}
