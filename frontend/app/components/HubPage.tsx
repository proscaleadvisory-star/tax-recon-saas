"use client";

import React from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { 
  Shield, 
  Sparkles, 
  LogOut, 
  ArrowRight, 
  CheckCircle,
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
    <div className="relative min-h-screen bg-[#06070a] text-slate-100 flex flex-col justify-between overflow-hidden">
      {/* Background Neon Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] left-[40%] w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all active:scale-95"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Grid Portal */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-12 flex flex-col justify-center items-center">
        <div className="text-center mb-16 max-w-2xl">
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

        {/* Modules Cards */}
        <div className="flex flex-wrap justify-center gap-8 w-full max-w-[1600px] mt-10">
          {/* Card 1: Ecommerce Reconciliation & Tracking Tool */}
          <div 
            onClick={() => onSelectTool("taxrecon")}
            className="group relative rounded-3xl border border-slate-800/80 bg-[#0d0f14]/70 backdrop-blur-xl p-8 cursor-pointer overflow-hidden transition-all duration-300 hover:border-emerald-500/50 hover:shadow-[0_0_50px_rgba(52,211,153,0.15)] hover:-translate-y-1.5 flex flex-col justify-between w-full sm:w-[300px] md:w-[325px] min-h-[520px]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-500" />
            
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield size={24} className="text-emerald-400" />
              </div>

              <h2 className="text-xl font-extrabold text-slate-100 mb-3 group-hover:text-emerald-300 transition-colors leading-tight">
                Ecommerce Reconciliation & Tracking Tool
              </h2>
              
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Match payment settlements against purchase ledgers, track SKU net profit margins, see geographic heatmaps, and claim marketplace recovery disputes.
              </p>

              <ul className="space-y-2.5">
                <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                  <span>Bulk upload sales registers</span>
                </li>
                <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                  <span>Auto-detect tax variance</span>
                </li>
                <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                  <span>State-wise sales heatmaps</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-900/40">
              <button className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/25 active:scale-95 cursor-pointer">
                Launch Ecommerce Recon
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 2: GST Reconciliation Engine */}
          <div 
            onClick={() => onSelectTool("gstrecon")}
            className="group relative rounded-3xl border border-slate-800/80 bg-[#0d0f14]/70 backdrop-blur-xl p-8 cursor-pointer overflow-hidden transition-all duration-300 hover:border-indigo-500/50 hover:shadow-[0_0_50px_rgba(129,140,248,0.15)] hover:-translate-y-1.5 flex flex-col justify-between w-full sm:w-[300px] md:w-[325px] min-h-[520px]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-500" />

            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap size={22} className="text-indigo-400" />
              </div>

              <h2 className="text-xl font-extrabold text-slate-100 mb-3 group-hover:text-indigo-300 transition-colors leading-tight">
                GST Recon Engine
              </h2>
              
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Cross-check Purchase Registers (PR) against GSTR-2B data with fuzzy matching keys, variance audits, and client-side Excel report downloads.
              </p>

              <ul className="space-y-2.5">
                <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <CheckCircle size={12} className="text-indigo-400 flex-shrink-0" />
                  <span>Local Excel upload in browser</span>
                </li>
                <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <CheckCircle size={12} className="text-indigo-400 flex-shrink-0" />
                  <span>Run K1 to K6 matching filters</span>
                </li>
                <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <CheckCircle size={12} className="text-indigo-400 flex-shrink-0" />
                  <span>Export Excel reconciliation audits</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-900/40">
              <button className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/25 active:scale-95 cursor-pointer">
                Launch GST Engine
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 3: Profitability & Cash Flow Command Center */}
          <div 
            onClick={() => onSelectTool("profitability")}
            className="group relative rounded-3xl border border-slate-800/80 bg-[#0d0f14]/70 backdrop-blur-xl p-8 cursor-pointer overflow-hidden transition-all duration-300 hover:border-emerald-500/50 hover:shadow-[0_0_50px_rgba(52,211,153,0.15)] hover:-translate-y-1.5 flex flex-col justify-between w-full sm:w-[300px] md:w-[325px] min-h-[520px]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-500" />

            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp size={22} className="text-emerald-400" />
              </div>

              <h2 className="text-xl font-extrabold text-slate-100 mb-3 group-hover:text-emerald-300 transition-colors leading-tight">
                Profit Cockpit
              </h2>
              
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Track CM2 SKU profitability, simulate 90-day cash runways with compliance deadlines, and auto-flag weight and return leakages.
              </p>

              <ul className="space-y-2.5">
                <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                  <span>Analyze item-level COGS and returns</span>
                </li>
                <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                  <span>Deterministic cash runway simulator</span>
                </li>
                <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                  <span>Generate pre-compiled dispute packets</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-900/40">
              <button className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/25 active:scale-95 cursor-pointer">
                Launch Cockpit
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 4: Income Tax (26AS) Reconciliation */}
          <div 
            onClick={() => onSelectTool("itrecon")}
            className="group relative rounded-3xl border border-slate-800/80 bg-[#0d0f14]/70 backdrop-blur-xl p-8 cursor-pointer overflow-hidden transition-all duration-300 hover:border-purple-500/50 hover:shadow-[0_0_50px_rgba(168,85,247,0.15)] hover:-translate-y-1.5 flex flex-col justify-between w-full sm:w-[300px] md:w-[325px] min-h-[520px]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-500" />

            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Scale size={22} className="text-purple-400" />
              </div>

              <h2 className="text-xl font-extrabold text-slate-100 mb-3 group-hover:text-purple-300 transition-colors leading-tight">
                Direct Tax Recon
              </h2>
              
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Reconcile Form 26AS/AIS/TIS tax credits against payroll Form 16, bank statements, and tax return claims with rules-based matching.
              </p>

              <ul className="space-y-2.5">
                <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <CheckCircle size={12} className="text-purple-400 flex-shrink-0" />
                  <span>Ingest AIS/26AS/Form 16/Bank Statements</span>
                </li>
                <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <CheckCircle size={12} className="text-purple-400 flex-shrink-0" />
                  <span>Auto-detect timing lags and head mismatches</span>
                </li>
                <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <CheckCircle size={12} className="text-purple-400 flex-shrink-0" />
                  <span>Export audit evidence packs & ITR prefill</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-900/40">
              <button className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md shadow-purple-500/10 hover:shadow-purple-500/25 active:scale-95 cursor-pointer">
                Launch Direct Tax
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 5: Virtual CFO & FP&A */}
          <div 
            onClick={() => onSelectTool("fpa")}
            className="group relative rounded-3xl border border-slate-800/80 bg-[#0d0f14]/70 backdrop-blur-xl p-8 cursor-pointer overflow-hidden transition-all duration-300 hover:border-indigo-500/50 hover:shadow-[0_0_50px_rgba(129,140,248,0.15)] hover:-translate-y-1.5 flex flex-col justify-between w-full sm:w-[300px] md:w-[325px] min-h-[520px]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-500" />
            
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Bot size={22} className="text-indigo-400" />
              </div>

              <h2 className="text-xl font-extrabold text-slate-100 mb-3 group-hover:text-indigo-300 transition-colors leading-tight">
                Virtual CFO & FP&A
              </h2>
              
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Build multi-currency scenario models, run ARIMA forecasts, audit budget anomalies with Isolation Forests, and consult your Virtual CFO.
              </p>

              <ul className="space-y-2.5">
                <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <CheckCircle size={12} className="text-indigo-400 flex-shrink-0" />
                  <span>Multi-currency consolidations</span>
                </li>
                <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <CheckCircle size={12} className="text-indigo-400 flex-shrink-0" />
                  <span>Linear regression forecasts</span>
                </li>
                <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                  <CheckCircle size={12} className="text-indigo-400 flex-shrink-0" />
                  <span>AI Chatbot consulting</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-900/40">
              <button className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/25 active:scale-95 cursor-pointer">
                Launch FP&A OS
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 border-t border-slate-900/60 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
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
