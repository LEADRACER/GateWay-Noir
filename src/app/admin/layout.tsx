import Link from "next/link";
import { LayoutDashboard, PlusCircle, Scale, MessageSquare, ChevronRight } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/topics/new", label: "New Myth", icon: PlusCircle },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-zinc-800/50 bg-zinc-950/50 p-4">
        <div className="flex items-center gap-2 px-3 py-3 mb-6">
          <Scale className="w-5 h-5 text-violet-400" />
          <span className="text-sm font-semibold text-white">Admin Panel</span>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-all duration-200 group"
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
              <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </nav>
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          ← Back to site
        </Link>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-xl">
        <div className="flex items-center justify-around py-2 px-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-zinc-500"
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 md:p-8 pb-20 md:pb-8">
        {children}
      </div>
    </div>
  );
}
