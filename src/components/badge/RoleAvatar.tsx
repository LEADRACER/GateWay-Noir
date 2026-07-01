"use client";

import { Fingerprint, ShieldCheck, Star } from "lucide-react";

const ROLE_AVATARS: Record<string, { icon: typeof Fingerprint; color: string; bg: string; border: string }> = {
  DETECTIVE: {
    icon: Fingerprint,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  AGENT: {
    icon: Star,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  BUREAU: {
    icon: ShieldCheck,
    color: "text-amber-300",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
};

const DEFAULT_AVATAR = {
  icon: Fingerprint,
  color: "text-zinc-400",
  bg: "bg-zinc-500/10",
  border: "border-zinc-500/20",
};

interface RoleAvatarProps {
  role?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: { container: "w-7 h-7", icon: "w-3.5 h-3.5" },
  md: { container: "w-9 h-9", icon: "w-4 h-4" },
  lg: { container: "w-12 h-12", icon: "w-5 h-5" },
};

export function RoleAvatar({ role, size = "sm", className = "" }: RoleAvatarProps) {
  const cfg = ROLE_AVATARS[role ?? ""] || DEFAULT_AVATAR;
  const Icon = cfg.icon;
  const s = SIZE_MAP[size];

  return (
    <div
      className={`inline-flex items-center justify-center ${s.container} ${cfg.bg} border ${cfg.border} ${className}`}
    >
      <Icon className={`${s.icon} ${cfg.color}`} />
    </div>
  );
}
