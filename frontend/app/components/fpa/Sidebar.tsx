"use client";

import React from 'react';
import { LayoutGrid, TrendingUp, FileText, ShieldAlert, MessageSquare, Database } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const navItems = [
    { id: 'grid', label: 'Budget Grid', icon: LayoutGrid },
    { id: 'forecast', label: 'ARIMA Forecasting', icon: TrendingUp },
    { id: 'reports', label: 'Financial Reports', icon: FileText },
    { id: 'audit', label: 'Ledger Auditor', icon: ShieldAlert },
    { id: 'chat', label: 'AI CFO Chat', icon: MessageSquare },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col justify-between h-screen sticky top-0">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-primary/20 border border-primary/30 rounded-lg">
            <Database className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight text-white">Local-First</h1>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">FP&A Platform</span>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary/10 border-l-2 border-primary text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-6 border-t border-border bg-[#0f0f1b]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-slow"></div>
          <div>
            <p className="text-xs font-semibold text-gray-200">Local Workstation</p>
            <p className="text-[10px] text-gray-500">Zero Cloud Operational Cost</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
