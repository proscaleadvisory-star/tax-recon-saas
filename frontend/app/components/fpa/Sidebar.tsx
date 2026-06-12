"use client";

import React from 'react';
import { LayoutGrid, TrendingUp, FileText, ShieldAlert, MessageSquare, Database, ArrowLeft } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onBackToHub?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, onBackToHub }) => {
  const navItems = [
    { id: 'grid', label: 'Budget Grid', icon: LayoutGrid },
    { id: 'forecast', label: 'ARIMA Forecasting', icon: TrendingUp },
    { id: 'reports', label: 'Financial Reports', icon: FileText },
    { id: 'audit', label: 'Ledger Auditor', icon: ShieldAlert },
    { id: 'chat', label: 'AI CFO Chat', icon: MessageSquare },
  ];

  return (
    <aside className="hidden h-screen w-[18.5rem] shrink-0 flex-col justify-between border-r border-white/10 bg-[#070911]/88 shadow-[18px_0_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl lg:flex">
      <div className="p-5">
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <div className="rounded-2xl border border-cyan-200/20 bg-cyan-200/8 p-2.5">
            <Database className="h-6 w-6 text-cyan-100" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-black uppercase leading-none tracking-[0.08em] text-white">Local-First</h1>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">FP&A Platform</span>
          </div>
        </div>

        <nav className="space-y-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full min-h-12 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-cyan-200/10 border border-cyan-200/24 text-cyan-100 font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                    : 'border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 transition-colors ${isActive ? 'text-cyan-100' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-4 border-t border-white/10 bg-black/18 p-5">
        {onBackToHub && (
          <button 
            onClick={onBackToHub}
            className="metal-button w-full rounded-full px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-200"
          >
            <ArrowLeft size={13} />
            Back to Suite Hub
          </button>
        )}
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_15px_rgba(110,231,183,0.75)]"></div>
          <div>
            <p className="text-xs font-semibold text-slate-200">Local Workstation</p>
            <p className="text-[10px] text-slate-500">Zero Cloud Operational Cost</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
