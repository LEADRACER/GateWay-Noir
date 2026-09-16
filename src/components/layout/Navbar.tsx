"use client";

import Link from "next/link";
import { useState } from "react";
import { Scale, Menu, X, Sparkles, Fingerprint, ShieldCheck, ListChecks, User, MessageSquare, LayoutDashboard } from "lucide-react";
import { useBadge } from "@/components/badge/BadgeProvider";

// Shared button styles
const navButtonBase = "flex items-center gap-1.5 text-sm px-3 py-1.5 transition-colors typewriter-label";
const navButtonDefault = `${navButtonBase} text-zinc-500 hover:text-zinc-300 border border-transparent hover:border-[rgba(168,144,112,0.08)]`;
const navButtonAccent = (color: string) => `${navButtonBase} ${color} hover:text-[#d97706]`;

// Mobile button styles
const mobileButtonBase = "flex items-center gap-2 px-3 py-2 text-sm transition-colors rounded";
const mobileButtonDefault = `${mobileButtonBase} text-zinc-400 hover:text-zinc-200 bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)]`;
const mobileButtonAccent = (color: string) => `${mobileButtonBase} ${color} hover:text-[#d97706] bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)]`;

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
    <nav className="fixed top-0 left-0 right-0 z-50 border-b-2 border-[rgba(168,144,112,0.15)] bg-[#060608]/95 backdrop-blur-sm shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo only */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 bg-[#d97706]">
              <Scale className="w-4 h-4 text-black" />
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-base font-bold text-zinc-200 tracking-tight">GateWay</span>
              <span className="text-base font-bold text-[#d97706] tracking-tight">:Noir</span>
            </div>
          </Link>

          {/* Desktop Nav - three sections: left (empty), center (badge + HQ), right (discussions, cases, newcase) */}
          <div className="hidden md:flex items-center justify-between w-full gap-4">
            {/* Left spacer - logo is in the justify-between flex */}
            <div className="w-8" />

            {/* Center: Badge + HQ */}
            <div className="flex items-center gap-4 justify-center">
              {/* Badge button */}
              <div className="relative">
                <button
                  onClick={() => setShowBadgeModal(true)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 text-zinc-500 hover:text-[#d97706] border border-transparent hover:border-[#d97706]/20 transition-all typewriter-label"
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  {hasBadge ? badge.badgeCode : "GET BADGE"}
                </button>
                {hasBadge && badge && !badge.phone && (
                  <span
                    title="WhatsApp number not registered — update your profile"
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-400 border border-[#060608]"
                  />
                )}
              </div>

              {/* HQ button */}
              {hq && (
                <Link
                  href={hq.href}
                  className={`${navButtonBase} ${hq.color} hover:text-[#d97706]`}
                >
                  <HQIcon className="w-3.5 h-3.5" />
                  {hq.label}
                </Link>
              )}
            </div>

            {/* Right: Discussions -> Cases -> New Case */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {(role === "DETECTIVE" || role === "AGENT" || role === "BUREAU" || !role) && (
                <Link
                  href="/agent/discussions"
                  className={`${navButtonDefault} hover:text-amber-400`}
                  title="Discussions"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">DISCUSSIONS</span>
                </Link>
              )}
              <Link
                href="/"
                className={`${navButtonDefault}`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CASES</span>
              </Link>
              {(role === "AGENT" || role === "BUREAU") && (
                <Link
                  href="/admin/topics/new"
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#d97706] text-black font-semibold typewriter-label"
                >
                  <Sparkles className="w-3 h-3" />
                  <span className="hidden sm:inline">NEW CASE</span>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu - Enhanced */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[rgba(168,144,112,0.12)] bg-[#08080a] animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-4 space-y-3">
            {/* Badge + HQ section */}
            <div className="space-y-2">
              <div className="relative inline-flex w-full">
                <button onClick={() => { setShowBadgeModal(true); setMobileOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 bg-[#0a0a0c] border border-[rgba(168,144,112,0.08)] rounded">
                  <Fingerprint className="w-4 h-4" />
                  {hasBadge ? badge.badgeCode : "GET BADGE"}
                </button>
                {hasBadge && badge && !badge.phone && (
                  <span
                    title="WhatsApp number not registered — update your profile"
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-400 border border-[#08080a]"
                  />
                )}
              </div>
              {hasBadge && hq && (
                <Link
                  href={hq.href}
                  className={`${mobileButtonAccent(hq.color)}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <HQIcon className="w-4 h-4" />
                  {hq.label}
                </Link>
              )}
            </div>

            <div className="border-t border-[rgba(168,144,112,0.08)] pt-3 space-y-2">
              {/* Discussions */}
              {(role === "DETECTIVE" || role === "AGENT" || role === "BUREAU" || !role) && (
                <Link
                  href="/agent/discussions"
                  className={`${mobileButtonDefault} hover:text-amber-400`}
                  onClick={() => setMobileOpen(false)}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>DISCUSSIONS</span>
                </Link>
              )}

              {/* Cases */}
              <Link
                href="/"
                className={`${mobileButtonDefault}`}
                onClick={() => setMobileOpen(false)}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>CASES</span>
              </Link>

              {/* New Case */}
              {(role === "AGENT" || role === "BUREAU") && (
                <Link
                  href="/admin/topics/new"
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-[#d97706] text-black font-semibold rounded"
                  onClick={() => setMobileOpen(false)}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>NEW CASE</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}