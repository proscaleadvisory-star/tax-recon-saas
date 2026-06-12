"use client";

import React, { useState, useEffect } from 'react';
import { api, type GridRow } from './api';
import { Loader2, Check, AlertCircle } from 'lucide-react';

export const BudgetGrid: React.FC = () => {
  const [scenario, setScenario] = useState('Budget');
  const [year, setYear] = useState(2024);
  const [selectedEntity, setSelectedEntity] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');
  
  const [periods, setPeriods] = useState<{ id: string; label: string }[]>([]);
  const [rows, setRows] = useState<GridRow[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [savingCell, setSavingCell] = useState<{ rowIdx: number; colKey: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Input editing state
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colKey: string; val: string } | null>(null);

  const loadGrid = async () => {
    setLoading(true);
    try {
      const data = await api.getGrid(scenario, year);
      setPeriods(data.periods);
      setRows(data.rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrid();
  }, [scenario, year]);

  const handleCellBlur = async (rowIdx: number, colKey: string, currentVal: number) => {
    if (!editingCell) return;
    
    const inputVal = parseFloat(editingCell.val);
    setEditingCell(null);

    if (isNaN(inputVal) || inputVal === currentVal) return;

    setSavingCell({ rowIdx, colKey });
    setSaveStatus('idle');

    try {
      const targetRow = filteredRows[rowIdx];
      await api.saveGridCell(targetRow.account_id, targetRow.dept_id, colKey, scenario, inputVal);
      
      // Update local state
      setRows(prevRows => prevRows.map(r => {
        if (r.account_id === targetRow.account_id && r.dept_id === targetRow.dept_id) {
          return {
            ...r,
            values: { ...r.values, [colKey]: inputVal }
          };
        }
        return r;
      }));
      
      setSaveStatus('success');
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setTimeout(() => {
        setSavingCell(null);
        setSaveStatus('idle');
      }, 1500);
    }
  };

  // Filter rows based on dropdown selections
  const filteredRows = rows.filter(row => {
    const matchesEntity = selectedEntity === 'All' || row.dept_id.startsWith(selectedEntity);
    const matchesDept = selectedDept === 'All' || row.dept_id.toLowerCase().includes(selectedDept.toLowerCase());
    return matchesEntity && matchesDept;
  });

  // Roll up totals for column headers (e.g. total sum of month values)
  const getColTotal = (colKey: string) => {
    return filteredRows.reduce((sum, r) => sum + (r.values[colKey] || 0), 0);
  };

  // Total for single row (e.g., across 12 months)
  const getRowTotal = (row: GridRow) => {
    return Object.values(row.values).reduce((sum, val) => sum + val, 0);
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-gradient-to-br from-[#111723] via-[#0b0e14] to-[#050609] p-6 shadow-[0_22px_90px_rgba(0,0,0,0.34)]">
        <div className="absolute right-[-6rem] top-[-7rem] h-64 w-64 rounded-full bg-cyan-300/10 blur-[90px]" />
        <div className="absolute left-[28%] top-0 h-px w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.28em] text-cyan-100/80">Local-first planning table</p>
          <h2 className="font-display text-3xl font-black uppercase tracking-[-0.03em] text-white sm:text-4xl">Financial Budget Grid</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Direct local grid editor connected to SQLite fact tables, tuned for scanning and precise cell edits.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/24 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.025] p-1">
            <span className="flex items-center px-2 text-xs font-semibold uppercase text-slate-500">Scenario</span>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="premium-select"
            >
              <option value="Budget">Budget</option>
              <option value="Forecast">Forecast</option>
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-white/[0.025] p-1">
            <span className="flex items-center px-2 text-xs font-semibold uppercase text-slate-500">Year</span>
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
      </div>

      {/* Grid Filters */}
      <div className="glass-panel flex flex-wrap items-end gap-4 p-5">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1.5 sm:flex-none">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Entity Rollup</label>
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="w-full premium-select"
          >
            <option value="All">All Entities</option>
            <option value="US">US Operations</option>
            <option value="IN">IN (India)</option>
            <option value="EU">EU (Europe)</option>
            <option value="UK">UK Operations</option>
            <option value="AE">AE (UAE)</option>
          </select>
        </div>

        <div className="flex min-w-[220px] flex-1 flex-col gap-1.5 sm:flex-none">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Department Division</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full premium-select"
          >
            <option value="All">All Departments</option>
            <option value="Sales">Sales</option>
            <option value="Eng">Engineering</option>
            <option value="Mktg">Marketing</option>
            <option value="HR">HR</option>
          </select>
        </div>

        <div className="min-w-[220px] flex-1 flex items-center justify-end pb-1.5">
          {savingCell && (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#121926] px-4 py-2 text-sm text-slate-300">
              {saveStatus === 'idle' && (
                <>
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span>Saving cell change...</span>
                </>
              )}
              {saveStatus === 'success' && (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-400">Saved to database</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span className="text-rose-400">Save failed</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grid Sheet Container */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-gray-400 text-sm">Querying SQLite records...</p>
        </div>
      ) : (
        <div className="glass-panel max-h-[calc(100vh-330px)] overflow-auto rounded-[1.45rem] border-white/10">
          <table className="w-full min-w-[1980px] border-collapse text-left">
            <thead>
              <tr>
                <th className="table-header sticky left-0 z-30 w-[340px] min-w-[340px] bg-[#111827]">Account</th>
                <th className="table-header w-48 min-w-48">Department</th>
                {periods.map((p) => (
                  <th key={p.id} className="table-header w-36 min-w-36 text-right">{p.label}</th>
                ))}
                <th className="table-header w-44 min-w-44 bg-[#162033] text-right">Row Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, rowIdx) => (
                <tr key={`${row.account_id}-${row.dept_id}`} className="hover:bg-cyan-200/[0.035]">
                  <td className="table-cell sticky left-0 z-20 border-r border-white/10 bg-[#0f141d] font-semibold">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="shrink-0 rounded-md bg-cyan-200/10 px-2.5 py-1 font-mono text-xs text-cyan-100">
                        {row.account_code}
                      </span>
                      <span className="min-w-0 truncate text-white">{row.account_name}</span>
                    </div>
                  </td>
                  <td className="table-cell truncate text-slate-400">{row.dept_name}</td>
                  
                  {periods.map(p => {
                    const isCellSaving = savingCell?.rowIdx === rowIdx && savingCell?.colKey === p.id;
                    const isEditing = editingCell?.rowIdx === rowIdx && editingCell?.colKey === p.id;
                    const val = row.values[p.id] || 0.0;
                    
                    return (
                      <td
                        key={p.id}
                        onClick={() => setEditingCell({ rowIdx, colKey: p.id, val: val.toString() })}
                        className={`table-cell cursor-pointer select-none text-right font-mono transition-all duration-150 ${
                          isCellSaving
                            ? 'bg-cyan-200/20 text-white animate-pulse'
                            : isEditing
                            ? 'bg-[#132033]'
                            : 'hover:bg-slate-700/45 hover:text-white'
                        }`}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingCell.val}
                            autoFocus
                            onChange={(e) => setEditingCell({ ...editingCell, val: e.target.value })}
                            onBlur={() => handleCellBlur(rowIdx, p.id, val)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellBlur(rowIdx, p.id, val);
                            }}
                            className="m-0 w-full bg-transparent p-0 text-right font-mono text-sm text-white focus:outline-none focus:ring-0"
                          />
                        ) : (
                          `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        )}
                      </td>
                    );
                  })}

                  {/* Row Total */}
                  <td className="table-cell border-l border-white/10 bg-[#142034]/50 text-right font-mono font-semibold text-emerald-300">
                    {`$${getRowTotal(row).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </td>
                </tr>
              ))}

              {/* Aggregation Summary Row */}
              <tr className="border-t border-cyan-200/20 bg-[#111827] font-bold">
                <td className="table-cell sticky left-0 z-20 border-r border-white/10 bg-[#111827]">Total Consolidated</td>
                <td className="table-cell text-slate-400">Rollup Sum</td>
                {periods.map(p => (
                  <td key={p.id} className="table-cell text-right font-mono text-white">
                    {`$${getColTotal(p.id).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </td>
                ))}
                <td className="table-cell border-l border-white/10 bg-[#142034] text-right font-mono text-emerald-300">
                  {`$${filteredRows.reduce((sum, r) => sum + getRowTotal(r), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
