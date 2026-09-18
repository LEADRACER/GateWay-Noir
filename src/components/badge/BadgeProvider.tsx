"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { BadgeUser, checkBadgeStatus, claimBadge, setPassword, verifyPassword, generateBadgeCode, updateBadgeName, registerPhone } from "@/lib/badge-client";
import { saveBadgeCodeToCookie, getBadgeCodeFromCookie } from "@/lib/badge-cookie";
import { getBadgeProfileRequirements, isBadgeProfileComplete } from "@/lib/badge-profile";

interface ClaimBadgeResult {
  success: boolean;
  alreadyClaimed?: boolean;
  requiresProfile?: boolean;
  needsName?: boolean;
  needsPhone?: boolean;
  error?: string;
  user?: BadgeUser;
  needsPasscode?: boolean;
}

interface BadgeContextValue {
  badge: BadgeUser | null;
  loading: boolean;
  isNew: boolean;
  showBadgeModal: boolean;
  setShowBadgeModal: (show: boolean) => void;
  showPasswordModal: boolean;
  setShowPasswordModal: (show: boolean) => void;
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
  passwordVerified: boolean;
  claimCode: (code: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  generateBadge: () => Promise<{ success: boolean; user?: BadgeUser; error?: string }>;
  refreshBadge: () => Promise<void>;
  updateBadge: (updates: Partial<BadgeUser>) => void;
  handleSetPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  handleVerifyPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (displayName?: string, phone?: string) => Promise<{ success: boolean; error?: string; needsName?: boolean; needsPhone?: boolean }>;
  checkProfileComplete: () => boolean;
  getProfileRequirements: () => { needsName: boolean; needsPhone: boolean };
}

const BadgeContext = createContext<BadgeContextValue>({
  badge: null,
  loading: true,
  isNew: false,
  showBadgeModal: false,
  setShowBadgeModal: () => {},
  showPasswordModal: false,
  setShowPasswordModal: () => {},
  showProfileModal: false,
  setShowProfileModal: () => {},
  passwordVerified: false,
  claimCode: async () => ({ success: false }),
  generateBadge: async () => ({ success: false }),
  refreshBadge: async () => {},
  updateBadge: () => {},
  handleSetPassword: async () => ({ success: false }),
  handleVerifyPassword: async () => ({ success: false }),
  updateProfile: async () => ({ success: false, error: "Not initialized" }),
  checkProfileComplete: () => false,
  getProfileRequirements: () => ({ needsName: false, needsPhone: false }),
});

const PASSWORD_VERIFIED_KEY = "noirgateway_pw_verified";

export function useBadge() {
  return useContext(BadgeContext);
}

export function BadgeProvider({ children, initialUser }: { children: ReactNode; initialUser?: BadgeUser | null }) {
  // Seed from server-side session — eliminates loading flash on page refresh
  const [badge, setBadge] = useState<BadgeUser | null>(initialUser || null);
  const [loading, setLoading] = useState(!initialUser);
  const [isNew, setIsNew] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(!!initialUser);
  const hasServerSeed = useRef(!!initialUser);

  const updateBadge = useCallback((updates: Partial<BadgeUser>) => {
    setBadge((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const refreshBadge = useCallback(async () => {
    // If we already have a seed from the server, persist the cookie and skip
    // the API call unless the badge appears stale.
    setBadge((current) => {
      if (current) {
        saveBadgeCodeToCookie(current.badgeCode);
        if (typeof window !== "undefined") {
          localStorage.setItem(PASSWORD_VERIFIED_KEY, "true");
        }
        setPasswordVerified(true);
        setLoading(false);
      }
      return current;
    });

    // Still do the API check in the background (without showing modals) to
    // catch any server-side state changes.
    const status = await checkBadgeStatus();
    if (status.success && status.user) {
      setBadge(status.user);
      setIsNew(!!status.isNew);
      saveBadgeCodeToCookie(status.user.badgeCode);

      const alreadyVerified = typeof window !== "undefined" && localStorage.getItem(PASSWORD_VERIFIED_KEY);

      if (!status.user.hasPassword) {
        setShowPasswordModal(true);
        setPasswordVerified(false);
      } else if (!alreadyVerified) {
        // Check badge cookie — if it exists, user is returning
        const badgeCookie = getBadgeCodeFromCookie();
        if (badgeCookie) {
          localStorage.setItem(PASSWORD_VERIFIED_KEY, "true");
          setPasswordVerified(true);
        } else {
          setShowPasswordModal(true);
          setPasswordVerified(false);
        }
      } else {
        setPasswordVerified(true);
      }

      if (status.isNew) {
        setShowBadgeModal(true);
      }

      // Check if agent needs profile completion
      if (status.user.role === "AGENT" && !isBadgeProfileComplete(status.user)) {
        setShowProfileModal(true);
      }
    } else if (!hasServerSeed.current) {
      setBadge(null);
    }
    setLoading(false);
  }, []);

  const checkProfileComplete = useCallback(() => {
    if (!badge) return false;
    return isBadgeProfileComplete(badge);
  }, [badge]);

  const getProfileRequirements = useCallback(() => {
    if (!badge) return { needsName: false, needsPhone: false };
    return getBadgeProfileRequirements(badge);
  }, [badge]);

  const updateProfile = useCallback(async (displayName?: string, phone?: string) => {
    if (!badge) return { success: false, error: "No badge" };

    const requirements = getBadgeProfileRequirements(badge);
    const errors: string[] = [];

    if (displayName !== undefined) {
      if (requirements.needsName) {
        if (!displayName || displayName.length > 40 || displayName === "Detective" || displayName === "Agent" || displayName === "Field Agent" || displayName === "Bureau Chief" || displayName === "Anonymous") {
          errors.push("Choose a unique display name (1-40 characters)");
        }
      }
    }

    if (phone !== undefined) {
      if (requirements.needsPhone) {
        if (phone) {
          const { normalizePhone } = await import("@/lib/phone");
          const normalized = normalizePhone(phone);
          if (!normalized) {
            errors.push("Enter a valid phone number, with or without +91");
          }
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, error: errors[0], needsName: requirements.needsName, needsPhone: requirements.needsPhone };
    }

    const updates: Record<string, string> = {};
    if (displayName !== undefined && requirements.needsName) {
      updates.displayName = displayName.trim();
    }
    if (phone !== undefined && requirements.needsPhone && phone) {
      const { normalizePhone } = await import("@/lib/phone");
      const normalized = normalizePhone(phone);
      if (normalized) updates.phone = normalized;
    }

    if (Object.keys(updates).length === 0) {
      return { success: true, needsName: false, needsPhone: false };
    }

    try {
      // Update via API
      if (updates.displayName) {
        const res = await fetch("/api/badge/name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badgeCode: badge.badgeCode, displayName: updates.displayName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update name");
      }
      if (updates.phone) {
        const res = await fetch("/api/badge/phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badgeCode: badge.badgeCode, phone: updates.phone }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update phone");
      }

      // Refresh badge
      await refreshBadge();

      const newRequirements = getBadgeProfileRequirements({ ...badge, ...updates });
      return { success: true, needsName: newRequirements.needsName, needsPhone: newRequirements.needsPhone };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update profile" };
    }
  }, [badge]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshBadge();
  }, [refreshBadge]);

  const claimCode = useCallback(async (code: string, password?: string) => {
    const result = await claimBadge(code, password);
    if (result.success && result.user) {
      setBadge(result.user);
      saveBadgeCodeToCookie(result.user.badgeCode);
      if (result.user.hasPassword) {
        localStorage.setItem(PASSWORD_VERIFIED_KEY, "true");
        setPasswordVerified(true);
      }
      // Check if agent needs profile completion
      if (result.user.role === "AGENT" && !isBadgeProfileComplete(result.user)) {
        setShowProfileModal(true);
      }
      return { success: true };
    }
    return { success: false, error: result.error, needsPasscode: result.needsPasscode };
  }, []);

  const handleSetPassword = useCallback(async (password: string) => {
    if (!badge) return { success: false, error: "No badge" };
    const result = await setPassword(badge.badgeCode, password);
    if (result.success) {
      localStorage.setItem(PASSWORD_VERIFIED_KEY, "true");
      setPasswordVerified(true);
      setShowPasswordModal(false);
    }
    return result;
  }, [badge]);

  const handleVerifyPassword = useCallback(async (password: string) => {
    if (!badge) return { success: false, error: "No badge" };
    const result = await verifyPassword(badge.badgeCode, password);
    if (result.success) {
      localStorage.setItem(PASSWORD_VERIFIED_KEY, "true");
      setPasswordVerified(true);
      setShowPasswordModal(false);
    }
    return result;
  }, [badge]);

  const generateBadge = useCallback(async () => {
    const result = await generateBadgeCode();
    if (result.success && result.user) {
      setBadge(result.user);
      setIsNew(true);
      setShowBadgeModal(true);
    }
    return result;
  }, []);

  return (
    <BadgeContext.Provider
      value={{
        badge, loading, isNew,
        showBadgeModal, setShowBadgeModal,
        showPasswordModal, setShowPasswordModal,
        showProfileModal, setShowProfileModal,
        passwordVerified,
        claimCode, generateBadge, refreshBadge, updateBadge,
        handleSetPassword, handleVerifyPassword,
        updateProfile, checkProfileComplete, getProfileRequirements,
      }}
    >
      {children}
    </BadgeContext.Provider>
  );
}
