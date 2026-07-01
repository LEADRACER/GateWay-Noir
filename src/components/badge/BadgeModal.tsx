"use client";

import { useState, useEffect } from "react";
import { X, Fingerprint, AlertCircle, CheckCircle, Smartphone, Download, Eye, EyeOff, Sparkles } from "lucide-react";
import { useBadge } from "./BadgeProvider";
import { registerPhone, updateBadgeName } from "@/lib/badge-client";
import { downloadBadgeSVG, getDataURL } from "@/lib/badge-image";
import { extractSuffix } from "@/lib/badge-cookie";
import { BadgeCard } from "./BadgeCard";

const DEFAULT_NAMES = ["Detective", "Agent", "Field Agent", "Bureau Chief", "Anonymous"];

export function BadgeModal() {
  const { badge, isNew, showBadgeModal, setShowBadgeModal, claimCode, generateBadge, updateBadge } = useBadge();
  const [suffix, setSuffix] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [newBadgeCode, setNewBadgeCode] = useState<string | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  const isDefaultName = (name: string) => DEFAULT_NAMES.includes(name);

  useEffect(() => {
    if (showBadgeModal) {
      setSuffix("");
      setPassword("");
      setClaimError("");
      setClaimSuccess(false);
      setNewBadgeCode(null);
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
    if (suffix.trim().length !== 4) {
      setClaimError("Enter the 4-character suffix from your badge");
      return;
    }
    if (password.length !== 8) {
      setClaimError("Passcode must be exactly 8 digits");
      return;
    }
    setClaiming(true);
    setClaimError("");

    const result = await claimCode(suffix.trim().toUpperCase(), password.trim());
    if (result.success) {
      setClaimSuccess(true);
      setTimeout(() => {
        setShowBadgeModal(false);
        setSuffix("");
        setPassword("");
        setClaimSuccess(false);
        setNewBadgeCode(null);
      }, 2000);
    } else {
      setClaimError(result.error || "Invalid badge code or passcode");
    }
    setClaiming(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setClaimError("");
    const result = await generateBadge();
    if (result.success && result.user) {
      setNewBadgeCode(result.user.badgeCode);
    } else {
      setClaimError(result.error || "Failed to generate badge");
    }
    setGenerating(false);
  };

  const handlePhoneRegister = async () => {
    if (!badge || phone.trim().length < 7) return;
    setPhoneSaving(true);
    setPhoneError("");
    setPhoneSuccess(false);

    const result = await registerPhone(badge.badgeCode, phone.trim());
    if (result.success) {
      setPhoneSuccess(true);
      // Use updateBadge if available, else just state
      setShowPhoneForm(false);
    } else {
      setPhoneError(result.error || "Failed to register phone");
    }
    setPhoneSaving(false);
  };

  const handleSaveBadge = () => {
    if (!badge) return;
    // If name is still the default role name, prompt for custom name first
    if (isDefaultName(badge.displayName)) {
      setNameInput(badge.displayName);
      setShowNameInput(true);
      setNameError("");
      return;
    }
    triggerDownload();
  };

  const handleNameSubmit = async () => {
    if (!badge || !nameInput.trim()) return;
    const name = nameInput.trim();
    if (name.length < 1 || name.length > 40) return;
    if (isDefaultName(name)) {
      setNameError("Choose a unique name");
      return;
    }

    setNameSaving(true);
    setNameError("");

    const result = await updateBadgeName(badge.badgeCode, name);
    if (result.success) {
      updateBadge({ displayName: name });
      setShowNameInput(false);
      setNameInput("");
      triggerDownload();
    } else {
      setNameError(result.error || "Failed to update name");
    }
    setNameSaving(false);
  };

  const triggerDownload = () => {
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
          ) : badge && !newBadgeCode ? (
            /* Already claimed — show badge info */
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <BadgeCard badge={badge} />
              </div>
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

              {/* Hint about suffix login */}
              <div className="bg-[rgba(168,144,112,0.04)] border border-[rgba(168,144,112,0.08)] px-3 py-2 mb-4">
                <p className="text-[9px] text-zinc-500 typewriter-label">
                  LOGIN SUFFIX: <span className="text-[#d97706] font-mono font-bold">{extractSuffix(badge.badgeCode)}</span>
                </p>
              </div>

              <p className="text-[9px] text-zinc-600 leading-relaxed">
                Use your 4-character suffix + passcode to access your account on any device.
              </p>

              {/* Hint to visit HQ for elevation / profile */}
              {badge.role === "DETECTIVE" && (
                <p className="text-[9px] text-[#d97706]/60 mt-2 typewriter-label">
                  Visit HQ to request Field Agent elevation
                </p>
              )}

              {/* Save Badge button / Name prompt */}
              {showNameInput ? (
                <div className="mt-3">
                  <p className="text-[9px] text-zinc-500 mb-1.5 typewriter-label text-left">
                    SET YOUR DISPLAY NAME FOR THE BADGE
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Your name"
                      maxLength={40}
                      className="flex-1 bg-black/40 border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 outline-none focus:border-[#d97706]/40 transition-colors placeholder:text-zinc-700"
                      onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                      autoFocus
                    />
                    <button
                      onClick={handleNameSubmit}
                      disabled={nameSaving || !nameInput.trim()}
                      className="px-3 py-1.5 bg-[#d97706]/20 border border-[#d97706]/30 text-[10px] text-[#d97706] typewriter-label hover:bg-[#d97706]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {nameSaving ? "..." : "SET NAME & DOWNLOAD"}
                    </button>
                  </div>
                  {nameError && (
                    <p className="flex items-center gap-1 text-[9px] text-red-400/80 mt-1.5 text-left">
                      <AlertCircle className="w-2.5 h-2.5" />
                      {nameError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-3">
                  <button
                    onClick={handleSaveBadge}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#d97706]/15 border border-[#d97706]/30 text-[10px] text-[#d97706] typewriter-label hover:bg-[#d97706]/25 transition-all"
                  >
                    <Download className="w-3 h-3" />
                    SAVE BADGE
                  </button>
                </div>
              )}

              {/* Save prompt for new users */}
              {isNew && (
                <p className="mt-2 text-[9px] text-[#d97706]/70 typewriter-label text-center">
                  Save your badge! You'll need the code to log in on another device.
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
                  LOG IN WITH A DIFFERENT BADGE
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase())}
                    placeholder="XXXX"
                    maxLength={4}
                    className="w-20 bg-black/40 border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 text-center tracking-[0.2em] outline-none focus:border-[#d97706]/40 transition-colors placeholder:text-zinc-700"
                    onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                  />
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="8-digit passcode"
                      inputMode="numeric"
                      pattern="[0-9]{8}"
                      autoComplete="off"
                      className="w-full bg-black/40 border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 pr-8 text-[11px] text-zinc-300 outline-none focus:border-[#d97706]/40 transition-colors placeholder:text-zinc-700"
                      onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  <button
                    onClick={handleClaim}
                    disabled={claiming || suffix.length !== 4 || password.length !== 8}
                    className="px-3 py-1.5 bg-[#d97706]/20 border border-[#d97706]/30 text-[10px] text-[#d97706] typewriter-label hover:bg-[#d97706]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {claiming ? "..." : "LOG IN"}
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
          ) : newBadgeCode ? (
            /* New badge generated — show code + set passcode */
            <div className="text-center">
              <Sparkles className="w-8 h-8 text-[#d97706] mx-auto mb-2" />
              <p className="text-[10px] text-zinc-400 typewriter-label mb-3">YOUR NEW BADGE</p>

              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#d97706]/10 border border-[#d97706]/20 mb-3">
                <Fingerprint className="w-3.5 h-3.5 text-[#d97706]" />
                <span className="text-[15px] font-mono font-bold text-[#d97706] tracking-wider">
                  {newBadgeCode}
                </span>
              </div>

              <p className="text-[9px] text-zinc-600 mb-1">
                This is your badge code. Save it.
              </p>
              <p className="text-[9px] text-zinc-500 mb-4">
                Login suffix: <span className="text-[#d97706] font-mono font-bold">{extractSuffix(newBadgeCode)}</span>
              </p>

              {/* Set passcode */}
              <p className="text-[9px] text-zinc-600 mb-2 typewriter-label text-left">
                SET YOUR 8-DIGIT PASSCODE
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    placeholder="8-digit passcode"
                    inputMode="numeric"
                    pattern="[0-9]{8}"
                    autoComplete="off"
                    autoFocus
                    className="w-full bg-black/40 border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 pr-8 text-[11px] text-zinc-300 outline-none focus:border-[#d97706]/40 transition-colors placeholder:text-zinc-700"
                    onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
                <button
                  onClick={async () => {
                    if (password.length !== 8) {
                      setClaimError("Passcode must be exactly 8 digits");
                      return;
                    }
                    setClaiming(true);
                    setClaimError("");
                    // Claim the newly generated badge with passcode
                    const result = await claimCode(newBadgeCode, password.trim());
                    if (result.success) {
                      setClaimSuccess(true);
                      setTimeout(() => {
                        setShowBadgeModal(false);
                        setPassword("");
                        setClaimSuccess(false);
                        setNewBadgeCode(null);
                      }, 2000);
                    } else {
                      setClaimError(result.error || "Failed to claim badge");
                    }
                    setClaiming(false);
                  }}
                  disabled={claiming || password.length !== 8}
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
          ) : (
            /* No badge — show options */
            <div>
              <p className="text-[11px] text-zinc-400 text-center mb-5">
                Get a bureau badge or log in with your existing one.
              </p>

              {/* GET BADGE */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-[#d97706]/15 border border-[#d97706]/30 text-[11px] text-[#d97706] typewriter-label hover:bg-[#d97706]/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all mb-4"
              >
                {generating ? (
                  "..."
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    GET YOUR BADGE
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[rgba(168,144,112,0.06)]" />
                <span className="text-[8px] text-zinc-700 typewriter-label">OR</span>
                <div className="flex-1 h-px bg-[rgba(168,144,112,0.06)]" />
              </div>

              {/* Log in with existing badge */}
              <p className="text-[9px] text-zinc-600 mb-2 typewriter-label">
                LOG IN WITH EXISTING BADGE
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase())}
                  placeholder="XXXX"
                  maxLength={4}
                  className="w-20 bg-black/40 border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 text-center tracking-[0.2em] outline-none focus:border-[#d97706]/40 transition-colors placeholder:text-zinc-700"
                  onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                />
                <div className="relative flex-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    placeholder="8-digit passcode"
                    inputMode="numeric"
                    pattern="[0-9]{8}"
                    autoComplete="off"
                    className="w-full bg-black/40 border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 pr-8 text-[11px] text-zinc-300 outline-none focus:border-[#d97706]/40 transition-colors placeholder:text-zinc-700"
                    onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
                <button
                  onClick={handleClaim}
                  disabled={claiming || suffix.length !== 4 || password.length !== 8}
                  className="px-3 py-1.5 bg-[#d97706]/20 border border-[#d97706]/30 text-[10px] text-[#d97706] typewriter-label hover:bg-[#d97706]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {claiming ? "..." : <Sparkles className="w-3 h-3" />}
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
