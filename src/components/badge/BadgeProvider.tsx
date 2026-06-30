"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { BadgeUser, checkBadgeStatus, claimBadge, setPassword, verifyPassword, generateBadgeCode } from "@/lib/badge-client";
import { saveBadgeCodeToCookie, getBadgeCodeFromCookie } from "@/lib/badge-cookie";

interface BadgeContextValue {
  badge: BadgeUser | null;
  loading: boolean;
  isNew: boolean;
  showBadgeModal: boolean;
  setShowBadgeModal: (show: boolean) => void;
  showPasswordModal: boolean;
  setShowPasswordModal: (show: boolean) => void;
  passwordVerified: boolean;
  claimCode: (code: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  generateBadge: () => Promise<{ success: boolean; user?: BadgeUser; error?: string }>;
  refreshBadge: () => Promise<void>;
  updateBadge: (updates: Partial<BadgeUser>) => void;
  handleSetPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  handleVerifyPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
}

const BadgeContext = createContext<BadgeContextValue>({
  badge: null,
  loading: true,
  isNew: false,
  showBadgeModal: false,
  setShowBadgeModal: () => {},
  showPasswordModal: false,
  setShowPasswordModal: () => {},
  passwordVerified: false,
  claimCode: async () => ({ success: false }),
  generateBadge: async () => ({ success: false }),
  refreshBadge: async () => {},
  updateBadge: () => {},
  handleSetPassword: async () => ({ success: false }),
  handleVerifyPassword: async () => ({ success: false }),
});

const PASSWORD_VERIFIED_KEY = "noirgateway_pw_verified";

export function useBadge() {
  return useContext(BadgeContext);
}

export function BadgeProvider({ children }: { children: ReactNode }) {
  const [badge, setBadge] = useState<BadgeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNew, setIsNew] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);

  const updateBadge = useCallback((updates: Partial<BadgeUser>) => {
    setBadge((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const refreshBadge = useCallback(async () => {
    setLoading(true);
    const status = await checkBadgeStatus();
    if (status.success && status.user) {
      setBadge(status.user);
      setIsNew(!!status.isNew);

      // Persist badge code to cookie
      saveBadgeCodeToCookie(status.user.badgeCode);

      // All users must set/verify a passcode after claiming
      const alreadyVerified = typeof window !== "undefined" && localStorage.getItem(PASSWORD_VERIFIED_KEY);

      if (!status.user.hasPassword) {
        // No password set yet — must set one
        setShowPasswordModal(true);
        setPasswordVerified(false);
      } else if (status.user.hasPassword && !alreadyVerified) {
        // Has password but not verified this session
        setShowPasswordModal(true);
        setPasswordVerified(false);
      } else if (alreadyVerified) {
        setPasswordVerified(true);
      }

      // Auto-show modal on first badge creation
      if (status.isNew) {
        setShowBadgeModal(true);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshBadge();
  }, [refreshBadge]);

  const claimCode = useCallback(async (code: string, password?: string) => {
    const result = await claimBadge(code, password);
    if (result.success && result.user) {
      setBadge(result.user);
      saveBadgeCodeToCookie(result.user.badgeCode);
      // Persist password-verified state so modal doesn't reappear on refresh
      if (result.user.hasPassword) {
        localStorage.setItem(PASSWORD_VERIFIED_KEY, "true");
        setPasswordVerified(true);
      }
      return { success: true };
    }
    return { success: false, error: result.error, needsPasscode: (result as any).needsPasscode };
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
        passwordVerified,
        claimCode, generateBadge, refreshBadge, updateBadge,
        handleSetPassword, handleVerifyPassword,
      }}
    >
      {children}
    </BadgeContext.Provider>
  );
}
