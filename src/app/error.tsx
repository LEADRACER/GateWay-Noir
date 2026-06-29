"use client";

export default function RootError({ reset }: { reset: () => void }) {
  return (
    <div className="max-w-2xl mx-auto py-24 text-center px-4">
      <div className="text-[#d97706] text-2xl mb-4">&#9888;</div>
      <h1 className="text-lg font-bold text-zinc-200 mb-2">A server error occurred</h1>
      <p className="text-sm text-zinc-500 mb-6">The case file could not be processed. Try again.</p>
      <button
        onClick={reset}
        className="text-xs px-4 py-2 bg-[#d97706] text-black font-semibold typewriter-label hover:bg-[#d97706]/90 cursor-pointer"
      >
        RETRY
      </button>
    </div>
  );
}
