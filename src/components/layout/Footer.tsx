import { Scale } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[rgba(168,144,112,0.08)] bg-[#08080a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-zinc-600">
            <Scale className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
            <span className="text-xs typewriter-label">GATEWAY:NOIR — WHERE CASES ENTER, VERDICTS EXIT</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors typewriter-label">CASES</Link>
            <Link href="/admin" className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors typewriter-label">HQ</Link>
            <span className="text-[10px] text-zinc-700 typewriter-label">© {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
