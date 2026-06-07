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
  Bot
} from "lucide-react";

interface HubPageProps {
  user: User;
  onSelectTool: (tool: "taxrecon" | "gstrecon") => void;
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
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-6 py-12 flex flex-col justify-center items-center">
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
            Select one of our specialized enterprise modules below to reconcile e-commerce payouts or run general client GSTR-2B audits.
          </p>
        </div>

        {/* Modules Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Card 1: TaxRecon OS */}
          <div 
            onClick={() => onSelectTool("taxrecon")}
            className="group relative rounded-3xl border border-slate-800 bg-[#0d0f14]/60 backdrop-blur-xl p-8 cursor-pointer overflow-hidden transition-all hover:border-emerald-500/50 hover:shadow-[0_0_50px_rgba(52,211,153,0.1)] hover:-translate-y-1.5 duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-500" />
            
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
              <Shield size={28} className="text-emerald-400" />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-100 mb-3 group-hover:text-emerald-300 transition-colors">
              TaxRecon OS
            </h2>
            
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Match payment settlements against purchase ledgers, track SKU net profit margins, see geographic heatmaps, and claim marketplace recovery disputes.
            </p>

            <ul className="space-y-3.5 mb-8">
              <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                <span>Bulk upload sales & payouts registers</span>
              </li>
              <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                <span>Auto-detect tax and shipping variance</span>
              </li>
              <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                <span>State-wise heatmaps & inventory run rates</span>
              </li>
            </ul>

            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest group-hover:translate-x-1.5 transition-transform duration-300">
              Launch TaxRecon
              <ArrowRight size={14} />
            </div>
          </div>

          {/* Card 2: GST Reconciliation Engine */}
          <div 
            onClick={() => onSelectTool("gstrecon")}
            className="group relative rounded-3xl border border-slate-800 bg-[#0d0f14]/60 backdrop-blur-xl p-8 cursor-pointer overflow-hidden transition-all hover:border-indigo-500/50 hover:shadow-[0_0_50px_rgba(129,140,248,0.1)] hover:-translate-y-1.5 duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-500" />

            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
              <Zap size={26} className="text-indigo-400" />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-100 mb-3 group-hover:text-indigo-300 transition-colors">
              GST Recon Engine
            </h2>
            
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Cross-check Purchase Registers (PR) against GSTR-2B data with fuzzy matching keys, variance audits, and client-side Excel report downloads.
            </p>

            <ul className="space-y-3.5 mb-8">
              <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                <CheckCircle size={14} className="text-indigo-400 flex-shrink-0" />
                <span>Upload Excel registers locally in browser</span>
              </li>
              <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                <CheckCircle size={14} className="text-indigo-400 flex-shrink-0" />
                <span>Run K1 to K6 matching filters in JS</span>
              </li>
              <li className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                <CheckCircle size={14} className="text-indigo-400 flex-shrink-0" />
                <span>Export detailed reconciliation Excel audits</span>
              </li>
            </ul>

            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest group-hover:translate-x-1.5 transition-transform duration-300">
              Launch GST Engine
              <ArrowRight size={14} />
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
