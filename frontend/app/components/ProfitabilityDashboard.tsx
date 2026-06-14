"use client";

import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  LayoutDashboard, 
  TrendingUp, 
  Zap, 
  BarChart3, 
  ShieldCheck, 
  HelpCircle, 
  FileText, 
  Clock, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  TrendingDown,
  RefreshCw
} from "lucide-react";
import { ProfitabilityService } from "@/lib/services/profitability-service";
import { ForecastService } from "@/lib/services/forecast-service";
import { LeakageService } from "@/lib/services/leakage-service";

// Import existing tabs
import ProfitabilityTab from "./gst/profitability/page";
import ForecastTab from "./gst/forecast/page";
import LeakageTab from "./gst/leakage/page";

interface ProfitabilityDashboardProps {
  onBackToHub: () => void;
}

type TabType = "overview" | "margins" | "forecast" | "leakage";

export default function ProfitabilityDashboard({ onBackToHub }: ProfitabilityDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const tabs = [
    { id: "overview" as const, label: "Cockpit", icon: LayoutDashboard },
    { id: "margins" as const, label: "SKU Margins", icon: TrendingUp },
    { id: "forecast" as const, label: "Cash Forecast", icon: Zap },
    { id: "leakage" as const, label: "Leakage & Claims", icon: BarChart3 },
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
            <div className="enterprise-module-mark border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-100">
                Profitability & Cash Flow
              </span>
              <p className="mt-1 text-sm text-slate-400">SKU margin, runway, leakage and claims control.</p>
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
        {activeTab === "overview" && <ProfitabilityOverview setActiveTab={setActiveTab} />}
        {activeTab === "margins" && <ProfitabilityTab />}
        {activeTab === "forecast" && <ForecastTab />}
        {activeTab === "leakage" && <LeakageTab />}
      </main>

      <footer className="px-6 py-4 border-t border-slate-900/60 flex items-center justify-between text-[10px] text-slate-500">
        <span>ProScale Profitability Command Center v1.0</span>
        <span>Local Client Metrics (No DB Upload Required)</span>
      </footer>
    </div>
  );
}

function ProfitabilityOverview({ setActiveTab }: { setActiveTab: (tab: TabType) => void }) {
  const [totals, setTotals] = useState({
    profitability: 0,
    variance: 0,
    runwayDays: 0,
    blockedItc: 0,
    totalReturnsShipping: 0
  });

  useEffect(() => {
    // 1. Calculate active leakages
    const variance = LeakageService.getTotalLeakageAmount();
    
    // 2. Fetch lockup amounts
    const wc = ForecastService.getWorkingCapitalLockup();
    
    // 3. Estimate runway days from forecast (finding date where balance runs low)
    const forecastData = ForecastService.generate90DayForecast({
      returnRateChange: 0,
      adSpendChange: 0,
      vendorDelayDays: 0,
      payoutDelayDays: 0
    });
    
    const lowIndex = forecastData.findIndex(p => p.balance < 50000);
    const runwayDays = lowIndex === -1 ? 90 : lowIndex;

    // 4. Calculate total return shipping cost from SKUs
    const skus = ProfitabilityService.getSkuProfitabilityList();
    const totalReturnsShipping = skus.reduce((sum, s) => sum + (s.returnRate * s.returnShippingCost * s.unitsSold), 0);

    setTotals({
      profitability: 1246000 + 712500 + 462000 + 212750, // total net profit from channel matrix
      variance,
      runwayDays,
      blockedItc: wc.blockedItc,
      totalReturnsShipping
    });
  }, []);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-16">
      {/* Welcome & Stats */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tight">
            Advisor Financial Cockpit
          </h1>
          <p className="text-slate-400 mt-1">
            Real-time profitability tracking, deterministic cash runways, and tax compliance impact.
          </p>
        </div>
        <div className="text-right hidden md:block">
           <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recon Status</p>
           <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 justify-end">
             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow shadow-emerald-500/50 animate-pulse" />
             99.9% Operational
           </p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" style={{ minHeight: "140px" }}>
        <KPICard 
          icon={<CheckCircle2 className="text-emerald-400" />}
          label="Net Profit (CM2)"
          value={`₹${(totals.profitability / 100000).toFixed(1)}L`}
          trend="Cumulative across channels"
          color="emerald"
        />
        <KPICard 
          icon={<AlertCircle className="text-rose-400" />}
          label="Profit Leakage"
          value={`₹${totals.variance.toLocaleString("en-IN")}`}
          trend="Discrepancies detected"
          color="amber"
          isUrgent={totals.variance > 0}
        />
        <KPICard 
          icon={<Zap className="text-primary" />}
          label="Cash Flow Runway"
          value={`${totals.runwayDays} Days`}
          trend="Projected bank balances"
          color="primary"
          isUrgent={totals.runwayDays < 30}
        />
        <KPICard 
          icon={<FileText className="text-slate-400" />}
          label="Blocked Working Capital"
          value={`₹${totals.blockedItc.toLocaleString("en-IN")}`}
          trend="Unfiled vendor GSTR-2B"
          color="slate"
        />
      </div>

      {/* Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Predefined Decision Cards */}
        <section className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-white">Rule-Based Business Insights</h3>
          
          <div className="grid grid-cols-1 gap-4">
            
            <InsightCard 
              type="danger"
              title="SKU Margin Loss Alert: High Return Logistics Drag"
              description={`Mug-Ceramic product sets are generating negative margins (-3.17% / unit) due to heavy return shipping fees. Returns logistics costs currently account for ₹${(totals.totalReturnsShipping / 10).toFixed(0)} of apparel sales margins.`}
              actionText="Review SKU Specs"
              onClick={() => setActiveTab("margins")}
            />

            <InsightCard 
              type="warning"
              title="Input Tax Credit (ITC) Blocked: Missing Supplier Filings"
              description={`Vendor 'Alpha Logistics' (GSTIN: 27AALPA0981M1ZN) has failed to upload invoices to GSTR-2B. This blocks ₹${totals.blockedItc.toLocaleString("en-IN")} in tax credits for GSTR-3B filings next week.`}
              actionText="Export Invoice Reminder"
              onClick={() => setActiveTab("leakage")}
            />

            <InsightCard 
              type="success"
              title="Claim Recovery Ready: Weight Overcharges Detected"
              description={`Rule checks flagged 2 weight mismatch disputes on Delhivery shipments (totaling ₹${totals.variance.toLocaleString("en-IN")}). The dispute letters and package packing photo sheets are pre-compiled.`}
              actionText="File Disputes"
              onClick={() => setActiveTab("leakage")}
            />

            <InsightCard 
              type="info"
              title="Compliance Cash Calendar Reminder"
              description="Your GSTR-3B filing payment obligation of ₹1,84,000 is due on the 20th. Cash balance predictions indicate the bank account will remain stable at ₹5.1L post-outflow."
              actionText="View Cash Runway"
              onClick={() => setActiveTab("forecast")}
            />

          </div>
        </section>

        {/* Right: Channel Breakdown */}
        <section className="space-y-6">
          <div 
            style={{
              background: "rgba(17, 19, 24, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)"
            }}
            className="space-y-6"
          >
            <h3 className="text-lg font-bold text-white border-b border-slate-900/60 pb-3">Channel Net Performance</h3>
            <div className="space-y-4">
              {[
                { name: "Amazon IN", profit: "₹12.46L", rate: "+31.5%", isLoss: false },
                { name: "Flipkart", profit: "₹7.12L", rate: "+26.8%", isLoss: false },
                { name: "Meesho", profit: "₹4.62L", rate: "+13.5%", isLoss: false },
                { name: "Shopify Store", profit: "₹2.12L", rate: "+14.2%", isLoss: false }
              ].map((c) => (
                <div key={c.name} className="flex justify-between items-center p-3 bg-slate-950/40 rounded-xl border border-slate-900/50">
                  <div>
                    <span className="text-xs font-bold text-white">{c.name}</span>
                    <p className="text-[10px] text-slate-500 font-medium">Net Profit Margin</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-200 font-mono">{c.profit}</span>
                    <p className="text-[10px] text-emerald-400 font-mono font-bold">{c.rate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

function KPICard({ icon, label, value, trend, color, isUrgent }: any) {
  const glowColorMap: any = {
    emerald: "rgba(52, 211, 153, 0.05)",
    amber: "rgba(251, 191, 36, 0.05)",
    primary: "rgba(129, 140, 248, 0.05)",
    slate: "rgba(148, 163, 184, 0.05)"
  };

  return (
    <div 
      style={{
        background: "rgba(17, 19, 24, 0.85)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "24px",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.3s ease",
        minHeight: "140px",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)"
      }}
      className="hover:border-indigo-500/30 hover:-translate-y-1 transition-all group"
    >
      <div 
        style={{
          position: "absolute",
          top: "-30px",
          right: "-30px",
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          background: glowColorMap[color] || "rgba(255, 255, 255, 0.02)",
          filter: "blur(15px)",
          pointerEvents: "none"
        }}
      />
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
          {icon}
        </div>
        <span className="text-sm font-medium text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-bold mb-1 text-white">{value}</div>
      <div className={`text-xs font-medium ${isUrgent ? "text-rose-400 font-bold" : "text-slate-500"}`}>{trend}</div>
    </div>
  );
}

function InsightCard({ type, title, description, actionText, onClick }: { type: "danger" | "warning" | "success" | "info"; title: string; description: string; actionText: string; onClick: () => void }) {
  const borderColors: any = {
    danger: "border-rose-500/20 bg-rose-500/[0.02]",
    warning: "border-amber-500/20 bg-amber-500/[0.02]",
    success: "border-emerald-500/20 bg-emerald-500/[0.02]",
    info: "border-indigo-500/20 bg-indigo-500/[0.02]"
  };

  const indicatorColors: any = {
    danger: "bg-rose-500",
    warning: "bg-amber-500",
    success: "bg-emerald-500",
    info: "bg-indigo-500"
  };

  return (
    <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${borderColors[type]} transition-all hover:scale-[1.005]`}>
      <div className="flex gap-3 items-start flex-1">
        <div className={`shrink-0 w-2.5 h-2.5 rounded-full mt-1.5 ${indicatorColors[type]}`} />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-white tracking-wide">{title}</h4>
          <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
        </div>
      </div>
      <button 
        onClick={onClick}
        className="shrink-0 premium-btn py-2 px-4 cursor-pointer"
      >
        {actionText} <ArrowRight size={12} />
      </button>
    </div>
  );
}
