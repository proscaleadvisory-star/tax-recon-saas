"use client";

import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  ArrowRight,
  Bot,
  CircleDollarSign,
  FileCheck2,
  LogOut,
  ReceiptText,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface HubPageProps {
  user: User;
  onSelectTool: (tool: "taxrecon" | "gstrecon" | "itrecon" | "profitability" | "fpa") => void;
}

const moduleCards = [
  {
    title: "Ecommerce Reconciliation",
    eyebrow: "Payouts and settlements",
    description: "Match marketplace payouts, bank settlements, SKU leakage, GST variance and dispute packs.",
    tool: "taxrecon" as const,
    icon: ReceiptText,
  },
  {
    title: "GST Recon Engine",
    eyebrow: "Input credit evidence",
    description: "Cross-check purchase books with GSTR-2B, tune fuzzy keys and export exception evidence.",
    tool: "gstrecon" as const,
    icon: Zap,
  },
  {
    title: "Profit Cockpit",
    eyebrow: "Margin visibility",
    description: "Track SKU economics, returns, COGS drift, runaway ads and weighted revenue leakage.",
    tool: "profitability" as const,
    icon: CircleDollarSign,
  },
  {
    title: "Direct Tax Recon",
    eyebrow: "Tax evidence desk",
    description: "Reconcile AIS, TIS, Form 16, bank receipts and remediation tasks from one desk.",
    tool: "itrecon" as const,
    icon: FileCheck2,
  },
  {
    title: "Virtual CFO OS",
    eyebrow: "Planning and reporting",
    description: "Run budget grids, forecasts, variance reports, ledger audits and CFO chat locally.",
    tool: "fpa" as const,
    icon: Bot,
  },
];

export default function HubPage({ user, onSelectTool }: HubPageProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <main className="min-h-screen bg-[#05070B] text-slate-50">
      <header className="border-b border-white/10 bg-[#05070B]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#38BDF8] text-sm font-black text-[#020617]">
              C
            </div>
            <div>
              <p className="text-lg font-bold tracking-[-0.02em]">CLIENT Suite</p>
              <p className="text-sm text-slate-400">All finance modules</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-slate-500">Signed in as</p>
              <p className="max-w-[260px] truncate text-sm font-medium text-slate-200">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-[#38BDF8]/40 hover:bg-white/[0.03]"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
        <div className="mb-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-[#38BDF8]/25 bg-[#38BDF8]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#38BDF8]">
              Workspace
            </p>
            <h1 className="max-w-4xl text-[clamp(2.2rem,4.8vw,4.6rem)] font-black leading-[0.98] tracking-[-0.045em]">
              Choose a module to start reconciliation.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
              Your suite is ready. Select any module below to upload data, review exceptions and prepare audit-ready exports.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-[#38BDF8]" size={22} />
              <div>
                <p className="font-semibold">Client-ready workspace</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">Five modules available from one screen.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {moduleCards.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.title}
                onClick={() => onSelectTool(module.tool)}
                className="group flex min-h-[290px] flex-col rounded-2xl border border-white/10 bg-[#0B1018] p-5 text-left shadow-[0_20px_80px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1 hover:border-[#38BDF8]/45 hover:bg-[#0F172A]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#38BDF8]/10 text-[#38BDF8]">
                    <Icon size={22} />
                  </div>
                  <ArrowRight className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-[#38BDF8]" size={18} />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#38BDF8]">{module.eyebrow}</p>
                <h2 className="mt-3 text-2xl font-bold leading-tight tracking-[-0.03em]">{module.title}</h2>
                <p className="mt-4 flex-1 text-sm leading-6 text-slate-400">{module.description}</p>
                <span className="mt-6 text-sm font-semibold text-white">Open module</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
