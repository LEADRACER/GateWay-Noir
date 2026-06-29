import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LayoutDashboard, PlusCircle, Scale, MessageSquare, ChevronRight, Fingerprint, ClipboardList } from "lucide-react";
import { getCurrentUser } from "@/lib/get-current-user";

const bureauNavItems = [
  { href: "/admin", label: "HQ", icon: LayoutDashboard },
  { href: "/admin/topics/new", label: "New Case File", icon: PlusCircle },
  { href: "/admin/comments", label: "Witness Statements", icon: MessageSquare },
  { href: "/admin/tasks", label: "Agent Tasks", icon: ClipboardList },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // No badge at all — redirect home
  if (!user) {
    redirect("/");
  }

  const isBureau = user.role === "BUREAU";

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Sidebar — only for BRU users */}
      {isBureau && (
        <aside className="hidden md:flex flex-col w-56 border-r-2 border-[rgba(168,144,112,0.12)] bg-[#0a0a0c] p-3 shadow-[4px_0_12px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2 px-2 py-2 mb-4">
            <Scale className="w-4 h-4 text-[#d97706] opacity-50" />
            <span className="text-xs font-semibold text-zinc-400 typewriter-label">HQ</span>
          </div>
          <nav className="flex-1 space-y-0.5">
            {bureauNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-[#111113] transition-colors group"
              >
                <item.icon className="w-3.5 h-3.5 opacity-50" />
                <span className="typewriter-label">{item.label.toUpperCase()}</span>
                <ChevronRight className="w-2.5 h-2.5 ml-auto opacity-0 group-hover:opacity-40 transition-opacity" />
              </Link>
            ))}
          </nav>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] text-zinc-700 hover:text-zinc-400 transition-colors typewriter-label"
          >
            ← BACK TO SITE
          </Link>
        </aside>
      )}

      {/* Mobile bottom nav — only for BRU */}
      {isBureau && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[rgba(168,144,112,0.08)] bg-[#08080a]">
          <div className="flex items-center justify-around py-1.5 px-3">
            {bureauNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 px-2 py-1 text-zinc-600"
              >
                <item.icon className="w-3.5 h-3.5" />
                <span className="text-[8px] typewriter-label">{item.label.toUpperCase()}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 p-3 md:p-6 ${isBureau ? "pb-16 md:pb-6" : ""}`}>
        {children}
      </div>
    </div>
  );
}
