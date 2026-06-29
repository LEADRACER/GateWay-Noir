"use client";

import { useState, useCallback } from "react";
import { Shield, Loader2, Eye, EyeOff, Lock } from "lucide-react";

interface PasswordDialogProps {
  /** Badge code of the BRU authorizing this action */
  adminBadgeCode: string;
  /** Human-readable label for the action (e.g. "Approve Elevation") */
  actionLabel: string;
  /** Called after password verification succeeds. Receives the admin's user id. */
  onVerified: (adminId: string) => Promise<void>;
  /** Called when dialog closes without completing */
  onCancel: () => void;
  /** Whether the dialog is open */
  isOpen: boolean;
}

export function PasswordDialog({
  adminBadgeCode,
  actionLabel,
  onVerified,
  onCancel,
  isOpen,
}: PasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password.trim()) return;

      setVerifying(true);
      setError(null);

      try {
        const res = await fetch("/api/badge/verify-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            badgeCode: adminBadgeCode,
            password: password.trim(),
          }),
        });
        const data = await res.json();

        if (data.success) {
          setPassword("");
          await onVerified(data.user.id);
        } else {
          setError(data.error || "Invalid password");
        }
      } catch {
        setError("Network error — try again");
      } finally {
        setVerifying(false);
      }
    },
    [password, adminBadgeCode, onVerified]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="bg-[#111113] border border-[rgba(168,144,112,0.12)] w-full max-w-xs mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header tape */}
        <div className="h-0.5 evidence-tape" />

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400/60" />
            <h3 className="text-xs font-semibold text-zinc-300 typewriter-label">
              AUTHORIZE ACTION
            </h3>
          </div>

          <p className="text-[10px] text-zinc-500 leading-relaxed">
            {actionLabel} requires BRU password verification.
          </p>

          <div className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] px-2.5 py-2">
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3 text-amber-400/50" />
              <span className="text-xs font-mono text-zinc-400">
                {adminBadgeCode}
              </span>
            </div>
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="8-digit passcode"
              inputMode="numeric"
              pattern="[0-9]{8}"
              autoComplete="off"
              autoFocus
              className="w-full bg-[#0a0a0c] border border-[rgba(168,144,112,0.1)] px-2.5 py-2 pr-8 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[rgba(168,144,112,0.25)] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-3 h-3" />
              ) : (
                <Eye className="w-3 h-3" />
              )}
            </button>
          </div>

          {error && (
            <p className="text-[10px] text-red-400 bg-red-900/20 px-2 py-1.5 border border-red-800/20">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPassword("");
                setError(null);
                onCancel();
              }}
              disabled={verifying}
              className="flex-1 px-2 py-1.5 text-[10px] font-medium text-zinc-500 border border-[rgba(168,144,112,0.08)] hover:bg-[rgba(168,144,112,0.04)] typewriter-label disabled:opacity-40 transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!password.trim() || verifying}
              className="flex-1 px-2 py-1.5 text-[10px] font-medium bg-amber-600 text-black typewriter-label hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-1"
            >
              {verifying ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Lock className="w-3 h-3" />
              )}
              VERIFY & {actionLabel.toUpperCase()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
