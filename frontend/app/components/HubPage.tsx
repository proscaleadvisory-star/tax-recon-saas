"use client";

import React from "react";
import type { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import {
  ArrowRight,
  Bot,
  Braces,
  CircleDollarSign,
  LogOut,
  Scale,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

interface HubPageProps {
  user: User;
  onSelectTool: (tool: "taxrecon" | "gstrecon" | "itrecon" | "profitability" | "fpa") => void;
}

const modules = [
  {
    key: "taxrecon" as const,
    title: "Ecommerce Reconciliation",
    kicker: "Settlement command layer",
    copy: "Match marketplace payouts against ledgers, expose tax variance, trace SKU leakage, and prepare dispute packs without burying the operator.",
    icon: ShieldCheck,
    accent: "emerald",
    stats: ["Payouts", "Claims", "Heatmaps"],
  },
  {
    key: "gstrecon" as const,
    title: "GST Recon Engine",
    kicker: "Input-credit integrity",
    copy: "Cross-check purchase books with GSTR-2B, tune fuzzy matching, and export audit-ready exception evidence.",
    icon: Zap,
    accent: "indigo",
    stats: ["2B Match", "Fuzzy Keys", "Audit Pack"],
  },
  {
    key: "profitability" as const,
    title: "Profit Cockpit",
    kicker: "Margin pressure radar",
    copy: "Monitor SKU economics, weight disputes, return leakage, and runway pressure through a crisp operating cockpit.",
    icon: CircleDollarSign,
    accent: "cyan",
    stats: ["COGS", "Runway", "Leakage"],
  },
  {
    key: "itrecon" as const,
    title: "Direct Tax Recon",
    kicker: "AIS / 26AS evidence desk",
    copy: "Reconcile tax credits across AIS, TIS, Form 16, bank statements, and remediation playbooks.",
    icon: Scale,
    accent: "violet",
    stats: ["AIS", "26AS", "ITR Handoff"],
  },
  {
    key: "fpa" as const,
    title: "Virtual CFO OS",
    kicker: "Local-first FP&A studio",
    copy: "Run budget grids, forecasts, financial reports, ledger audits, and CFO chat from a focused local console.",
    icon: Bot,
    accent: "silver",
    stats: ["Budget", "ARIMA", "CFO Chat"],
  },
];

const accentClasses = {
  emerald: {
    card: "border-emerald-300/24 hover:border-emerald-300/55",
    glow: "from-emerald-300/22 via-teal-400/8 to-transparent",
    icon: "text-emerald-200 border-emerald-300/30 bg-emerald-300/10",
    text: "text-emerald-200",
  },
  indigo: {
    card: "border-indigo-300/24 hover:border-indigo-300/55",
    glow: "from-indigo-300/22 via-blue-400/8 to-transparent",
    icon: "text-indigo-200 border-indigo-300/30 bg-indigo-300/10",
    text: "text-indigo-200",
  },
  cyan: {
    card: "border-cyan-300/24 hover:border-cyan-300/55",
    glow: "from-cyan-300/22 via-sky-400/8 to-transparent",
    icon: "text-cyan-100 border-cyan-300/30 bg-cyan-300/10",
    text: "text-cyan-100",
  },
  violet: {
    card: "border-violet-300/24 hover:border-violet-300/55",
    glow: "from-violet-300/24 via-fuchsia-400/8 to-transparent",
    icon: "text-violet-100 border-violet-300/30 bg-violet-300/10",
    text: "text-violet-100",
  },
  silver: {
    card: "border-slate-200/22 hover:border-slate-100/50",
    glow: "from-slate-200/18 via-slate-400/8 to-transparent",
    icon: "text-slate-100 border-slate-200/25 bg-slate-200/10",
    text: "text-slate-100",
  },
};

export default function HubPage({ user, onSelectTool }: HubPageProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="cinematic-shell relative min-h-screen overflow-hidden bg-[#030406] text-slate-100">
      <div className="cinematic-grid" />
      <div className="cinematic-vignette" />
      <div className="absolute left-[8vw] top-[8vh] h-72 w-72 rounded-full bg-cyan-300/10 blur-[110px]" />
      <div className="absolute right-[-8vw] top-[18vh] h-[34rem] w-[34rem] rounded-full bg-violet-400/10 blur-[150px]" />
      <div className="absolute bottom-[-24vh] left-[24vw] h-[38rem] w-[38rem] rounded-full bg-emerald-300/8 blur-[150px]" />

      <header className="relative z-20 mx-auto flex w-full max-w-[1680px] items-center justify-between gap-5 px-6 py-5 sm:px-10 lg:px-14">
        <button
          onClick={() => onSelectTool("taxrecon")}
          className="group flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.035] py-2 pl-2 pr-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition duration-300 hover:border-cyan-200/35 hover:bg-white/[0.06]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-200/25 bg-cyan-200/10 shadow-[0_0_28px_rgba(103,232,249,0.16)]">
            <Braces size={19} className="text-cyan-100" />
          </span>
          <span className="font-display text-lg font-black uppercase tracking-[0.18em] text-slate-100 sm:text-xl">
            ProScale
          </span>
        </button>

        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Operator</p>
            <p className="max-w-[260px] truncate font-mono text-xs font-semibold text-cyan-100/85">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="metal-button flex h-11 items-center gap-2 rounded-full px-4 text-xs font-black uppercase tracking-[0.18em] text-slate-200"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-92px)] w-full max-w-[1680px] flex-col px-6 pb-10 sm:px-10 lg:px-14">
        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(560px,1.05fr)] lg:py-12">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-5xl"
          >
            <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-cyan-200/20 bg-cyan-200/[0.055] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              <Sparkles size={15} className="text-cyan-100" />
              <span className="font-mono text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100">
                AI-powered finance suite v3.0
              </span>
            </div>

            <h1 className="font-display text-[clamp(3.6rem,8vw,9.4rem)] font-black uppercase leading-[0.8] tracking-[-0.045em] text-slate-100">
              Finance
              <span className="block bg-[linear-gradient(115deg,#f8fafc_0%,#94a3b8_18%,#67e8f9_45%,#c4b5fd_70%,#f8fafc_100%)] bg-clip-text text-transparent">
                War Room
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-balance text-lg leading-8 text-slate-300/78">
              A dark, cinematic operating suite for recon teams that need precision, tax evidence, margin telemetry, and CFO-grade planning without the dashboard clutter.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onSelectTool("taxrecon")}
                className="group metal-button h-14 rounded-full px-6 text-sm font-black uppercase tracking-[0.18em] text-slate-50"
              >
                Enter Suite
                <ArrowRight size={17} className="transition duration-300 group-hover:translate-x-1" />
              </button>
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/25 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.8)]" />
                Local-first modules
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {modules.map((mod, index) => {
              const Icon = mod.icon;
              const accent = accentClasses[mod.accent as keyof typeof accentClasses];
              return (
                <motion.button
                  key={mod.key}
                  onClick={() => onSelectTool(mod.key)}
                  initial={{ opacity: 0, y: 34, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.12 + index * 0.08, duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
                  className={`cinematic-card group relative min-h-[260px] overflow-hidden rounded-[1.65rem] border bg-[#080a0f]/78 p-6 text-left shadow-[0_22px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl transition duration-500 hover:-translate-y-2 ${accent.card} ${
                    index === 0 ? "sm:row-span-2 sm:min-h-[536px]" : ""
                  }`}
                >
                  <div className={`absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br blur-[2px] transition duration-700 group-hover:scale-125 ${accent.glow}`} />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
                  <div className="relative flex h-full flex-col">
                    <div className="mb-7 flex items-start justify-between gap-5">
                      <span className={`flex h-13 w-13 items-center justify-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.13)] ${accent.icon}`}>
                        <Icon size={22} />
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        0{index + 1}
                      </span>
                    </div>

                    <p className={`mb-3 font-mono text-[11px] font-black uppercase tracking-[0.24em] ${accent.text}`}>
                      {mod.kicker}
                    </p>
                    <h2 className="font-display text-2xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-slate-100 sm:text-3xl">
                      {mod.title}
                    </h2>
                    <p className="mt-5 max-w-xl text-sm leading-6 text-slate-400">{mod.copy}</p>

                    <div className="mt-auto pt-8">
                      <div className="mb-5 flex flex-wrap gap-2">
                        {mod.stats.map((stat) => (
                          <span
                            key={stat}
                            className="rounded-full border border-white/10 bg-black/24 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300"
                          >
                            {stat}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between border-t border-white/10 pt-5">
                        <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Launch module</span>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.045] text-slate-100 transition duration-300 group-hover:translate-x-1 group-hover:border-white/35">
                          <ArrowRight size={16} />
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
