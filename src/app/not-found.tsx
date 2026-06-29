import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto py-24 text-center px-4">
      <div className="text-[#d97706] text-2xl mb-4">404</div>
      <h1 className="text-lg font-bold text-zinc-200 mb-2">Case File Not Found</h1>
      <p className="text-sm text-zinc-500 mb-6">This case does not exist or has been classified.</p>
      <Link
        href="/"
        className="text-xs px-4 py-2 bg-[#d97706] text-black font-semibold typewriter-label hover:bg-[#d97706]/90"
      >
        RETURN TO CASE BOARD
      </Link>
    </div>
  );
}
