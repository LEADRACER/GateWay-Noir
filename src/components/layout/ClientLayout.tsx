"use client";

import { ReactNode } from "react";
import { BadgeProvider } from "@/components/badge/BadgeProvider";
import { BadgeModal } from "@/components/badge/BadgeModal";
import { PasswordModal } from "@/components/badge/PasswordModal";
import { ProfileModal } from "@/components/badge/ProfileModal";
import { Navbar } from "@/components/layout/Navbar";
import { RotatingLiquidText } from "@/components/layout/RotatingLiquidText";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "react-hot-toast";
import { ScreenshotProtection } from "@/components/security/ScreenshotProtection";
import type { BadgeUser } from "@/lib/badge-client";

export function ClientLayout({ children, initialUser }: { children: ReactNode; initialUser?: BadgeUser | null }) {
  return (
    <BadgeProvider initialUser={initialUser}>
      <ScreenshotProtection />
      <Navbar />
      <main className="flex-1 pt-16 flex flex-col">
        {children}
      </main>
      <RotatingLiquidText />
      <Footer />
      <BadgeModal />
      <PasswordModal />
      <ProfileModal />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#111113",
            color: "#a1a1aa",
            border: "1px solid rgba(168,144,112,0.12)",
            fontSize: "12px",
          },
          success: { iconTheme: { primary: "#d97706", secondary: "#111113" } },
          error: { iconTheme: { primary: "#dc2626", secondary: "#111113" } },
        }}
      />
    </BadgeProvider>
  );
}
