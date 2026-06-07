"use client";

import React, { useState } from "react";
import { 
  ArrowLeft, 
  LayoutDashboard, 
  FileCheck2, 
  History, 
  BarChart3, 
  Settings, 
  Zap,
  TrendingUp
} from "lucide-react";
import GstOverview from "./gst/page";
import GstReconEngine from "./gst/recon/page";
import GstHistory from "./gst/history/page";
import GstSettings from "./gst/settings/page";
import ProfitabilityTab from "./gst/profitability/page";
import ForecastTab from "./gst/forecast/page";
import LeakageTab from "./gst/leakage/page";

interface GstDashboardProps {
  onBackToHub: () => void;
}

type TabType = "overview" | "recon" | "profitability" | "forecast" | "leakage" | "history" | "settings";

export default function GstDashboard({ onBackToHub }: GstDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  return (
    <div className="min-h-screen flex flex-col relative z-10 bg-[#07080a] text-slate-100 font-sans">
      {/* Header / Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-900/60 bg-[#07080a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBackToHub}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all active:scale-95 cursor-pointer"
            title="Back to Suite Hub"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Zap size={16} className="text-indigo-400" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                GST Reconciliation
              </span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-1 bg-slate-950/80 border border-slate-900/60 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "overview" 
                ? "bg-slate-900 text-indigo-400 border border-slate-800 shadow" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutDashboard size={13} /> Cockpit
          </button>
          <button
            onClick={() => setActiveTab("recon")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "recon" 
                ? "bg-slate-900 text-indigo-400 border border-slate-800 shadow" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileCheck2 size={13} /> Recon Engine
          </button>
          <button
            onClick={() => setActiveTab("profitability")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "profitability" 
                ? "bg-slate-900 text-indigo-400 border border-slate-800 shadow" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp size={13} /> SKU Margins
          </button>
          <button
            onClick={() => setActiveTab("forecast")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "forecast" 
                ? "bg-slate-900 text-indigo-400 border border-slate-800 shadow" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap size={13} /> Cash Forecast
          </button>
          <button
            onClick={() => setActiveTab("leakage")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "leakage" 
                ? "bg-slate-900 text-indigo-400 border border-slate-800 shadow" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 size={13} /> Leakage & Claims
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "history" 
                ? "bg-slate-900 text-indigo-400 border border-slate-800 shadow" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <History size={13} /> Log History
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "settings" 
                ? "bg-slate-900 text-indigo-400 border border-slate-800 shadow" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Settings size={13} /> Settings
          </button>
        </div>

        <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow shadow-emerald-500/50 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Local Processor</span>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {activeTab === "overview" && <GstOverview />}
        {activeTab === "recon" && <GstReconEngine />}
        {activeTab === "profitability" && <ProfitabilityTab />}
        {activeTab === "forecast" && <ForecastTab />}
        {activeTab === "leakage" && <LeakageTab />}
        {activeTab === "history" && <GstHistory />}
        {activeTab === "settings" && <GstSettings />}
      </main>

      <footer className="px-6 py-4 border-t border-slate-900/60 flex items-center justify-between text-[10px] text-slate-500">
        <span>ProScale GST Advisor v1.0</span>
        <span>Local Client Matching (No DB Upload Required)</span>
      </footer>
    </div>
  );
}
