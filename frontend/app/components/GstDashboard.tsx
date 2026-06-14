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
import GstAnalysis from "./gst/analysis/page";
import GstHistory from "./gst/history/page";
import GstSettings from "./gst/settings/page";

interface GstDashboardProps {
  onBackToHub: () => void;
}

type TabType = "overview" | "recon" | "analysis" | "history" | "settings";

export default function GstDashboard({ onBackToHub }: GstDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const tabs = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "recon" as const, label: "Recon Engine", icon: FileCheck2 },
    { id: "analysis" as const, label: "Analysis", icon: BarChart3 },
    { id: "history" as const, label: "History", icon: History },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <div className="enterprise-shell flex flex-col relative z-10 font-sans">
      {/* Header / Nav */}
      <header className="enterprise-topbar">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBackToHub}
            className="enterprise-icon-btn"
            title="Back to Suite Hub"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="enterprise-module-mark">
              <Zap size={16} className="text-indigo-400" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-100">
                GST Reconciliation
              </span>
              <p className="mt-1 text-sm text-slate-400">Purchase register matching, ITC evidence and filing history.</p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="enterprise-tabbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="enterprise-tab"
                data-active={activeTab === tab.id}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="enterprise-status-pill">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow shadow-emerald-500/50 animate-pulse" />
          <span>Local Processor</span>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="enterprise-content flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === "overview" && <GstOverview setActiveTab={setActiveTab} />}
        {activeTab === "recon" && <GstReconEngine />}
        {activeTab === "analysis" && <GstAnalysis setActiveTab={setActiveTab} />}
        {activeTab === "history" && <GstHistory setActiveTab={setActiveTab} />}
        {activeTab === "settings" && <GstSettings />}
      </main>

      <footer className="px-6 py-4 border-t border-slate-900/60 flex items-center justify-between text-[10px] text-slate-500">
        <span>ProScale GST Advisor v1.0</span>
        <span>Local Client Matching (No DB Upload Required)</span>
      </footer>
    </div>
  );
}
