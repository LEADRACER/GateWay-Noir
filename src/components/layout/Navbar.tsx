"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Scale, Menu, X, Sparkles, Fingerprint, ShieldCheck, ListChecks, User } from "lucide-react";
import { useBadge } from "@/components/badge/BadgeProvider";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { badge, setShowBadgeModal } = useBadge();

  const hasBadge = !!badge;
  const role = badge?.role || null;

  // HQ link config by role
  const getHqConfig = () => {
    if (role === "BUREAU") return { href: "/admin", icon: ShieldCheck, label: "HQ", color: "text-[#d97706]" };
    if (role === "AGENT") return { href: "/admin", icon: ListChecks, label: "HQ", color: "text-zinc-400" };
    if (role === "DETECTIVE") return { href: "/admin", icon: User, label: "HQ", color: "text-zinc-500" };
    return null;
  };

  const hq = getHqConfig();
  const HQIcon = hq?.icon || Scale;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[rgba(168,144,112,0.12)] bg-[#08080a]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-8 h-8 bg-[#d97706]">
              <Scale className="w-4 h-4 text-black" />
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-base font-bold text-zinc-200 tracking-tight">GateWay</span>
              <span className="text-base font-bold text-[#d97706] tracking-tight">:Noir</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-5">
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors typewriter-label">CASES</Link>

            {/* Single HQ button — replaces PROFILE + TASKS + BUREAU HQ */}
            {hasBadge && hq && (
              <Link
                href={hq.href}
                className={`flex items-center gap-1.5 text-sm ${hq.color} hover:text-[#d97706] transition-colors typewriter-label`}
              >
                <HQIcon className="w-3.5 h-3.5" />
                {hq.label}
              </Link>
            )}

            <button
              onClick={() => setShowBadgeModal(true)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 text-zinc-500 hover:text-[#d97706] border border-transparent hover:border-[#d97706]/20 transition-all typewriter-label"
            >
              <Fingerprint className="w-3 h-3" />
              {badge ? badge.badgeCode : "BADGE"}
            </button>
            <Link
              href="/admin/topics/new"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#d97706] text-black font-semibold typewriter-label"
            >
              <Sparkles className="w-3 h-3" />
              NEW CASE
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[rgba(168,144,112,0.12)] bg-[#08080a]">
          <div className="px-4 py-3 space-y-1">
            <Link href="/" className="block px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200" onClick={() => setMobileOpen(false)}>Cases</Link>

            {/* Single HQ button in mobile */}
            {hasBadge && hq && (
              <Link
                href={hq.href}
                className={`flex items-center gap-2 px-3 py-2 text-sm ${hq.color} hover:text-[#d97706]`}
                onClick={() => setMobileOpen(false)}
              >
                <HQIcon className="w-3.5 h-3.5" />
                {hq.label}
              </Link>
            )}

            <button onClick={() => { setShowBadgeModal(true); setMobileOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200">
              <Fingerprint className="w-3.5 h-3.5" />
              {badge ? badge.badgeCode : "MY BADGE"}
            </button>
            <Link href="/admin/topics/new" className="block px-3 py-2 text-sm bg-[#d97706] text-black font-semibold" onClick={() => setMobileOpen(false)}>+ New Case File</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
