"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileUp, 
  CheckCircle2, 
  ArrowRight, 
  Play, 
  Download, 
  AlertCircle,
  Table as TableIcon,
  RefreshCcw,
  Zap,
  Info
} from "lucide-react";
import { ReconEngine, normNum, taxWithinTol } from "@/lib/engine/recon-engine";
import { normGst } from "@/lib/engine/normalization";
import { PersistenceService } from "@/lib/services/persistence-service";
import { ExportUtil } from "@/lib/services/export-util";
import { ExcelService, SheetData } from "@/lib/services/excel-service";

type Step = "upload" | "map" | "recon" | "results";



export default function ReconPage() {
  const [step, setStep] = useState<Step>("upload");
  const [prFile, setPrFile] = useState<File | null>(null);
  const [g2bFile, setG2bFile] = useState<File | null>(null);
  const [prData, setPrData] = useState<SheetData | null>(null);
  const [g2bData, setG2bData] = useState<SheetData | null>(null);
  const [mapping, setMapping] = useState<{ pr: any; g2b: any }>({ pr: null, g2b: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // --------------------------------------------------------------------------
  // Step 1: Upload
  // --------------------------------------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "pr" | "g2b") => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await ExcelService.readExcelFile(file);
      if (type === "pr") {
        setPrFile(file);
        setPrData(data);
      } else {
        setG2bFile(file);
        setG2bData(data);
      }
    } catch (err) {
      alert("Error reading file. Please ensure it's a valid Excel format.");
    }
  };

  const startMapping = () => {
    if (!prData || !g2bData) return;
    const prMap = ExcelService.mapHeaders(prData.headers);
    const g2bMap = ExcelService.mapHeaders(g2bData.headers);
    setMapping({ pr: prMap, g2b: g2bMap });
    setStep("map");
  };

  // --------------------------------------------------------------------------
  // Step 2: Reconciliation Logic (Ported from GAS)
  // --------------------------------------------------------------------------
  const runReconciliation = async () => {
    setIsProcessing(true);
    setStep("recon");

    setTimeout(() => {
      if (!prData || !g2bData || !mapping.pr || !mapping.g2b) return;

      const finalResults: any[] = [];
      const matchedSet = new Set<number>();
      let stats = {
        totalRows: 0,
        matched: 0,
        taxMismatch: 0,
        missingIn2B: 0,
        totalTaxAmount: 0,
        variance: 0
      };

      // Index 2B data by GST
      const gstIndex: any = {};
      g2bData.rawRows.slice(1).forEach((row, idx) => {
        const gstNorm = normGst(row[mapping.g2b.gst]);
        if (!gstIndex[gstNorm]) gstIndex[gstNorm] = [];
        gstIndex[gstNorm].push({ 
          rec: { sheetRow: idx + 2, values: row, obj: row }, // raw row object
          idx 
        });
      });

      // Simple Loop across PR rows
      prData.rawRows.slice(1).forEach((prRow) => {
        const prGstNorm = normGst(prRow[mapping.pr.gst]);
        const prTax = normNum(prRow[mapping.pr.totalTax]) || 0;
        stats.totalRows++;
        stats.totalTaxAmount += prTax;

        const candidates = (gstIndex[prGstNorm] || []).filter((x: any) => !matchedSet.has(x.rec.sheetRow));

        let outStatus = "Invoice not in 2B";
        let outKey = "";
        let matchedGrec = null;

        // Try Key 1 (GST + Fuzzy + 2% Tax)
        if (candidates.length) {
          const pick = ReconEngine.selectBestCandidate(prRow, mapping.pr, candidates, mapping.g2b, { taxTol: 0.02 });
          if (pick.best && pick.best.invRes.matched && pick.best.taxWithin) {
            outStatus = "Matched";
            outKey = "Key 1";
            matchedGrec = pick.best.rec;
            matchedSet.add(matchedGrec.sheetRow);
            stats.matched++;
          } else if (pick.best) {
            // Secondary checks (Tax mismatch etc)
            if (pick.best.invRes.matched && !pick.best.taxWithin) {
              outStatus = "Unmatched - Tax Mismatch";
              outKey = "Key 1";
              matchedGrec = pick.best.rec;
              stats.taxMismatch++;
              stats.variance += Math.abs(prTax - (normNum(matchedGrec.values[mapping.g2b.totalTax]) || 0));
            }
          }
        }

        if (outStatus === "Invoice not in 2B") stats.missingIn2B++;

        finalResults.push({
          status: outStatus,
          key: outKey,
          pr: prRow,
          g2b: matchedGrec?.values || null
        });
      });

      // Automatically Save to Persistence
      PersistenceService.saveRun({
        fileName: prFile?.name || "Unknown File",
        totalRows: stats.totalRows,
        matchedCount: stats.matched,
        taxMismatchCount: stats.taxMismatch,
        missingIn2BCount: stats.missingIn2B,
        totalTaxAmount: stats.totalTaxAmount,
        varianceAmount: stats.variance,
        data: finalResults,
        headers: { pr: prData.headers, g2b: g2bData.headers },
        mapping: mapping
      });


      setResults(finalResults);

      setIsProcessing(false);
      setStep("results");
    }, 1500); // Simulate processing time for UX
  };

  const downloadReport = async () => {
    if (!prFile || !results || !mapping.pr || !mapping.g2b || !prData || !g2bData) return;
    await ExportUtil.exportReconToExcel(
      prFile.name,
      results,
      mapping,
      prData.headers,
      g2bData.headers
    );
  };


  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="text-indigo-400 h-6 w-6" />
            GST Reconciliation Engine
          </h1>
          <p className="text-slate-400 mt-1">Cross-check Purchase Register against GSTR-2B with Big 4 precision.</p>
        </div>
        
        <div className="flex gap-2">
           <div className={`px-4 py-2 rounded-full text-xs font-semibold ${step === 'upload' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>1. Upload</div>
           <div className={`px-4 py-2 rounded-full text-xs font-semibold ${step === 'map' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>2. Map</div>
           <div className={`px-4 py-2 rounded-full text-xs font-semibold ${step === 'results' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>3. Execute</div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: UPLOAD */}
        {step === "upload" && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* PR Upload */}
            <div className="glass-card p-8 group cursor-pointer border-dashed border-2 hover:border-indigo-500/50 transition-all text-center">
              <input type="file" id="pr-input" className="hidden" onChange={(e) => handleFileUpload(e, "pr")} />
              <label htmlFor="pr-input" className="cursor-pointer">
                <div className="bg-indigo-500/10 p-4 rounded-xl inline-block mb-4 group-hover:scale-110 transition-transform">
                  <FileUp className="h-10 w-10 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Purchase Register</h3>
                <p className="text-slate-400 mt-2">Upload your internal purchase register (Excel/CSV)</p>
                {prFile && <div className="mt-4 text-emerald-400 flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4" /> {prFile.name}</div>}
              </label>
            </div>

            {/* 2B Upload */}
            <div className="glass-card p-8 group cursor-pointer border-dashed border-2 hover:border-emerald-500/50 transition-all text-center">
              <input type="file" id="g2b-input" className="hidden" onChange={(e) => handleFileUpload(e, "g2b")} />
              <label htmlFor="g2b-input" className="cursor-pointer">
                <div className="bg-emerald-500/10 p-4 rounded-xl inline-block mb-4 group-hover:scale-110 transition-transform">
                  <TableIcon className="h-10 w-10 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">GSTR-2B Data</h3>
                <p className="text-slate-400 mt-2">Upload the data exported from GST Portal</p>
                {g2bFile && <div className="mt-4 text-emerald-400 flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4" /> {g2bFile.name}</div>}
              </label>
            </div>

            <div className="md:col-span-2 flex justify-center mt-6">
              <button 
                onClick={startMapping}
                disabled={!prFile || !g2bFile}
                className="premium-btn px-10 py-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                Continue to Mapping <ArrowRight className="h-4.5 w-4.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: MAPPING */}
        {step === "map" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="glass-card p-8 border-indigo-500/30">
              <div className="flex items-center gap-3 mb-6">
                <Info className="text-indigo-400 h-6 w-6" />
                <h2 className="text-xl font-bold text-white">Verify Column Mapping</h2>
              </div>
              <p className="text-slate-400 mb-8">We've automatically detected these columns. Please confirm they are correct.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">PR Column Mapping</h3>
                  {Object.entries(mapping.pr).map(([field, index]: any) => (
                    <div key={field} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-white capitalize font-medium">{field}</span>
                      <span className="text-indigo-400 text-sm">{index !== -1 ? prData?.headers[index] : "Not Found"}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">2B Column Mapping</h3>
                  {Object.entries(mapping.g2b).map(([field, index]: any) => (
                    <div key={field} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-white capitalize font-medium">{field}</span>
                      <span className="text-emerald-400 text-sm">{index !== -1 ? g2bData?.headers[index] : "Not Found"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-12 flex justify-center gap-6">
                <button onClick={() => setStep("upload")} className="premium-btn border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white px-8 py-3 transition-colors">Go Back</button>
                <button onClick={runReconciliation} className="premium-btn px-12 py-3 flex items-center gap-2">
                  <Play className="h-4 w-4" /> Run Reconciliation
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: RECON/PROCESSING */}
        {step === "recon" && (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCcw className="h-20 w-20 text-indigo-500 animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-white">Aggregating Records...</h2>
            <p className="text-slate-400 mt-2">Running K1 through K6 matching sequences on {prData?.rows.length} records.</p>
          </div>
        )}

        {/* STEP 4: RESULTS */}
        {step === "results" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-card p-6 border-emerald-500/20">
                <p className="text-slate-400 text-sm">Matched</p>
                <h4 className="text-3xl font-bold text-emerald-400 mt-1">{results.filter(r => r.status === 'Matched').length}</h4>
              </div>
              <div className="glass-card p-6 border-amber-500/20">
                <p className="text-slate-400 text-sm">Tax Mismatch</p>
                <h4 className="text-3xl font-bold text-amber-500 mt-1">{results.filter(r => r.status.includes('Tax')).length}</h4>
              </div>
              <div className="glass-card p-6 border-indigo-500/20">
                <p className="text-slate-400 text-sm">Invoice Missing</p>
                <h4 className="text-3xl font-bold text-indigo-400 mt-1">{results.filter(r => r.status.includes('Missing')).length}</h4>
              </div>
              <div className="glass-card p-6 border-rose-500/20">
                <p className="text-slate-400 text-sm">Not in 2B</p>
                <h4 className="text-3xl font-bold text-rose-400 mt-1">{results.filter(r => r.status.includes('Not in 2B')).length}</h4>
              </div>
            </div>

            {/* Results Table */}
            <div className="glass-card overflow-hidden">
               <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Detailed Reconciliation Report</h3>
                    <p className="text-xs text-slate-400 mt-1">Data saved to your local cloud history / Analysis tab</p>
                  </div>
                  <div className="flex gap-4.5">
                    <button className="premium-btn px-5 py-2.5">
                      Archive Run
                    </button>
                    <button 
                      onClick={downloadReport}
                      className="premium-btn px-5 py-2.5 flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" /> Export Report
                    </button>
                  </div>

               </div>

               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-white/5">
                       <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                       <th className="p-4 text-xs font-bold text-slate-500 uppercase">Key</th>
                       <th className="p-4 text-xs font-bold text-slate-500 uppercase">PR Invoice</th>
                       <th className="p-4 text-xs font-bold text-slate-500 uppercase">PR GSTIN</th>
                       <th className="p-4 text-xs font-bold text-slate-500 uppercase">PR Amount</th>
                       <th className="p-4 text-xs font-bold text-slate-500 uppercase">2B Amount</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {results.slice(0, 50).map((res, i) => (
                       <tr key={i} className="hover:bg-white/5 transition-colors">
                         <td className="p-4">
                           <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                             res.status === 'Matched' ? 'bg-emerald-500/10 text-emerald-400' :
                             res.status.includes('Missing') ? 'bg-amber-500/10 text-amber-400' :
                             'bg-rose-500/10 text-rose-400'
                           }`}>
                             {res.status}
                           </span>
                         </td>
                         <td className="p-4 text-slate-400 text-sm">{res.key || "-"}</td>
                         <td className="p-4 text-white font-medium text-sm">{res.pr[mapping.pr.invoice]}</td>
                         <td className="p-4 text-slate-300 text-sm font-mono">{res.pr[mapping.pr.gst]}</td>
                         <td className="p-4 text-white text-sm">₹{Number(res.pr[mapping.pr.totalTax] || 0).toLocaleString()}</td>
                         <td className="p-4 text-emerald-400 text-sm italic">
                           {res.g2b ? `₹${Number(res.g2b[mapping.g2b.totalTax] || 0).toLocaleString()}` : "-"}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               {results.length > 50 && (
                 <div className="p-4 text-center bg-white/5 border-t border-white/10">
                   <p className="text-slate-500 text-sm">Showing first 50 of {results.length} records. Download the report for full details.</p>
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
