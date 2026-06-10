"use client";

import React, { useState, useEffect } from 'react';
import { api, type ReportResponse } from './api';
import { Loader2, DollarSign, BookOpen, FileSpreadsheet } from 'lucide-react';

export const ReportsPanel: React.FC = () => {
  const [reportType, setReportType] = useState<'pnl' | 'balancesheet' | 'cashflow'>('pnl');
  const [scenario, setScenario] = useState('Actuals');
  const [year, setYear] = useState(2023);
  const [currency, setCurrency] = useState('USD');
  
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(true);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const rep = await api.getReport(reportType, year, scenario, currency);
      setReport(rep);
      
      const narrRes = await api.getVarianceNarrative();
      setNarrative(narrRes.narrative);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [reportType, scenario, year, currency]);

  // Sum values for a row to render a total column
  const getRowSum = (vals: Record<string, number>) => {
    return Object.values(vals).reduce((sum, v) => sum + v, 0);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Consolidated Financial Reports</h2>
          <p className="text-gray-400 text-sm">Multi-currency translations and rollup reporting logic executed locally</p>
        </div>

        {/* Currency Selector */}
        <div className="flex gap-2 bg-card border border-border p-2 rounded-xl">
          <span className="text-xs text-gray-500 font-semibold uppercase flex items-center px-2">Reporting Currency</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="premium-select"
          >
            <option value="USD">USD ($)</option>
            <option value="INR">INR (₹)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="AED">AED (د.إ)</option>
          </select>
        </div>
      </div>

      {/* Control selectors */}
      <div className="glass-panel p-5 flex flex-wrap gap-6 items-center justify-between">
        <div className="flex flex-wrap gap-5">
          <button
            onClick={() => setReportType('pnl')}
            className={`premium-btn ${
              reportType === 'pnl' 
                ? 'border-primary/45 bg-primary/15 text-primary font-bold shadow-md shadow-primary/5' 
                : 'border-transparent bg-slate-900/30 text-slate-400 hover:border-slate-800 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <FileSpreadsheet className="w-4.5 h-4.5" />
            Profit & Loss
          </button>
          <button
            onClick={() => setReportType('balancesheet')}
            className={`premium-btn ${
              reportType === 'balancesheet' 
                ? 'border-primary/45 bg-primary/15 text-primary font-bold shadow-md shadow-primary/5' 
                : 'border-transparent bg-slate-900/30 text-slate-400 hover:border-slate-800 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <DollarSign className="w-4.5 h-4.5" />
            Balance Sheet
          </button>
          <button
            onClick={() => setReportType('cashflow')}
            className={`premium-btn ${
              reportType === 'cashflow' 
                ? 'border-primary/45 bg-primary/15 text-primary font-bold shadow-md shadow-primary/5' 
                : 'border-transparent bg-slate-900/30 text-slate-400 hover:border-slate-800 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BookOpen className="w-4.5 h-4.5" />
            Cash Flow
          </button>
        </div>

        <div className="h-6 w-px bg-border hidden lg:block"></div>

        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase">Scenario</span>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="premium-select"
            >
              <option value="Actuals">Actuals</option>
              <option value="Budget">Budget</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase">Year</span>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="premium-select"
            >
              <option value={2023}>2023</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main report grid */}
        <div className="xl:col-span-2 glass-panel p-6 overflow-x-auto min-h-96 flex flex-col justify-between">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 flex-1">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
              <p className="text-gray-400 text-sm">Compiling consolidation rollups...</p>
            </div>
          ) : report ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header w-48 sticky left-0 bg-[#151525] z-10">Line Item</th>
                  {report.periods.map(p => (
                    <th key={p.id} className="table-header text-right w-24">{p.label.split(' ')[0]}</th>
                  ))}
                  <th className="table-header text-right w-28 bg-[#1a1a2e]">Year Total</th>
                </tr>
              </thead>
              <tbody>
                {report.nodes.map((node, nIdx) => {
                  const isTotal = node.is_total;
                  return (
                    <tr 
                      key={nIdx} 
                      className={`hover:bg-gray-800/20 border-b border-border/40 ${
                        isTotal ? 'font-bold bg-[#1b1b30]/10 text-white' : 'text-gray-300'
                      }`}
                    >
                      <td className={`table-cell sticky left-0 z-10 border-r border-border/40 ${
                        isTotal ? 'bg-[#15152a]' : 'bg-card pl-6'
                      }`}>
                        {node.name}
                      </td>
                      {report.periods.map(p => (
                        <td key={p.id} className="table-cell text-right font-mono text-xs">
                          {node.values[p.id]?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                        </td>
                      ))}
                      <td className={`table-cell text-right font-mono text-xs border-l border-border/40 ${
                        isTotal ? 'text-emerald-400 font-bold bg-[#1d1d32]/30' : 'text-gray-400'
                      }`}>
                        {getRowSum(node.values).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-400 text-sm">Report failed to compile.</p>
          )}
        </div>

        {/* Narrative sidebar */}
        <div className="glass-panel p-6 flex flex-col">
          <h3 className="font-semibold text-white mb-4 border-b border-border pb-3">Automated Variance Report</h3>
          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1">
              <Loader2 className="w-6 h-6 text-primary animate-spin mb-4" />
            </div>
          ) : (
            <div className="text-sm text-gray-300 overflow-y-auto leading-relaxed max-h-[500px] pr-2 space-y-4 prose prose-invert">
              {narrative.split('\n').map((line, idx) => {
                if (line.startsWith('###')) {
                  return <h4 key={idx} className="font-bold text-white text-base mt-4 mb-2">{line.replace('###', '').trim()}</h4>;
                }
                if (line.startsWith('**')) {
                  return <p key={idx} className="font-semibold text-white">{line.replace(/\*\*/g, '').trim()}</p>;
                }
                if (line.startsWith('-')) {
                  return <li key={idx} className="list-none pl-4 border-l border-primary/30 my-1">{line.replace('-', '').trim()}</li>;
                }
                return <p key={idx} className="my-1.5">{line}</p>;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
