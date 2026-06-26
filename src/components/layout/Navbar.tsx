"use client";

import Link from "next/link";
import { useState } from "react";
import { Scale, Menu, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20 transition-transform duration-300 group-hover:scale-105">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">Myth</span>
              <span className="text-lg font-bold text-violet-400">:GateWay</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">Browse</Link>
            <Link href="/admin" className="text-sm text-zinc-400 hover:text-white transition-colors">Admin</Link>
            <Link
              href="/admin/topics/new"
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-violet-500/20"
            >
              <Sparkles className="w-4 h-4" />
              New Myth
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-800/50 bg-zinc-950/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-3">
            <Link href="/" className="block px-4 py-2 text-sm text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-800/50 transition-colors" onClick={() => setMobileOpen(false)}>Browse</Link>
            <Link href="/admin" className="block px-4 py-2 text-sm text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-800/50 transition-colors" onClick={() => setMobileOpen(false)}>Admin Panel</Link>
            <Link href="/admin/topics/new" className="block px-4 py-2 text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl" onClick={() => setMobileOpen(false)}>+ New Myth</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
