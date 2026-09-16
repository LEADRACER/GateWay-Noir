"use client";

import { useState } from "react";
import { X, User, Phone, AlertCircle, CheckCircle, Shield, UserPlus } from "lucide-react";
import { useBadge } from "./BadgeProvider";
import { normalizePhone } from "@/lib/phone";

export function ProfileModal() {
  const {
    badge,
    showProfileModal,
    setShowProfileModal,
    updateProfile,
    getProfileRequirements,
    checkProfileComplete,
  } = useBadge();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  if (!showProfileModal || !badge) return null;
  if (checkProfileComplete()) return null;

  const requirements = getProfileRequirements();
  const needsName = requirements.needsName && badge.role === "AGENT";
  const needsPhone = requirements.needsPhone;

  const handleSubmit = async () => {
    setError("");
    setNameError("");
    setPhoneError("");

    if (needsName) {
      if (!displayName.trim()) {
        setNameError("Display name is required");
        return;
      }
      if (displayName.length > 40) {
        setNameError("Display name must be 40 characters or less");
        return;
      }
      const lowerName = displayName.toLowerCase().trim();
      if (["detective", "agent", "field agent", "bureau chief", "anonymous"].includes(lowerName)) {
        setNameError("Choose a unique name, not the default");
        return;
      }
    }

    if (needsPhone && phone.trim()) {
      const normalized = normalizePhone(phone);
      if (!normalized) {
        setPhoneError("Enter a valid phone number, with or without +91");
        return;
      }
    }

    setSubmitting(true);
    const result = await updateProfile(needsName ? displayName.trim() : undefined, needsPhone ? phone.trim() : undefined);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || "Failed to update profile");
    } else {
      if (!result.needsName && !result.needsPhone) {
        setShowProfileModal(false);
        setDisplayName("");
        setPhone("");
      }
    }
  };

  const handleSkipPhone = async () => {
    setError("");
    setSubmitting(true);
    const result = await updateProfile(needsName ? displayName.trim() : undefined, "");
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || "Failed to update profile");
    } else {
      if (!result.needsName && !result.needsPhone) {
        setShowProfileModal(false);
        setDisplayName("");
        setPhone("");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center bg-black/70 backdrop-blur-sm pt-16 sm:pt-0 overflow-y-auto">
      <div className="bg-[#0d0d0f] border border-[rgba(168,144,112,0.12)] w-full max-w-sm mx-4 mt-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(168,144,112,0.06)] bg-[#0a0a0c]">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#d97706]" />
            <span className="text-[10px] font-medium text-zinc-400 typewriter-label tracking-widest">
              COMPLETE YOUR PROFILE
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="text-center mb-4">
            <UserPlus className="w-8 h-8 text-[#d97706] mx-auto mb-2" />
            <p className="text-[11px] text-zinc-400 font-mono font-bold tracking-wider">
              {badge.badgeCode}
            </p>
            <p className="text-[9px] text-zinc-600 typewriter-label mt-1">
              {badge.role} • {badge.displayName}
            </p>
          </div>

          <p className="text-[9px] text-zinc-500 mb-4 typewriter-label text-left">
            As an AGENT, you must set a display name. Phone number is optional but recommended for notifications.
          </p>

          {/* Display Name Input */}
          {needsName && (
            <div className="mb-4">
              <label className="flex items-center gap-1 text-[9px] text-zinc-400 typewriter-label mb-1">
                <User className="w-3 h-3" />
                DISPLAY NAME (REQUIRED)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setNameError("");
                }}
                placeholder="Your display name"
                maxLength={40}
                autoFocus
                className={`w-full bg-black/40 border px-2.5 py-2 text-[11px] text-zinc-300 outline-none transition-colors placeholder:text-zinc-700 ${
                  nameError
                    ? "border-red-500/40"
                    : "border-[rgba(168,144,112,0.1)] focus:border-[#d97706]/40"
                }`}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              {nameError && (
                <p className="flex items-center gap-1 text-[9px] text-red-400/80 mt-1 text-left">
                  <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                  <span>{nameError}</span>
                </p>
              )}
            </div>
          )}

          {/* Phone Input */}
          {needsPhone && (
            <div className="mb-4">
              <label className="flex items-center gap-1 text-[9px] text-zinc-400 typewriter-label mb-1">
                <Phone className="w-3 h-3" />
                PHONE NUMBER (OPTIONAL)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError("");
                }}
                placeholder="+91 98765 43210 or 9876543210"
                className={`w-full bg-black/40 border px-2.5 py-2 text-[11px] text-zinc-300 outline-none transition-colors placeholder:text-zinc-700 ${
                  phoneError
                    ? "border-red-500/40"
                    : "border-[rgba(168,144,112,0.1)] focus:border-[#d97706]/40"
                }`}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <p className="text-[8px] text-zinc-600 mt-1 typewriter-label">
                Format: +91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX, or XXXXXXXXXX
              </p>
              {phoneError && (
                <p className="flex items-center gap-1 text-[9px] text-red-400/80 mt-1 text-left">
                  <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                  <span>{phoneError}</span>
                </p>
              )}
            </div>
          )}

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
            disabled={submitting || (needsName && !displayName.trim())}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#d97706]/15 border border-[#d97706]/30 text-[10px] text-[#d97706] typewriter-label hover:bg-[#d97706]/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? (
              "..."
            ) : (
              <>
                <CheckCircle className="w-3 h-3" />
                SAVE & CONTINUE
              </>
            )}
          </button>

          {needsPhone && (
            <button
              onClick={handleSkipPhone}
              disabled={submitting || (needsName && !displayName.trim())}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 border border-[rgba(168,144,112,0.1)] text-[10px] text-zinc-500 typewriter-label hover:border-[rgba(168,144,112,0.2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Phone className="w-3 h-3" />
              SKIP PHONE FOR NOW
            </button>
          )}

          <p className="mt-2 text-[8px] text-zinc-700 typewriter-label text-center">
            You can update your profile later from the badge menu.
          </p>
        </div>
      </div>
    </div>
  );
}