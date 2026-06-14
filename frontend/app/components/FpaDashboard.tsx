"use client";

import { useState } from "react";
import { Sidebar } from "./fpa/Sidebar";
import { BudgetGrid } from "./fpa/BudgetGrid";
import { ForecastDashboard } from "./fpa/ForecastDashboard";
import { ReportsPanel } from "./fpa/ReportsPanel";
import { AuditConsole } from "./fpa/AuditConsole";
import { ChatPanel } from "./fpa/ChatPanel";
import { Bot } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface FpaDashboardProps {
  user: User;
  onBackToHub: () => void;
}

export default function FpaDashboard({ onBackToHub }: FpaDashboardProps) {
  const [currentTab, setCurrentTab] = useState("grid");

  return (
    <div className="enterprise-shell flex min-h-screen overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} onBackToHub={onBackToHub} />

      {/* Main Panel Content Area */}
      <main className="flex max-h-screen min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="border-b border-white/10 bg-[#05070b]/88 px-5 py-4 backdrop-blur-2xl lg:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="enterprise-module-mark">
                <Bot className="text-cyan-100" size={19} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-100">
                  Virtual CFO OS
                </h1>
                <p className="mt-1 text-xs font-medium text-slate-500">Budget grid, forecasts, reports, audit trails, and CFO chat.</p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-300/18 bg-emerald-300/8 px-3.5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-200">
              Offline Local-First
            </span>
          </div>
        </header>

        <div className="min-w-0 flex-1 p-5 lg:p-7">
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
