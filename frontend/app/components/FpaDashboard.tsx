"use client";

import { useState } from "react";
import { Sidebar } from "./fpa/Sidebar";
import { BudgetGrid } from "./fpa/BudgetGrid";
import { ForecastDashboard } from "./fpa/ForecastDashboard";
import { ReportsPanel } from "./fpa/ReportsPanel";
import { AuditConsole } from "./fpa/AuditConsole";
import { ChatPanel } from "./fpa/ChatPanel";
import { Bot, ArrowLeft } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface FpaDashboardProps {
  user: User;
  onBackToHub: () => void;
}

export default function FpaDashboard({ user, onBackToHub }: FpaDashboardProps) {
  const [currentTab, setCurrentTab] = useState("grid");

  return (
    <div className="flex bg-[#07080b] min-h-screen text-slate-100 font-sans overflow-hidden">
      {/* Sidebar Navigation & Back Button */}
      <div className="flex flex-col border-r border-slate-900">
        <div className="flex-1">
          <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
        </div>
        
        {/* Back to Suite Hub Button */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/20">
          <button 
            onClick={onBackToHub}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-all hover:border-slate-700 active:scale-95 cursor-pointer"
          >
            <ArrowLeft size={13} />
            Back to Suite Hub
          </button>
        </div>
      </div>

      {/* Main Panel Content Area */}
      <main className="flex-1 overflow-y-auto max-h-screen flex flex-col">
        <header className="h-16 border-b border-slate-900 bg-slate-950/40 backdrop-blur px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="text-indigo-400" size={20} />
            <h1 className="text-sm sm:text-base font-black tracking-tight bg-gradient-to-r from-slate-100 to-indigo-300 bg-clip-text text-transparent">
              ProScale CFO Console
            </h1>
            <span className="text-[9px] bg-indigo-500/10 text-indigo-300 px-2.5 py-0.5 rounded-full font-bold border border-indigo-500/20 tracking-wide uppercase">
              Offline Local-First
            </span>
          </div>
        </header>

        <div className="p-6 sm:p-8 flex-1">
          {currentTab === "grid" && <BudgetGrid />}
          {currentTab === "forecast" && <ForecastDashboard />}
          {currentTab === "reports" && <ReportsPanel />}
          {currentTab === "audit" && <AuditConsole />}
          {currentTab === "chat" && <ChatPanel />}
        </div>
      </main>
    </div>
  );
}
