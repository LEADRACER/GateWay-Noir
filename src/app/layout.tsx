import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Myth:GateWay — Where Myths Enter, Verdicts Exit",
  description: "A crowd-sourced platform for investigating conspiracies and myths. Every myth enters the Gate, gets debated, and receives a verdict.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100 min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-1 pt-16">
          {children}
        </main>
        <Footer />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#18181b",
              color: "#e4e4e7",
              border: "1px solid #27272a",
              borderRadius: "12px",
              fontSize: "14px",
            },
            success: { iconTheme: { primary: "#22c55e", secondary: "#18181b" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#18181b" } },
          }}
        />
      </body>
    </html>
  );
}
