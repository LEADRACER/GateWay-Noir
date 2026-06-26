import { Scale } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/50 bg-zinc-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-zinc-500">
            <Scale className="w-4 h-4" />
            <span className="text-sm">Myth:GateWay — where myths enter, verdicts exit</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Browse</Link>
            <Link href="/admin" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Admin</Link>
            <span className="text-xs text-zinc-700">© {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
