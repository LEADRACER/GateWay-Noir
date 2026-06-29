"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Fingerprint, Smartphone, ArrowUp, AlertCircle, CheckCircle, User, Scale } from "lucide-react";
import { useBadge } from "@/components/badge/BadgeProvider";
import { registerPhone } from "@/lib/badge-client";
import { requestElevation, getMyElevationStatus } from "@/lib/elevation-actions";

interface ElevationStatus {
  status: string;
  createdAt: string | Date;
}

export function DetHQ() {
  const { badge, updateBadge, setShowBadgeModal, handleSetPassword, showPasswordModal } = useBadge();
  const [elevationPending, setElevationPending] = useState(false);
  const [elevationSubmitting, setElevationSubmitting] = useState(false);
  const [elevationError, setElevationError] = useState("");
  const [elevationSent, setElevationSent] = useState(false);
  const [elevationStatus, setElevationStatus] = useState<ElevationStatus | null>(null);

  // Phone registration
  const [phone, setPhone] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [phoneSuccess, setPhoneSuccess] = useState(false);

  // Check existing elevation status on mount
  useEffect(() => {
    if (!badge) return;
    getMyElevationStatus(badge.id).then((status) => {
      if (status) {
        setElevationStatus(status as ElevationStatus);
        if (status.status === "PENDING") setElevationPending(true);
      }
    });
  }, [badge]);

  if (!badge) return null;

  const handleElevationRequest = async () => {
    if (!badge) return;

    // Check if passcode is set
    if (!badge.hasPassword) {
      // Trigger password setup — the BadgeProvider handles the modal
      setShowBadgeModal(true);
      setElevationError("Set a passcode first in your badge settings, then request elevation.");
      return;
    }

    setElevationSubmitting(true);
    setElevationError("");

    try {
      const result = await requestElevation(badge.id);
      if (result.success) {
        setElevationPending(true);
        setElevationSent(true);
        setElevationStatus({ status: "PENDING", createdAt: new Date().toISOString() });
      } else {
        setElevationError(result.error || "Failed to submit request");
      }
    } catch {
      setElevationError("Network error — try again");
    }

    setElevationSubmitting(false);
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
      setPhone("");
    } else {
      setPhoneError(result.error || "Failed to register phone");
    }
    setPhoneSaving(false);
  };

  const maskPhone = (p: string) => {
    if (p.length <= 4) return p;
    return p.slice(0, 3) + "****" + p.slice(-2);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Identity Card */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111113] border border-[rgba(168,144,112,0.12)] rounded-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Badge Code</p>
            <p className="text-lg font-mono font-bold text-[#d97706]">{badge.badgeCode}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-500" />
            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">DETECTIVE</span>
          </div>
        </div>

        <p className="text-xs text-zinc-500 mb-3">
          {badge.displayName || "Unnamed Detective"}
        </p>

        {badge.handler && (
          <div className="flex items-center gap-2 p-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] rounded mb-3">
            <Scale className="w-3 h-3 text-[#d97706] opacity-50" />
            <span className="text-[10px] text-zinc-500">
              Working under: <span className="text-[#d97706] font-mono">{badge.handler}</span>
            </span>
          </div>
        )}

        {/* Phone registration */}
        <div className="border-t border-[rgba(168,144,112,0.06)] pt-4 mt-4">
          <h3 className="text-[10px] text-zinc-500 typewriter-label mb-2">PHONE REGISTRATION</h3>
          {badge.phone ? (
            <div className="flex items-center gap-1.5 text-[10px] text-green-500/70">
              <Smartphone className="w-3 h-3" />
              <span className="typewriter-label">{maskPhone(badge.phone)}</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="flex-1 bg-black/40 border border-[rgba(168,144,112,0.1)] px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 outline-none focus:border-[#d97706]/40 transition-colors placeholder:text-zinc-700"
                onKeyDown={(e) => e.key === "Enter" && handlePhoneRegister()}
              />
              <button
                onClick={handlePhoneRegister}
                disabled={phoneSaving || phone.trim().length < 7}
                className="px-3 py-1.5 bg-[#d97706]/20 border border-[#d97706]/30 text-[10px] text-[#d97706] typewriter-label hover:bg-[#d97706]/30 disabled:opacity-40 transition-all"
              >
                {phoneSaving ? "..." : "SAVE"}
              </button>
            </div>
          )}
          {phoneError && (
            <p className="flex items-center gap-1 text-[9px] text-red-400/80 mt-1.5">
              <AlertCircle className="w-2.5 h-2.5" />
              {phoneError}
            </p>
          )}
          {phoneSuccess && (
            <p className="flex items-center gap-1 text-[9px] text-green-400/80 mt-1.5">
              <CheckCircle className="w-2.5 h-2.5" />
              Phone registered
            </p>
          )}
        </div>
      </motion.div>

      {/* Elevation Section */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#111113] border border-[rgba(168,144,112,0.12)] rounded-lg p-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <ArrowUp className="w-4 h-4 text-[#d97706] opacity-50" />
          <h2 className="text-xs font-semibold text-zinc-300 typewriter-label">FIELD AGENT ELEVATION</h2>
        </div>

        {elevationPending || elevationStatus?.status === "PENDING" ? (
          <div className="flex items-center gap-2 p-3 bg-[rgba(217,119,6,0.06)] border border-[rgba(217,119,6,0.12)] rounded">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <div>
              <p className="text-[10px] text-amber-400/80 typewriter-label">ELEVATION REQUEST PENDING</p>
              <p className="text-[9px] text-zinc-500 mt-0.5">Awaiting bureau approval</p>
            </div>
          </div>
        ) : elevationSent ? (
          <div className="flex items-center gap-2 p-3 bg-[rgba(34,197,94,0.06)] border border-[rgba(34,197,94,0.12)] rounded">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-[10px] text-green-400/80 typewriter-label">REQUEST SUBMITTED</p>
              <p className="text-[9px] text-zinc-500 mt-0.5">A bureau officer will review your application</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[10px] text-zinc-500 mb-4">
              Request promotion to Field Agent. You'll need a passcode set on your badge first.
            </p>
            <button
              onClick={handleElevationRequest}
              disabled={elevationSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#d97706]/15 border border-[#d97706]/30 text-xs text-[#d97706] typewriter-label hover:bg-[#d97706]/25 disabled:opacity-40 transition-all"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              {elevationSubmitting ? "SUBMITTING..." : "REQUEST FIELD AGENT STATUS"}
            </button>
            {elevationError && (
              <p className="flex items-center gap-1 text-[9px] text-red-400/80 mt-2">
                <AlertCircle className="w-2.5 h-2.5" />
                {elevationError}
              </p>
            )}
          </div>
        )}

        {!badge.hasPassword && (
          <p className="text-[9px] text-zinc-600 mt-2">
            Open your badge to set a passcode first.
          </p>
        )}
      </motion.div>
    </div>
  );
}
