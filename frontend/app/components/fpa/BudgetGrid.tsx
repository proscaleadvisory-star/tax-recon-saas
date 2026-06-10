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
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Financial Budget Grid</h2>
          <p className="text-gray-400 text-sm">Direct local grid editor connected to SQLite fact tables</p>
        </div>

        <div className="flex items-center gap-4 bg-card border border-border p-2 rounded-xl">
          <div className="flex gap-2">
            <span className="text-xs text-gray-500 font-semibold uppercase flex items-center px-2">Scenario</span>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="premium-select"
            >
              <option value="Budget">Budget</option>
              <option value="Forecast">Forecast</option>
            </select>
          </div>

          <div className="flex gap-2 border-l border-border pl-4">
            <span className="text-xs text-gray-500 font-semibold uppercase flex items-center px-2">Year</span>
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

      {/* Grid Filters */}
      <div className="flex flex-wrap gap-6 p-5 glass-panel items-end">
        <div className="flex flex-col gap-1.5 w-52">
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Entity Rollup</label>
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

        <div className="flex flex-col gap-1.5 w-52">
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Department Division</label>
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

        <div className="flex-1 flex items-center justify-end pb-1.5">
          {savingCell && (
            <div className="flex items-center gap-2 bg-[#121226] border border-border px-4 py-2 rounded-lg text-sm text-gray-300">
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
        <div className="glass-panel overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="table-header w-44 sticky left-0 bg-[#151525] z-10">Account</th>
                <th className="table-header w-40">Department</th>
                {periods.map(p => (
                  <th key={p.id} className="table-header text-right w-28">{p.label}</th>
                ))}
                <th className="table-header text-right w-32 bg-[#1b1b30]">Row Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, rowIdx) => (
                <tr key={`${row.account_id}-${row.dept_id}`} className="hover:bg-gray-800/40">
                  <td className="table-cell font-semibold sticky left-0 bg-card z-10 border-r border-border">
                    <span className="text-xs text-primary mr-1 bg-primary/10 px-1 py-0.5 rounded font-mono">
                      {row.account_code}
                    </span>
                    {row.account_name}
                  </td>
                  <td className="table-cell text-gray-400">{row.dept_name}</td>
                  
                  {periods.map(p => {
                    const isCellSaving = savingCell?.rowIdx === rowIdx && savingCell?.colKey === p.id;
                    const isEditing = editingCell?.rowIdx === rowIdx && editingCell?.colKey === p.id;
                    const val = row.values[p.id] || 0.0;
                    
                    return (
                      <td
                        key={p.id}
                        onClick={() => setEditingCell({ rowIdx, colKey: p.id, val: val.toString() })}
                        className={`table-cell text-right cursor-pointer select-none font-mono transition-all duration-150 ${
                          isCellSaving
                            ? 'bg-primary/20 text-white animate-pulse'
                            : isEditing
                            ? 'bg-[#151532]'
                            : 'hover:bg-gray-700/50 hover:text-white'
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
                            className="bg-transparent text-right w-full font-mono text-sm text-white focus:outline-none focus:ring-0 p-0 m-0"
                          />
                        ) : (
                          `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        )}
                      </td>
                    );
                  })}

                  {/* Row Total */}
                  <td className="table-cell text-right font-mono font-semibold bg-[#1b1b30]/40 text-emerald-400 border-l border-border">
                    {`$${getRowTotal(row).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </td>
                </tr>
              ))}

              {/* Aggregation Summary Row */}
              <tr className="bg-[#121225] border-t border-gray-700 font-bold">
                <td className="table-cell sticky left-0 bg-[#121225] z-10 border-r border-border">Total Consolidated</td>
                <td className="table-cell text-gray-400">Rollup Sum</td>
                {periods.map(p => (
                  <td key={p.id} className="table-cell text-right font-mono text-white">
                    {`$${getColTotal(p.id).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </td>
                ))}
                <td className="table-cell text-right font-mono text-emerald-300 bg-[#18182b] border-l border-border">
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
