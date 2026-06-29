"use client";

import { useState, useEffect } from "react";
import { X, Fingerprint, AlertCircle, CheckCircle, Smartphone, Download } from "lucide-react";
import { useBadge } from "./BadgeProvider";
import { registerPhone } from "@/lib/badge-client";
import { downloadBadgeSVG } from "@/lib/badge-image";
import { getBadgeCodeFromCookie, extractSuffix } from "@/lib/badge-cookie";

export function BadgeModal() {
  const { badge, isNew, showBadgeModal, setShowBadgeModal, claimCode, updateBadge } = useBadge();
  const [code, setCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Pre-fill from cookie when modal opens
  useEffect(() => {
    if (showBadgeModal) {
      const savedBadge = getBadgeCodeFromCookie();
      if (savedBadge) setCode(savedBadge);
    }
  }, [showBadgeModal]);

  // Phone registration state
  const [phone, setPhone] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [phoneSuccess, setPhoneSuccess] = useState(false);
  const [showPhoneForm, setShowPhoneForm] = useState(false);

  if (!showBadgeModal) return null;

  const handleClaim = async () => {
    if (code.trim().length < 5) return;
    setClaiming(true);
    setClaimError("");
    setClaimSuccess(false);

    const result = await claimCode(code.trim().toUpperCase());
    if (result.success) {
      setClaimSuccess(true);
      setTimeout(() => {
        setShowBadgeModal(false);
        setCode("");
        setClaimSuccess(false);
      }, 2000);
    } else {
      // Check for preclaim (needsPasscode) error
      if ((result as any).needsPasscode) {
        setClaimError(
          "This badge is passcode-protected. Verify with your passcode from the original device."
        );
      } else {
        setClaimError(result.error || "Invalid badge code");
      }
    }
    setClaiming(false);
  };

  const handlePhoneRegister = async () => {
    if (!badge || phone.trim().length < 7) return;
    setPhoneSaving(true);
    setPhoneError("");
    setPhoneSuccess(false);

    const result = await registerPhone(badge.badgeCode, phone.trim());
    if (result.success) {
      setPhoneSuccess(true);
      updateBadge({ phone: result.phone });
      setShowPhoneForm(false);
    } else {
      setPhoneError(result.error || "Failed to register phone");
    }
    setPhoneSaving(false);
  };

  const handleSaveBadge = () => {
    if (!badge) return;
    downloadBadgeSVG({
      badgeCode: badge.badgeCode,
      displayName: badge.displayName,
      role: badge.role as 'DETECTIVE' | 'AGENT' | 'BUREAU',
      stats: { votes: badge.voteCount, comments: badge.commentCount }
    });
  };

  const maskPhone = (p: string) => {
    if (p.length <= 4) return p;
    return p.slice(0, 3) + "****" + p.slice(-2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm pt-16 sm:pt-0 overflow-y-auto">
      <div className="bg-[#0d0d0f] border border-[rgba(168,144,112,0.12)] w-full max-w-sm mx-4 mt-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(168,144,112,0.06)] bg-[#0a0a0c]">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-3.5 h-3.5 text-[#d97706]" />
            <span className="text-[10px] font-medium text-zinc-400 typewriter-label tracking-widest">
              BUREAU BADGE
            </span>
          </div>
          <button
            onClick={() => setShowBadgeModal(false)}
            className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5">
          {claimSuccess ? (
            <div className="text-center py-4">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-[11px] text-green-400/80 typewriter-label">BADGE CLAIMED</p>
              <p className="text-[9px] text-zinc-500 mt-1">Welcome to the bureau.</p>
            </div>
          ) : badge ? (
            /* Already have a badge — show its info */
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#d97706]/10 border border-[#d97706]/20 mb-3">
                <Fingerprint className="w-3 h-3 text-[#d97706]" />
                <span className="text-[13px] font-mono font-bold text-[#d97706] tracking-wider">
                  {badge.badgeCode}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mb-1">
                {badge.displayName}
              </p>
              <p className="text-[8px] text-zinc-600 typewriter-label mb-4">
                {badge.role} • {badge.voteCount ?? 0} VOTES • {badge.commentCount ?? 0} COMMENTS
              </p>
              <p className="text-[9px] text-zinc-600 leading-relaxed">
                Use this badge code to access your account on any device.
              </p>

              {/* Hint to visit HQ for elevation / profile */}
              {badge.role === "DETECTIVE" && (
                <p className="text-[9px] text-[#d97706]/60 mt-2 typewriter-label">
                  Visit HQ to request Field Agent elevation
                </p>
              )}

              {/* Save Badge button */}
              <div className="mt-3">
                <button
                  onClick={handleSaveBadge}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#d97706]/15 border border-[#d97706]/30 text-[10px] text-[#d97706] typewriter-label hover:bg-[#d97706]/25 transition-all"
                >
                  <Download className="w-3 h-3" />
                  SAVE BADGE
                </button>
              </div>

              {/* Save prompt for new users */}
              {isNew && (
                <p className="mt-2 text-[9px] text-[#d97706]/70 typewriter-label text-center">
                  Save your badge! You'll need this code to access your account on another device.
                </p>
              )}

              {/* Phone registration section */}
              {badge.phone ? (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] text-green-500/70">
                  <Smartphone className="w-2.5 h-2.5" />
                  <span className="typewriter-label">{maskPhone(badge.phone)}</span>
                </div>
              ) : !showPhoneForm ? (
                <button
                  onClick={() => setShowPhoneForm(true)}
                  className="mt-3 flex items-center gap-1.5 mx-auto text-[9px] text-zinc-600 hover:text-zinc-400 typewriter-label transition-colors"
                >
                  <Smartphone className="w-2.5 h-2.5" />
                  REGISTER PHONE FOR BADGE RECOVERY
                </button>
              ) : (
                <div className="mt-3 pt-3 border-t border-[rgba(168,144,112,0.06)]">
                  <p className="text-[9px] text-zinc-600 mb-2 typewriter-label text-left">
                    ENTER YOUR MOBILE NUMBER
                  </p>
                  {badge.handler && (
                    <p className="text-[8px] text-[#d97706]/60 mb-2 typewriter-label text-left">
                      REGISTERING UNDER: {badge.handler}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+123****7890"
                      className="flex-1 bg-black/40 border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 outline-none focus:border-[#d97706]/40 transition-colors placeholder:text-zinc-700"
                      onKeyDown={(e) => e.key === "Enter" && handlePhoneRegister()}
                    />
                    <button
                      onClick={handlePhoneRegister}
                      disabled={phoneSaving || phone.trim().length < 7}
                      className="px-3 py-1.5 bg-[#d97706]/20 border border-[#d97706]/30 text-[10px] text-[#d97706] typewriter-label hover:bg-[#d97706]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {phoneSaving ? "..." : "SAVE"}
                    </button>
                  </div>
                  {phoneError && (
                    <p className="flex items-center gap-1 text-[9px] text-red-400/80 mt-1.5 text-left">
                      <AlertCircle className="w-2.5 h-2.5" />
                      {phoneError}
                    </p>
                  )}
                  {phoneSuccess && (
                    <p className="flex items-center gap-1 text-[9px] text-green-400/80 mt-1.5 text-left">
                      <CheckCircle className="w-2.5 h-2.5" />
                      Phone registered for recovery
                    </p>
                  )}
                </div>
              )}

              {/* Claim another badge */}
              <div className="mt-4 pt-4 border-t border-[rgba(168,144,112,0.06)]">
                <p className="text-[9px] text-zinc-600 mb-2 typewriter-label">
                  ALREADY HAVE A BADGE? ENTER IT HERE
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="DET-XXXX"
                    className="flex-1 bg-black/40 border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 outline-none focus:border-[#d97706]/40 transition-colors placeholder:text-zinc-700"
                    onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                  />
                  <button
                    onClick={handleClaim}
                    disabled={claiming || code.trim().length < 5}
                    className="px-3 py-1.5 bg-[#d97706]/20 border border-[#d97706]/30 text-[10px] text-[#d97706] typewriter-label hover:bg-[#d97706]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {claiming ? "..." : "CLAIM"}
                  </button>
                </div>
                {claimError && (
                  <p className="flex items-center gap-1 text-[9px] text-red-400/80 mt-1.5">
                    <AlertCircle className="w-2.5 h-2.5" />
                    {claimError}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* No badge — prompt to claim one */
            <div>
              <p className="text-[11px] text-zinc-400 text-center mb-4">
                Enter your bureau badge code to link this device.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="DET-XXXX"
                  className="flex-1 bg-black/40 border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 outline-none focus:border-[#d97706]/40 transition-colors placeholder:text-zinc-700"
                  onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                />
                <button
                  onClick={handleClaim}
                  disabled={claiming || code.trim().length < 5}
                  className="px-3 py-1.5 bg-[#d97706]/20 border border-[#d97706]/30 text-[10px] text-[#d97706] typewriter-label hover:bg-[#d97706]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {claiming ? "..." : "CLAIM"}
                </button>
              </div>
              {claimError && (
                <p className="flex items-center gap-1 text-[9px] text-red-400/80 mt-1.5">
                  <AlertCircle className="w-2.5 h-2.5" />
                  {claimError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
