"use client";

import React from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  Braces,
  LogOut,
} from "lucide-react";
import ReelCinematicExperience from "./landing/ReelCinematicExperience";

interface HubPageProps {
  user: User;
  onSelectTool: (tool: "taxrecon" | "gstrecon" | "itrecon" | "profitability" | "fpa") => void;
}

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

      <main className="relative z-10">
        <ReelCinematicExperience onSelectTool={onSelectTool} />
      </main>
    </div>
  );
}
