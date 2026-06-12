"use client";

import React, { useEffect, useState } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  Activity, 
  AlertTriangle, 
  PieChart as PieChartIcon,
  Download,
  Calendar,
  Zap
} from "lucide-react";
import { PersistenceService } from "@/lib/services/persistence-service";
import { AnalyticsSummary } from "@/types/recon";

export default function AnalysisPage({ setActiveTab }: { setActiveTab?: (tab: "overview" | "recon" | "analysis" | "history" | "settings") => void }) {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [range, setRange] = useState("Last 12 Months");
  const [exportStatus, setExportStatus] = useState("");

  useEffect(() => {
    // Load data from mock persistence
    const summary = PersistenceService.getAnalyticsSummary();
    setData(summary);
  }, []);

  if (!data || data.trendData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-white/5 p-6 rounded-full border border-white/10 mb-6">
          <Activity className="h-12 w-12 text-slate-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">No Analysis Data Yet</h2>
        <p className="text-slate-400 mt-2 max-w-md">Run your first reconciliation to unlock powerful financial insights and compliance trends.</p>
        <button 
          onClick={() => setActiveTab?.('recon')}
          className="premium-btn mt-8 px-8 py-3 cursor-pointer"
        >
          Start First Recon
        </button>
      </div>
    );
  }

  const COLORS = ['#6366f1', '#f59e0b', '#ef4444'];
  const ranges = ["Last 12 Months", "FY 2025-26", "Last Quarter"];

  const handleCycleRange = () => {
    setRange((current) => ranges[(ranges.indexOf(current) + 1) % ranges.length]);
  };

  const handleExportInsights = (format: "json" | "html" = "json") => {
    if (!data) return;

    const payload = {
      generatedAt: new Date().toISOString(),
      reportRange: range,
      summary: data,
      advisoryNotes: [
        "Compliance has improved compared to the prior month.",
        "High-volume vendors should be reviewed for invoice-date mismatches.",
        "Potential unclaimed ITC credits require follow-up with suppliers.",
      ],
    };

    const content =
      format === "html"
        ? `<!doctype html><html><head><meta charset="utf-8"><title>GST Advisory Report</title><style>body{font-family:Inter,Arial,sans-serif;background:#071016;color:#e5eef8;padding:32px}section{border:1px solid #26384a;border-radius:16px;padding:24px;background:#0d1722}h1{color:#a5b4fc}</style></head><body><section><h1>GST Advisory Report</h1><p>Range: ${range}</p><pre>${JSON.stringify(payload, null, 2)}</pre></section></body></html>`
        : JSON.stringify(payload, null, 2);
    const blob = new Blob([content], { type: format === "html" ? "text/html" : "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = format === "html" ? "gst-advisory-report.html" : "gst-insights-report.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportStatus(format === "html" ? "Advisory report downloaded" : "Insights exported");
    window.setTimeout(() => setExportStatus(""), 2600);
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Executive Analysis</h1>
          <p className="text-slate-500 mt-1">Holistic view of GST compliance and financial accuracy.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
           {exportStatus && <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">{exportStatus}</span>}
           <button onClick={handleCycleRange} className="premium-btn border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white px-4 py-2 flex items-center gap-2 text-sm font-medium cursor-pointer">
             <Calendar className="h-4 w-4" /> {range}
           </button>
           <button onClick={() => handleExportInsights("json")} className="premium-btn px-4 py-2 flex items-center gap-2 text-sm font-medium cursor-pointer">
             <Download className="h-4 w-4" /> Export Insights
           </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl group-hover:scale-110 transition-transform">
              <Activity className="h-6 w-6 text-indigo-400" />
            </div>
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">+4.2% ↑</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Total Tax Processed</p>
          <h3 className="text-3xl font-bold text-white mt-1">₹{(data.totalTaxProcessed / 1000000).toFixed(2)}M</h3>
        </div>

        <div className="glass-card p-6 group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">Optimal</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Overall Match Rate</p>
          <h3 className="text-3xl font-bold text-white mt-1">{data.overallMatchRate.toFixed(1)}%</h3>
        </div>

        <div className="glass-card p-6 group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-amber-500/10 rounded-xl group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">Total Variance (Exposure)</p>
          <h3 className="text-3xl font-bold text-white mt-1">₹{data.totalVariance.toLocaleString()}</h3>
        </div>

        <div className="glass-card p-6 group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-rose-500/10 rounded-xl group-hover:scale-110 transition-transform">
              <PieChartIcon className="h-6 w-6 text-rose-400" />
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">Active Vendors</p>
          <h3 className="text-3xl font-bold text-white mt-1">128</h3>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Trend Analysis */}
        <div className="lg:col-span-2 glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white">Matching Consistency Trend</h3>
            <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider">
               <span className="flex items-center gap-1.5 text-indigo-400"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Matched</span>
               <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-full bg-slate-700" /> Unmatched</span>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trendData}>
                <defs>
                  <linearGradient id="colorMatched" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="#475569" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="matched" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorMatched)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="unmatched" 
                  stroke="#334155" 
                  strokeWidth={2}
                  fill="transparent" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Analysis */}
        <div className="glass-card p-8">
          <h3 className="text-xl font-bold text-white mb-8">Efficiency Breakdown</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {data.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 mt-4">
            {data.categoryData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-sm text-slate-400">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Vendor Analysis */}
        <div className="glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white">Top Vendors by GST Volume</h3>
            <button onClick={() => setActiveTab?.("history")} className="text-indigo-400 text-xs font-bold uppercase hover:text-indigo-300 transition-colors">View All</button>
          </div>
          <div className="space-y-6">
            {[
              { name: "Reliance Industries Ltd", amount: "₹8.2M", status: "Compliant" },
              { name: "Tata Consultancy Services", amount: "₹4.1M", status: "Compliant" },
              { name: "Adani Enterprises", amount: "₹3.8M", status: "Mismatch Detected" },
              { name: "HDFC Bank Limited", amount: "₹1.2M", status: "Compliant" }
            ].map((v, i) => (
              <div key={v.name} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-all">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{v.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{v.amount} processed this FY</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${v.status === 'Compliant' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {v.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Insights */}
        <div className="glass-card p-8 bg-indigo-600/5 border-indigo-500/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/30">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">AI Advisory Insights</h3>
          </div>
          <div className="space-y-4">
             <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex gap-4">
                <div className="shrink-0 h-2 w-2 rounded-full bg-indigo-500 mt-2" />
                <p className="text-sm text-slate-300 leading-relaxed">
                  Compliance has improved by <span className="text-indigo-400 font-bold">12%</span> compared to last month. Total tax variance decreased due to better vendor onboarding.
                </p>
             </div>
             <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex gap-4">
                <div className="shrink-0 h-2 w-2 rounded-full bg-amber-500 mt-2" />
                <p className="text-sm text-slate-300 leading-relaxed">
                  <span className="text-amber-400 font-bold">Warning:</span> 3 vendors accounts for 85% of your invoice date mismatches. We recommend contacting these suppliers to align filing dates.
                </p>
             </div>
             <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex gap-4">
                <div className="shrink-0 h-2 w-2 rounded-full bg-emerald-500 mt-2" />
                <p className="text-sm text-slate-300 leading-relaxed">
                  You are eligible for a <span className="text-emerald-400 font-bold">₹1.2M ITC credit</span> that is currently unclaimed due to portal reporting delays.
                </p>
             </div>
          </div>
          <button onClick={() => handleExportInsights("html")} className="w-full mt-6 premium-btn border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white py-3 transition-colors cursor-pointer">
            Download Advisory Report
          </button>
        </div>

      </div>
    </div>
  );
}
