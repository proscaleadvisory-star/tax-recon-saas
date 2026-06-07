"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FileCheck2, 
  History, 
  BarChart3, 
  Settings, 
  TrendingUp,
  LogOut,
  User,
  Bell
} from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: FileCheck2, label: "Recon Engine", href: "/dashboard/recon" },
  { icon: BarChart3, label: "Global Analysis", href: "/dashboard/analysis" },
  { icon: History, label: "Match History", href: "/dashboard/history" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-background mesh-gradient overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-glass-border glass m-4 rounded-3xl flex flex-col shadow-2xl">
        <div className="p-8 pb-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              ProScale <span className="text-primary">Advisory</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${
                  isActive 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "group-hover:scale-110 transition-transform"}`} />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-glass-border">
          <div className="bg-slate-900/40 rounded-2xl p-4 flex items-center gap-3 border border-slate-800/50">
            <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/20 flex items-center justify-center text-accent font-bold">
              CA
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate">Advisor Demo</p>
              <p className="text-xs text-slate-500 truncate">demo@proscale.com</p>
            </div>
          </div>
          <Link 
            href="/auth/login" 
            className="mt-2 flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium text-sm">Sign Out</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 px-8 flex items-center justify-between border-b border-glass-border backdrop-blur-sm">
          <h2 className="text-xl font-bold">Workspace</h2>
          <div className="flex items-center gap-4">
            <button className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary border-2 border-slate-900" />
            </button>
            <div className="h-10 w-px bg-slate-800" />
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">System Online</span>
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Section */}
        <section className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children}
        </section>
      </main>
    </div>
  );
}
