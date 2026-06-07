"use client";

import { motion } from "framer-motion";
import { 
  FileUp, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck,
  Zap,
  ChevronRight,
  ArrowUpRight,
  TrendingUp as TrendIcon,
  PieChart,
  Download
} from "lucide-react";
import { useEffect, useState } from "react";
import { PersistenceService } from "@/lib/services/persistence-service";
import { ReconRun, AnalyticsSummary } from "@/types/recon";
import Link from "next/link";
import { useRouter } from "next/navigation";


export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [recentRuns, setRecentRuns] = useState<ReconRun[]>([]);
  const router = useRouter();

  useEffect(() => {
    setData(PersistenceService.getAnalyticsSummary());
    setRecentRuns(PersistenceService.getAllRuns().slice(0, 3));
  }, []);

  const hasData = data && recentRuns.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Welcome & Stats */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Welcome Back, Advisor
          </h1>
          <p className="text-slate-400 mt-1">
            {hasData ? `Showing performance for ${recentRuns.length} recent reconciliation runs.` : "Ready to process your first reconciliation."}
          </p>
        </div>
        <div className="text-right hidden md:block">
           <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">System Health</p>
           <p className="text-sm font-bold text-emerald-400">99.9% Operational</p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" style={{ minHeight: "140px" }}>
        <KPICard 
          icon={<CheckCircle2 className="text-emerald-400" />}
          label="Match Efficiency"
          value={hasData ? `${data.overallMatchRate.toFixed(1)}%` : "0%"}
          trend={hasData ? "Average across all runs" : "Pending Data"}
          color="emerald"
        />
        <KPICard 
          icon={<AlertCircle className="text-amber-400" />}
          label="Total Variance"
          value={hasData ? `₹${data.totalVariance.toLocaleString()}` : "₹0"}
          trend={hasData ? "Unmatched tax value" : "Audit Ready"}
          color="amber"
          isUrgent={hasData && data.totalVariance > 0}
        />
        <KPICard 
          icon={<Zap className="text-primary" />}
          label="Cumulative Tax"
          value={hasData ? `₹${(data.totalTaxProcessed / 100000).toFixed(1)}L` : "₹0"}
          trend="Total Processed"
          color="primary"
        />
        <KPICard 
          icon={<TrendIcon className="text-slate-400" />}
          label="Last Run Rows"
          value={hasData ? recentRuns[0].totalRows : "0"}
          trend="Invoices Analyzed"
          color="slate"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Section */}
        <section className="lg:col-span-2 space-y-6">
          <div 
            onClick={() => router.push("/dashboard/recon")}
            className="glass-card rounded-3xl p-10 border-dashed border-2 border-slate-700/50 hover:border-primary/50 transition-all group flex flex-col items-center justify-center text-center cursor-pointer"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl shadow-primary/5">
              <FileUp className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Initialize New Reconciliation</h3>
            <p className="text-slate-400 max-w-sm mb-8 leading-relaxed">
              Upload your Purchase Register and GSTR-2B data to generate World-Class matching reports instantly.
            </p>
            <button className="bg-white text-slate-950 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2 group/btn shadow-lg">
              Start Recon Engine
              <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
          
          {/* Quick Guide */}
          <div className="grid grid-cols-2 gap-6">
            <Link href="/dashboard/analysis" className="glass-card p-6 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-slate-800/30 transition-all cursor-pointer">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Analytics</p>
                <h4 className="font-bold">Visual Analysis</h4>
              </div>
              <PieChart className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
            </Link>
            <div className="glass-card p-6 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-slate-800/30 transition-all">
              <div>
                <p className="text-xs font-bold text-accent uppercase tracking-wider mb-1">Export</p>
                <h4 className="font-bold">Historical CSVs</h4>
              </div>
              <Download className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
            </div>
          </div>
        </section>

        {/* Recent Activity / Side Analytics */}
        <section className="space-y-6">
          <div className="glass-card rounded-3xl p-8 h-full">
            <h3 className="text-xl font-bold mb-6">Recent History</h3>
            <div className="space-y-6">
              {recentRuns.length > 0 ? (
                recentRuns.map((run) => (
                  <ActivityItem 
                    key={run.id}
                    title={run.fileName}
                    status={run.totalRows === run.matchedCount ? "Perfect Match" : "Reviewed"}
                    time={new Date(run.date).toLocaleDateString()}
                    accuracy={`${((run.matchedCount / run.totalRows) * 100).toFixed(1)}%`}
                    isAlert={run.varianceAmount > 1000}
                  />
                ))
              ) : (
                <div className="py-10 text-center text-slate-500">
                   <p className="text-sm">No recent activity detected.</p>
                </div>
              )}
            </div>
            {hasData && (
              <button 
                onClick={() => router.push("/dashboard/history")}
                className="w-full mt-8 py-3 rounded-xl border border-slate-800 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
              >
                View All Records
              </button>
            )}
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
      <div className={`text-xs font-medium ${isUrgent ? "text-amber-400" : "text-slate-500"}`}>{trend}</div>
    </div>
  );
}

function ActivityItem({ title, status, time, accuracy, isAlert }: any) {
  return (
    <div className="flex items-center gap-4 group cursor-pointer">
      <div className={`w-2 h-10 rounded-full ${isAlert ? "bg-red-500" : "bg-slate-800 group-hover:bg-primary"} transition-colors`} />
      <div className="flex-1">
        <h5 className="text-sm font-bold group-hover:text-primary transition-colors">{title}</h5>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-bold uppercase text-slate-500">{status}</span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span className="text-[10px] text-slate-600">{time}</span>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-xs font-bold ${isAlert ? "text-red-400" : "text-slate-300"}`}>{accuracy}</div>
        <div className="text-[10px] text-slate-600 uppercase">Match</div>
      </div>
    </div>
  );
}
