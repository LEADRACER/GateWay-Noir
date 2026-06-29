"use client";

import { useState } from "react";
import { X, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Fingerprint } from "lucide-react";
import { useBadge } from "./BadgeProvider";

export function PasswordModal() {
  const {
    badge,
    showPasswordModal,
    setShowPasswordModal,
    passwordVerified,
    handleSetPassword,
    handleVerifyPassword,
  } = useBadge();

  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  if (!showPasswordModal || !badge) return null;
  if (passwordVerified) return null;

  const needsSetup = !badge.hasPassword;

  const handleSubmit = async () => {
    setError("");

    if (!/^\d{8}$/.test(password)) {
      setError("Passcode must be exactly 8 digits (0-9)");
      return;
    }

    setSubmitting(true);
    const result = needsSetup
      ? await handleSetPassword(password)
      : await handleVerifyPassword(password);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || "Failed");
    } else {
      setPassword("");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center bg-black/70 backdrop-blur-sm pt-16 sm:pt-0 overflow-y-auto">
      <div className="bg-[#0d0d0f] border border-[rgba(168,144,112,0.12)] w-full max-w-sm mx-4 mt-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(168,144,112,0.06)] bg-[#0a0a0c]">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[#d97706]" />
            <span className="text-[10px] font-medium text-zinc-400 typewriter-label tracking-widest">
              {needsSetup ? "SECURE YOUR BADGE" : "VERIFY IDENTITY"}
            </span>
          </div>
          {!needsSetup && (
            <button
              onClick={() => setShowPasswordModal(false)}
              className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="p-5">
          <div className="text-center mb-4">
            <Fingerprint className="w-8 h-8 text-[#d97706] mx-auto mb-2" />
            <p className="text-[11px] text-zinc-400 font-mono font-bold tracking-wider">
              {badge.badgeCode}
            </p>
            <p className="text-[9px] text-zinc-600 typewriter-label mt-1">
              {badge.role} • {badge.displayName}
            </p>
          </div>

          {needsSetup ? (
            <p className="text-[9px] text-zinc-500 mb-3 typewriter-label text-left">
              SET YOUR 8-DIGIT PASSCODE TO SECURE THIS BADGE.
            </p>
          ) : (
            <p className="text-[9px] text-zinc-500 mb-3 typewriter-label text-left">
              ENTER YOUR 8-DIGIT PASSCODE TO ACCESS ELEVATED FEATURES.
            </p>
          )}

          {/* Passcode input */}
          <div className="mb-3">
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="8-digit passcode"
                inputMode="numeric"
                pattern="[0-9]{8}"
                autoComplete="off"
                autoFocus
                className="w-full bg-black/40 border border-[rgba(168,144,112,0.1)] px-2.5 py-2 pr-8 text-[11px] font-mono text-zinc-300 text-center tracking-[0.3em] outline-none focus:border-[#d97706]/40 transition-colors placeholder:text-zinc-700"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
              >
                {showPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="flex items-center gap-1 text-[9px] text-red-400/80 mb-2 text-left">
              <AlertCircle className="w-2.5 h-2.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || password.length !== 8}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#d97706]/15 border border-[#d97706]/30 text-[10px] text-[#d97706] typewriter-label hover:bg-[#d97706]/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? (
              "..."
            ) : needsSetup ? (
              <>
                <CheckCircle className="w-3 h-3" />
                SET PASSCODE & CONTINUE
              </>
            ) : (
              <>
                <Lock className="w-3 h-3" />
                VERIFY & CONTINUE
              </>
            )}
          </button>

          {!needsSetup && (
            <p className="mt-2 text-[8px] text-zinc-700 typewriter-label text-center">
              This device will stay verified until you clear your browser data.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
