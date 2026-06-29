"use client";

import { ReactNode } from "react";
import { BadgeProvider } from "@/components/badge/BadgeProvider";
import { BadgeModal } from "@/components/badge/BadgeModal";
import { PasswordModal } from "@/components/badge/PasswordModal";
import { Navbar } from "@/components/layout/Navbar";
import { RotatingLiquidText } from "@/components/layout/RotatingLiquidText";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "react-hot-toast";

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <BadgeProvider>
      <Navbar />
      <main className="flex-1 pt-16 flex flex-col items-center">
        {children}
      </main>
      <RotatingLiquidText />
      <Footer />
      <BadgeModal />
      <PasswordModal />
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
