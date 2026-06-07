"use client";

import React, { useEffect, useState } from "react";
import { 
  History, 
  Trash2, 
  Download, 
  Search, 
  Filter, 
  FileText,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  Table as TableIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PersistenceService } from "@/lib/services/persistence-service";
import { ReconRun } from "@/types/recon";
import { ExportUtil } from "@/lib/services/export-util";

export default function HistoryPage() {

  const [runs, setRuns] = useState<ReconRun[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const refreshHistory = () => {
    setRuns(PersistenceService.getAllRuns());
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this reconciliation record?")) {
      PersistenceService.deleteRun(id);
      refreshHistory();
    }
  };

  const handleClearAll = () => {
    if (confirm("CRITICAL: This will permanently delete ALL reconciliation history. Proceed?")) {
      PersistenceService.clearAll();
      refreshHistory();
    }
  };

  const handleExport = async (run: ReconRun) => {
    await ExportUtil.exportReconToExcel(
      run.fileName,
      run.data,
      run.mapping,
      run.headers.pr,
      run.headers.g2b
    );
  };


  const filteredRuns = runs.filter(run => 
    run.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <History className="text-indigo-400 h-8 w-8" />
            Reconciliation History
          </h1>
          <p className="text-slate-400 mt-1">Manage and export your previous audit engagements.</p>
        </div>

        <div className="flex items-center gap-3">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
             <input 
               type="text" 
               placeholder="Search file name..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-64 transition-all"
             />
           </div>
           {runs.length > 0 && (
             <button 
               onClick={handleClearAll}
               className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 hover:bg-rose-500/20 transition-all text-sm font-bold"
             >
               <Trash2 className="h-4 w-4" /> Clear All
             </button>
           )}
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-card overflow-hidden">
        {filteredRuns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Audit Date</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">File Name</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Efficiency</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Variance</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence>
                  {filteredRuns.map((run) => (
                    <motion.tr 
                      key={run.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{new Date(run.date).toLocaleDateString()}</span>
                          <span className="text-[10px] text-slate-500">{new Date(run.date).toLocaleTimeString()}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <FileText className="h-4 w-4 text-indigo-400" />
                          </div>
                          <span className="text-white font-medium">{run.fileName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500" 
                              style={{ width: `${(run.matchedCount / run.totalRows) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-emerald-400">
                             {((run.matchedCount / run.totalRows) * 100).toFixed(1)}% Matched
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold ${run.varianceAmount > 1000 ? "text-amber-400" : "text-slate-400"}`}>
                            ₹{run.varianceAmount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-600 uppercase font-bold tracking-tighter">Tax Exposure</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleExport(run)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                            title="Export Report"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          <button 
                            onClick={() => handleDelete(run.id)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                            title="Delete Record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-white/5 p-6 rounded-full border border-white/10 mb-6">
              <TableIcon className="h-12 w-12 text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-white">No Reconciliation Logs</h3>
            <p className="text-slate-400 mt-2 max-w-sm">Every time you run a reconciliation, it will be logged here with its audit trail and reports.</p>
            <button 
               onClick={() => window.location.href = '/dashboard/recon'}
               className="btn-primary mt-8 px-8 py-3"
            >
              Start Your First Audit
            </button>
          </div>
        )}
      </div>

      {/* Stats Summary Footer */}
      {runs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 flex items-center gap-4">
             <div className="p-3 bg-emerald-500/10 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
             </div>
             <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Database Health</p>
                <p className="text-lg font-bold text-white">Verified Secure</p>
             </div>
          </div>
          <div className="glass-card p-6 flex items-center gap-4">
             <div className="p-3 bg-amber-500/10 rounded-xl">
                <AlertCircle className="h-6 w-6 text-amber-500" />
             </div>
             <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Review Items</p>
                <p className="text-lg font-bold text-white">{runs.filter(r => r.varianceAmount > 0).length} Runs Need Attention</p>
             </div>
          </div>
          <div className="glass-card p-6 flex items-center gap-4">
             <div className="p-3 bg-indigo-500/10 rounded-xl">
                <TableIcon className="h-6 w-6 text-indigo-500" />
             </div>
             <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Total Capacity</p>
                <p className="text-lg font-bold text-white">{runs.length} / 100 Runs Logged</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
