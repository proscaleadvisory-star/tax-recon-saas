"use client";

import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  FileCheck2, 
  Trash2, 
  CheckCircle, 
  Download, 
  Globe, 
  ArrowUpRight, 
  ExternalLink,
  ChevronRight,
  ClipboardList,
  RefreshCw,
  Eye,
  X
} from "lucide-react";
import { LeakageService, FeeLeakage } from "@/lib/services/leakage-service";

export default function LeakageTab() {
  const [leakages, setLeakages] = useState<FeeLeakage[]>([]);
  const [selectedLeakage, setSelectedLeakage] = useState<FeeLeakage | null>(null);
  const [filterType, setFilterType] = useState<string>("All");
  const [claimPreview, setClaimPreview] = useState<string>("");

  useEffect(() => {
    setLeakages(LeakageService.getLeakagesList());
  }, []);

  const handleStatusUpdate = (id: string, newStatus: FeeLeakage["status"]) => {
    LeakageService.updateLeakageStatus(id, newStatus);
    setLeakages([...LeakageService.getLeakagesList()]);
    if (selectedLeakage && selectedLeakage.id === id) {
      setSelectedLeakage(prev => prev ? { ...prev, status: newStatus } : null);
    }
    alert(`Status updated to ${newStatus.toUpperCase()}`);
  };

  const handleViewClaim = (leakage: FeeLeakage) => {
    setSelectedLeakage(leakage);
    setClaimPreview(LeakageService.getClaimTemplateText(leakage));
  };

  const handleDownloadPacket = (leakage: FeeLeakage) => {
    // Mock ZIP download
    const text = LeakageService.getClaimTemplateText(leakage);
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${leakage.orderId}_Dispute_Packet.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    // Update status to disputed automatically
    if (leakage.status === "detected") {
      handleStatusUpdate(leakage.id, "disputed");
    }
  };

  const totalLeakageAmount = LeakageService.getTotalLeakageAmount();

  const filteredLeakages = leakages.filter(l => {
    return filterType === "All" || l.type === filterType;
  });

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Leakage Audit & Claims Engine</h1>
        <p className="text-slate-400 mt-1">Rule-based commission overcharges, weight mismatches, and damaged returns tracking.</p>
      </div>

      {/* KPI Overviews */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div style={{
          background: "rgba(17, 19, 24, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "20px",
          padding: "20px",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)"
        }}>
          <p className="text-xs font-bold text-slate-500 uppercase">Total Leakage Exposure</p>
          <h3 className="text-2xl font-black text-rose-400 mt-2">
            ₹{totalLeakageAmount.toLocaleString("en-IN")}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Active detected or disputed variances</p>
        </div>

        <div style={{
          background: "rgba(17, 19, 24, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "20px",
          padding: "20px",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)"
        }}>
          <p className="text-xs font-bold text-slate-500 uppercase">Disputed Claims</p>
          <h3 className="text-2xl font-black text-indigo-400 mt-2">
            {leakages.filter(l => l.status === "disputed").length} Files
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Currently filed with marketplaces</p>
        </div>

        <div style={{
          background: "rgba(17, 19, 24, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "20px",
          padding: "20px",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)"
        }}>
          <p className="text-xs font-bold text-slate-500 uppercase">Recovered Cash</p>
          <h3 className="text-2xl font-black text-emerald-400 mt-2">
            ₹{leakages.filter(l => l.status === "recovered").reduce((sum, l) => sum + l.leakageAmount, 0).toLocaleString("en-IN")}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Settled marketplace adjustments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main List */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-lg font-bold text-white">Exception Log</h3>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="premium-select"
            >
              <option value="All">All Anomalies</option>
              <option value="weight_mismatch">Weight Mismatches</option>
              <option value="damaged_return">Damaged Returns</option>
              <option value="commission_overcharge">Commission Errors</option>
              <option value="itc_blocked">Blocked ITC Credit</option>
            </select>
          </div>

          <div style={{
            background: "rgba(17, 19, 24, 0.85)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "24px",
            overflow: "hidden",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)"
          }} className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-900 text-slate-400 font-semibold tracking-wide uppercase text-[10px]">
                  <th className="p-4 pl-6">Reference ID</th>
                  <th className="p-4">Type</th>
                  <th className="p-4 text-right">Variance</th>
                  <th className="p-4">Flagged</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeakages.map((leakage) => {
                  const statusColors: any = {
                    detected: "text-rose-400 bg-rose-500/5 border-rose-500/10",
                    disputed: "text-indigo-400 bg-indigo-500/5 border-indigo-500/10",
                    recovered: "text-emerald-400 bg-emerald-500/5 border-emerald-500/10",
                    write_off: "text-slate-500 bg-slate-800/20 border-slate-800/40"
                  };
                  return (
                    <tr key={leakage.id} className="border-b border-slate-900/60 hover:bg-slate-900/30 transition-all">
                      <td className="p-4 pl-6">
                        <p className="font-bold text-white">{leakage.orderId}</p>
                        <p className="text-[10px] text-slate-500">{leakage.channel} | {leakage.id}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                          {leakage.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-slate-200 font-bold">
                        ₹{leakage.leakageAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 text-slate-500 font-medium">{leakage.dateFlagged}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase ${statusColors[leakage.status]}`}>
                          {leakage.status}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <button 
                          onClick={() => handleViewClaim(leakage)}
                          className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-white transition-colors ml-auto cursor-pointer"
                        >
                          <Eye size={12} /> Claim Portal
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Claim dispute packet compiler */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white">Dispute Desk</h3>
          
          {selectedLeakage ? (
            <div style={{
              background: "rgba(17, 19, 24, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)"
            }} className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white text-sm">Dispute Claim: {selectedLeakage.id}</h4>
                  <p className="text-xs text-slate-500">Order: {selectedLeakage.orderId}</p>
                </div>
                <button 
                  onClick={() => setSelectedLeakage(null)}
                  className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Recovery Form Details */}
              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-900/50 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Expected Value:</span>
                  <span className="text-slate-300 font-mono">₹{selectedLeakage.catalogValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Charged Billed:</span>
                  <span className="text-slate-300 font-mono">₹{selectedLeakage.chargedValue}</span>
                </div>
                <div className="flex justify-between border-t border-slate-900/60 pt-2 font-bold">
                  <span className="text-slate-400">Total Variance:</span>
                  <span className="text-rose-400 font-mono">₹{selectedLeakage.leakageAmount}</span>
                </div>
              </div>

              {/* Claim Body template preview */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Claim Letter Preview</span>
                <textarea
                  readOnly
                  value={claimPreview}
                  className="w-full h-48 bg-slate-950 text-slate-300 font-mono text-[10px] p-3 rounded-xl border border-slate-900 outline-none resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-4 pt-2">
                <button 
                  onClick={() => handleDownloadPacket(selectedLeakage)}
                  className="w-full py-3 premium-btn cursor-pointer"
                >
                  <Download size={13} /> Download Dispute Packet
                </button>

                {selectedLeakage.status === "disputed" && (
                  <div className="grid grid-cols-2 gap-4.5">
                    <button 
                      onClick={() => handleStatusUpdate(selectedLeakage.id, "recovered")}
                      className="py-2.5 premium-btn premium-btn-emerald cursor-pointer"
                    >
                      Mark Recovered
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(selectedLeakage.id, "write_off")}
                      className="py-2.5 premium-btn premium-btn-rose cursor-pointer"
                    >
                      Write-off Lost
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{
              background: "rgba(17, 19, 24, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "24px",
              padding: "48px 24px",
              textAlign: "center",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)"
            }} className="text-slate-500 space-y-4">
              <ClipboardList className="h-10 w-10 mx-auto text-slate-600" />
              <div>
                <p className="text-sm font-semibold text-slate-400">Select an Exception</p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-[200px] mx-auto">Select a transaction leakage record to compile claims packets.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
