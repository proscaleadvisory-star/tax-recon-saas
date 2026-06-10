"use client";

import React, { useState, useEffect } from 'react';
import { api, type Account, type Department, type ForecastPoint } from './api';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, Sparkles, TrendingUp } from 'lucide-react';

export const ForecastDashboard: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
  
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [runningForecast, setRunningForecast] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  const loadMeta = async () => {
    setLoadingMeta(true);
    try {
      const meta = await api.getMeta();
      // Only keep leaves (accounts with parent_id != null)
      const leafAccounts = meta.accounts.filter(a => a.parent_id !== null);
      setAccounts(leafAccounts);
      setDepartments(meta.departments);
      
      if (leafAccounts.length > 0) setSelectedAccount(leafAccounts[0].id);
      if (meta.departments.length > 0) setSelectedDept(meta.departments[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMeta(false);
    }
  };

  const loadChartData = async () => {
    if (!selectedAccount || !selectedDept) return;
    
    try {
      // 1. Get 2023 Actuals + 2024 Budget for comparison
      const actGrid = await api.getGrid('Actuals', 2023);
      const budGrid = await api.getGrid('Budget', 2024);
      
      const actRow = actGrid.rows.find(r => r.account_id === selectedAccount && r.dept_id === selectedDept);
      const budRow = budGrid.rows.find(r => r.account_id === selectedAccount && r.dept_id === selectedDept);
      
      // We also fetch any existing forecast
      // We will merge them into a single timeline: 2023-01 to 2024-12 (24 months)
      const timeline: any[] = [];
      
      // Months 1-12 of 2023 (Actuals)
      actGrid.periods.forEach(p => {
        timeline.push({
          period_id: p.id,
          label: p.label,
          actual: actRow?.values[p.id] || 0.0,
          budget: 0.0,
          forecast: null,
          lower: null,
          upper: null
        });
      });
      
      // Months 1-12 of 2024 (Budget + Forecast if exists)
      budGrid.periods.forEach(p => {
        const matchingForecast = forecastData.find(f => f.period_id === p.id);
        timeline.push({
          period_id: p.id,
          label: p.label,
          actual: null,
          budget: budRow?.values[p.id] || 0.0,
          forecast: matchingForecast ? matchingForecast.amount : null,
          lower: matchingForecast ? matchingForecast.lower : null,
          upper: matchingForecast ? matchingForecast.upper : null
        });
      });
      
      setChartData(timeline);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadChartData();
  }, [selectedAccount, selectedDept, forecastData]);

  const handleRunForecast = async () => {
    if (!selectedAccount || !selectedDept) return;
    
    setRunningForecast(true);
    try {
      const res = await api.runForecast(selectedAccount, selectedDept);
      setForecastData(res.forecast);
    } catch (e) {
      console.error(e);
    } finally {
      setRunningForecast(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Loading dimension filters...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">ARIMA Forecast Command Center</h2>
        <p className="text-gray-400 text-sm">Fit statsmodels ARIMA models locally and forecast future periods with confidence bands</p>
      </div>

      {/* Selectors and trigger button */}
      <div className="glass-panel p-6 flex flex-wrap gap-6 items-end">
        <div className="flex flex-col gap-1.5 w-72">
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Select GL Account</label>
          <select
            value={selectedAccount}
            onChange={(e) => {
              setSelectedAccount(e.target.value);
              setForecastData([]); // Reset forecast line on change
            }}
            className="w-full premium-select"
          >
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 w-72">
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Select Department</label>
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setForecastData([]); // Reset forecast line on change
            }}
            className="w-full premium-select"
          >
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleRunForecast}
          disabled={runningForecast}
          className="bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.99]"
        >
          {runningForecast ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Fitting ARIMA Order...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
              <span>Generate ARIMA Forecast</span>
            </>
          )}
        </button>
      </div>

      {/* Forecasting Composed Chart */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-white">Consolidated Variance & Projection Timeline</h3>
        </div>

        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="ciColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f33" />
              <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} />
              <YAxis
                stroke="#9ca3af"
                fontSize={11}
                tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#12121e', borderColor: '#1f1f33', borderRadius: '8px' }}
                labelStyle={{ fontWeight: 'bold', color: '#fff' }}
              />
              <Legend verticalAlign="top" height={36} />
              
              {/* Confidence Interval Band */}
              <Area
                name="95% Confidence Band"
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="url(#ciColor)"
                connectNulls
              />
              <Area
                name="lower_ci_bound"
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="none"
                connectNulls
                legendType="none"
              />
              
              {/* 2023 Actuals Line */}
              <Line
                name="2023 Actuals (Consolidated)"
                type="monotone"
                dataKey="actual"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
              
              {/* 2024 Budget Line */}
              <Line
                name="2024 Baseline Budget"
                type="monotone"
                dataKey="budget"
                stroke="#d97706"
                strokeWidth={2}
                strokeDasharray="5 5"
                connectNulls
              />

              {/* 2024 ARIMA Forecast Line */}
              {forecastData.length > 0 && (
                <Line
                  name="ARIMA Forecast (Local ML)"
                  type="monotone"
                  dataKey="forecast"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 text-xs text-gray-500 bg-[#0f0f1b] border border-border p-4 rounded-lg flex items-center justify-between">
          <p>
            💡 <strong>Forecast Engine Behavior</strong>: Select any leaf GL account and department. Click generate to query the SQLite 2023 actuals, run auto-order ARIMA fit on the local CPU, write the prediction vectors to SQLite, and update this composed chart.
          </p>
          <div className="flex gap-2">
            <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 font-mono">ARIMA(p,d,q)</span>
            <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20 font-mono">95% Conf Band</span>
          </div>
        </div>
      </div>
    </div>
  );
};
