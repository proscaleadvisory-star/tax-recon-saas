"use client";

import React from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { 
  Shield, 
  Sparkles, 
  LogOut, 
  ArrowRight, 
  Zap,
  Bot,
  Scale,
  TrendingUp
} from "lucide-react";

interface HubPageProps {
  user: User;
  onSelectTool: (tool: "taxrecon" | "gstrecon" | "itrecon" | "profitability" | "fpa") => void;
}

export default function HubPage({ user, onSelectTool }: HubPageProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="relative min-h-screen bg-[#06070a] text-slate-100 flex flex-col justify-between overflow-x-hidden">
      {/* Background Neon Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] left-[40%] w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-[1600px] mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles size={18} className="text-slate-950 font-bold" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-200 via-slate-100 to-emerald-200 bg-clip-text text-transparent">
            ProScale Suite
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs text-slate-400 font-medium">Logged in as</span>
            <span className="text-xs text-indigo-300 font-mono font-semibold">{user.email}</span>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Grid Portal */}
      <main className="relative z-10 flex-1 w-full max-w-[1600px] mx-auto px-6 sm:px-10 py-12 flex flex-col justify-center items-center">
        <div className="text-center mb-12 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-indigo-300 text-xs font-semibold tracking-wider uppercase mb-6 shadow-inner">
            <Bot size={13} className="animate-pulse" />
            <span>AI-Powered Suite v3.0</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none mb-6">
            Unlock Financial & Tax <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Operations at Scale
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Select one of our specialized enterprise modules below to reconcile e-commerce payouts, track SKU margin leakages, or run tax audits.
          </p>
        </div>

        {/* Modules Cards Row: Flex-nowrap with horizontal scroll on mobile/tablet, standard grid on desktop */}
        <div className="flex flex-row gap-6 w-full mt-4 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory lg:grid lg:grid-cols-5 lg:overflow-x-visible lg:pb-0 lg:gap-5 xl:gap-6 no-scrollbar">
          
          {/* Card 1: Ecommerce Reconciliation & Tracking Tool */}
          <div 
            onClick={() => onSelectTool("taxrecon")}
            className="group relative rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0e1017] to-[#06070a] p-6 cursor-pointer overflow-hidden transition-all duration-300 hover:border-emerald-500/50 hover:shadow-[0_0_35px_rgba(52,211,153,0.08)] hover:-translate-y-1.5 flex flex-col justify-between h-full w-[280px] sm:w-[320px] lg:w-auto flex-shrink-0 snap-start"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-500" />
            
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Shield size={20} className="text-emerald-400" />
              </div>

              <h2 className="text-sm sm:text-base font-extrabold text-slate-100 mb-2.5 group-hover:text-emerald-300 transition-colors leading-tight">
                Ecommerce Reconciliation & Tracking Tool
              </h2>
              
              <p className="text-[11px] text-slate-400 mb-5 leading-relaxed">
                Match payment settlements against purchase ledgers, track SKU margins, see heatmaps, and claim disputes.
              </p>
            </div>

            <div>
              {/* Capability Badges */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 text-emerald-400/90 uppercase tracking-wider">
                  Registers
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 text-emerald-400/90 uppercase tracking-wider">
                  Tax Variance
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 text-emerald-400/90 uppercase tracking-wider">
                  Heatmaps
                </span>
              </div>

              <div className="pt-3 border-t border-slate-900/60">
                <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-emerald-500/20 hover:border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer">
                  Launch Ecommerce Recon
                  <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: GST Reconciliation Engine */}
          <div 
            onClick={() => onSelectTool("gstrecon")}
            className="group relative rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0e1017] to-[#06070a] p-6 cursor-pointer overflow-hidden transition-all duration-300 hover:border-indigo-500/50 hover:shadow-[0_0_35px_rgba(129,140,248,0.08)] hover:-translate-y-1.5 flex flex-col justify-between h-full w-[280px] sm:w-[320px] lg:w-auto flex-shrink-0 snap-start"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-500" />

            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Zap size={18} className="text-indigo-400" />
              </div>

              <h2 className="text-sm sm:text-base font-extrabold text-slate-100 mb-2.5 group-hover:text-indigo-300 transition-colors leading-tight">
                GST Recon Engine
              </h2>
              
              <p className="text-[11px] text-slate-400 mb-5 leading-relaxed">
                Cross-check purchase registers against GSTR-2B data with fuzzy matching keys and export report audits.
              </p>
            </div>

            <div>
              {/* Capability Badges */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 text-indigo-400/90 uppercase tracking-wider">
                  Excel Ingest
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 text-indigo-400/90 uppercase tracking-wider">
                  Fuzzy Match
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 text-indigo-400/90 uppercase tracking-wider">
                  Audits
                </span>
              </div>

              <div className="pt-3 border-t border-slate-900/60">
                <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-indigo-500/20 hover:border-indigo-500/50 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 hover:text-indigo-300 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer">
                  Launch GST Engine
                  <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Profitability & Cash Flow Command Center */}
          <div 
            onClick={() => onSelectTool("profitability")}
            className="group relative rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0e1017] to-[#06070a] p-6 cursor-pointer overflow-hidden transition-all duration-300 hover:border-emerald-500/50 hover:shadow-[0_0_35px_rgba(52,211,153,0.08)] hover:-translate-y-1.5 flex flex-col justify-between h-full w-[280px] sm:w-[320px] lg:w-auto flex-shrink-0 snap-start"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-500" />

            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp size={18} className="text-emerald-400" />
              </div>

              <h2 className="text-sm sm:text-base font-extrabold text-slate-100 mb-2.5 group-hover:text-emerald-300 transition-colors leading-tight">
                Profit Cockpit
              </h2>
              
              <p className="text-[11px] text-slate-400 mb-5 leading-relaxed">
                Track SKU profitability, simulate 90-day cash runways, and auto-flag weight and return leakages.
              </p>
            </div>

            <div>
              {/* Capability Badges */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 text-emerald-400/90 uppercase tracking-wider">
                  COGS Tracker
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 text-emerald-400/90 uppercase tracking-wider">
                  Runways
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 text-emerald-400/90 uppercase tracking-wider">
                  Disputes
                </span>
              </div>

              <div className="pt-3 border-t border-slate-900/60">
                <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-emerald-500/20 hover:border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer">
                  Launch Cockpit
                  <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Income Tax (26AS) Reconciliation */}
          <div 
            onClick={() => onSelectTool("itrecon")}
            className="group relative rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0e1017] to-[#06070a] p-6 cursor-pointer overflow-hidden transition-all duration-300 hover:border-purple-500/50 hover:shadow-[0_0_35px_rgba(168,85,247,0.08)] hover:-translate-y-1.5 flex flex-col justify-between h-full w-[280px] sm:w-[320px] lg:w-auto flex-shrink-0 snap-start"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-500" />

            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Scale size={18} className="text-purple-400" />
              </div>

              <h2 className="text-sm sm:text-base font-extrabold text-slate-100 mb-2.5 group-hover:text-purple-300 transition-colors leading-tight">
                Direct Tax Recon
              </h2>
              
              <p className="text-[11px] text-slate-400 mb-5 leading-relaxed">
                Reconcile Form 26AS/AIS/TIS credits against payroll Form 16 and bank statements.
              </p>
            </div>

            <div>
              {/* Capability Badges */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 text-purple-400/90 uppercase tracking-wider">
                  AIS/26AS
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 text-purple-400/90 uppercase tracking-wider">
                  Form 16
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 text-purple-400/90 uppercase tracking-wider">
                  Prefill
                </span>
              </div>

              <div className="pt-3 border-t border-slate-900/60">
                <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-purple-500/20 hover:border-purple-500/50 bg-purple-500/5 hover:bg-purple-500/10 text-purple-400 hover:text-purple-300 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer">
                  Launch Direct Tax
                  <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 5: Virtual CFO & FP&A */}
          <div 
            onClick={() => onSelectTool("fpa")}
            className="group relative rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0e1017] to-[#06070a] p-6 cursor-pointer overflow-hidden transition-all duration-300 hover:border-indigo-500/50 hover:shadow-[0_0_35px_rgba(129,140,248,0.08)] hover:-translate-y-1.5 flex flex-col justify-between h-full w-[280px] sm:w-[320px] lg:w-auto flex-shrink-0 snap-start"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-500" />
            
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Bot size={18} className="text-indigo-400" />
              </div>

              <h2 className="text-sm sm:text-base font-extrabold text-slate-100 mb-2.5 group-hover:text-indigo-300 transition-colors leading-tight">
                Virtual CFO & FP&A
              </h2>
              
              <p className="text-[11px] text-slate-400 mb-5 leading-relaxed">
                Build scenario models, run ARIMA forecasts, and consult your Virtual CFO chatbot locally.
              </p>
            </div>

            <div>
              {/* Capability Badges */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 text-indigo-400/90 uppercase tracking-wider">
                  Consolidations
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 text-indigo-400/90 uppercase tracking-wider">
                  ARIMA
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 text-indigo-400/90 uppercase tracking-wider">
                  AI Chat
                </span>
              </div>

              <div className="pt-3 border-t border-slate-900/60">
                <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-indigo-500/20 hover:border-indigo-500/50 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 hover:text-indigo-300 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer">
                  Launch FP&A OS
                  <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-[1600px] mx-auto px-6 sm:px-10 py-6 border-t border-slate-900/60 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
        <span>© 2026 ProScale Advisory Services Ltd. All rights reserved.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:underline">System Status</a>
          <a href="#" className="hover:underline">Documentation</a>
          <a href="#" className="hover:underline">Support</a>
        </div>
      </footer>
    </div>
  );
}
