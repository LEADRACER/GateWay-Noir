import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { getCurrentUser } from "@/lib/get-current-user";
import type { BadgeUser } from "@/lib/badge-client";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GateWay:Noir — Where Cases Enter, Verdicts Exit",
  description: "A crowd-sourced detective network. Every case enters the Bureau, gets investigated, and receives a verdict.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Seed the client badge state from the server-side session cookie
  // so the badge/HQ button is immediately available on page load,
  // no API call or loading flash needed.
  const currentUser = await getCurrentUser();
  const initialUser: BadgeUser | null = currentUser ? {
    id: currentUser.id,
    badgeCode: currentUser.badgeCode,
    displayName: currentUser.displayName,
    role: currentUser.role,
    isAdmin: currentUser.isAdmin,
    phone: currentUser.phone ?? undefined,
    handler: currentUser.handler ?? undefined,
    hasPassword: currentUser.hasPassword,
  } : null;

  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#060608] text-zinc-300 min-h-screen flex flex-col`}>
        <ClientLayout initialUser={initialUser}>{children}</ClientLayout>
      </body>
    </html>
  );
}
