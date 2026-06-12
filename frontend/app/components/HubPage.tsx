"use client";

import React from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  Braces,
  LogOut,
} from "lucide-react";
import { HeroSection, InteractiveDashboardSection } from "./landing/CinematicLandingSections";

interface HubPageProps {
  user: User;
  onSelectTool: (tool: "taxrecon" | "gstrecon" | "itrecon" | "profitability" | "fpa") => void;
}

const readiness = [
  "Marketplace payout imports, GST portal exports, AIS/26AS statements, Form 16, ledgers, and bank workbooks.",
  "Evidence-grade outputs: dispute packs, ITC variance trails, audit reports, CFO budgets, forecasts, and anomaly logs.",
  "Client controls for taxpayer registration, local archives, workspace settings, downloads, and remediation tasks.",
];

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

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-92px)] w-full max-w-[1680px] flex-col px-6 pb-14 sm:px-10 lg:px-14">
        <HeroSection onSelectTool={onSelectTool} />
        <InteractiveDashboardSection onSelectTool={onSelectTool} />

        <section
          className="mb-2 grid gap-5 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.76),rgba(2,6,23,0.42))] p-5 shadow-[0_26px_100px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl lg:grid-cols-[0.75fr_1.25fr]"
        >
          <div className="rounded-[1.5rem] border border-cyan-200/15 bg-cyan-200/[0.035] p-6">
            <p className="font-mono text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100">Launch readiness</p>
            <h2 className="mt-4 font-display text-3xl font-black uppercase leading-none tracking-[-0.03em] text-white">
              Client handoff details are built into the suite.
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {readiness.map((item, index) => (
              <div key={item} className="rounded-[1.35rem] border border-white/10 bg-black/24 p-5">
                <p className="mb-4 font-mono text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">0{index + 1}</p>
                <p className="text-sm leading-6 text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
