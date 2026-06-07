"use client";

import React, { useState, useEffect } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  Calendar, 
  Sliders, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ShieldAlert, 
  Play, 
  Calculator,
  Lock,
  ArrowRight
} from "lucide-react";
import { ForecastService, CashForecastPoint, ScenarioConfig } from "@/lib/services/forecast-service";

export default function ForecastTab() {
  const [scenario, setScenario] = useState<ScenarioConfig>({
    returnRateChange: 0,
    adSpendChange: 0,
    vendorDelayDays: 0,
    payoutDelayDays: 0
  });

  const [forecast, setForecast] = useState<CashForecastPoint[]>([]);
  const [lockups, setLockups] = useState<any>({
    slowMovingStock: 0,
    returnsInTransit: 0,
    pendingReimbursements: 0,
    blockedItc: 0
  });

  useEffect(() => {
    setForecast(ForecastService.generate90DayForecast(scenario));
    setLockups(ForecastService.getWorkingCapitalLockup());
  }, [scenario]);

  const handleScenarioChange = (key: keyof ScenarioConfig, val: number) => {
    setScenario(prev => ({
      ...prev,
      [key]: val
    }));
  };

  // Find lowest balance date in the projected forecast
  const lowestPoint = forecast.reduce((min, p) => p.balance < min.balance ? p : min, forecast[0] || { date: "N/A", balance: 0 });
  const projectedBalanceEnd = forecast[forecast.length - 1]?.balance || 0;
  
  // Calculate warning state if runway is short
  const isRunwayShort = lowestPoint.balance < 50000;

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Working Capital & Runway Forecast</h1>
        <p className="text-slate-400 mt-1">Rule-based cash flow predictions and risk scenario planning.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Runway Configuration Console */}
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
            <div className="flex items-center gap-2 pb-4 border-b border-slate-900/60">
              <Sliders className="text-indigo-400 h-5 w-5" />
              <h3 className="text-lg font-bold text-white">Scenario Console</h3>
            </div>

            {/* Slider 1: Returns Rate */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Return Rate Variance</span>
                <span className="text-indigo-400 font-mono font-bold">
                  {scenario.returnRateChange >= 0 ? "+" : ""}{(scenario.returnRateChange * 100).toFixed(0)}%
                </span>
              </div>
              <input 
                type="range" 
                min="-15" 
                max="25" 
                value={scenario.returnRateChange * 100} 
                onChange={(e) => handleScenarioChange("returnRateChange", parseInt(e.target.value) / 100)}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[10px] text-slate-500">Models shifts in COD returns rate and return logistics fees.</p>
            </div>

            {/* Slider 2: Ad Spend */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Ad Spend Scaling</span>
                <span className="text-indigo-400 font-mono font-bold">
                  {scenario.adSpendChange >= 0 ? "+" : ""}{(scenario.adSpendChange * 100).toFixed(0)}%
                </span>
              </div>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                value={scenario.adSpendChange * 100} 
                onChange={(e) => handleScenarioChange("adSpendChange", parseInt(e.target.value) / 100)}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[10px] text-slate-500">Models effect of raising or lowering digital ad spend levels.</p>
            </div>

            {/* Slider 3: Payout Delays */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Payout Settlement Delay</span>
                <span className="text-indigo-400 font-mono font-bold">{scenario.payoutDelayDays} Days</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="15" 
                value={scenario.payoutDelayDays} 
                onChange={(e) => handleScenarioChange("payoutDelayDays", parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[10px] text-slate-500">Models payout holdups from marketplaces.</p>
            </div>

            {/* Slider 4: Vendor Delay */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Vendor Payment Term extension</span>
                <span className="text-indigo-400 font-mono font-bold">{scenario.vendorDelayDays} Days</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="30" 
                value={scenario.vendorDelayDays} 
                onChange={(e) => handleScenarioChange("vendorDelayDays", parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[10px] text-slate-500">Models delaying raw materials cash outflow.</p>
            </div>

            <button 
              onClick={() => setScenario({ returnRateChange: 0, adSpendChange: 0, vendorDelayDays: 0, payoutDelayDays: 0 })}
              className="w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              Reset to Base Runway
            </button>
          </div>
        </section>

        {/* Right Side: Projections Chart and Analysis */}
        <section className="lg:col-span-2 space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div style={{
              background: "rgba(17, 19, 24, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "20px",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)"
            }}>
              <p className="text-xs font-bold text-slate-500 uppercase">Projected Balance End</p>
              <h3 className={`text-2xl font-black mt-2 ${projectedBalanceEnd > 100000 ? "text-white" : "text-rose-400"}`}>
                ₹{projectedBalanceEnd.toLocaleString("en-IN")}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Cash balance on Day 90</p>
            </div>

            <div style={{
              background: "rgba(17, 19, 24, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "20px",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)"
            }}>
              <p className="text-xs font-bold text-slate-500 uppercase">Lowest Cash Position</p>
              <h3 className="text-2xl font-black text-amber-400 mt-2">
                ₹{lowestPoint.balance.toLocaleString("en-IN")}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Expected on {lowestPoint.date}</p>
            </div>

            <div style={{
              background: "rgba(17, 19, 24, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "20px",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)"
            }}>
              <p className="text-xs font-bold text-slate-500 uppercase">Runway Warning</p>
              <div className="flex items-center gap-2 mt-2">
                {isRunwayShort ? (
                  <>
                    <ShieldAlert className="text-rose-400 h-5 w-5 animate-pulse" />
                    <span className="text-sm font-bold text-rose-400">Risk of cash shortfall</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-bold text-emerald-400">Cash balance stable</span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Calculated across cash inflows</p>
            </div>
          </div>

          {/* Runway Chart */}
          <div style={{
            background: "rgba(17, 19, 24, 0.85)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "24px",
            padding: "28px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)"
          }}>
            <h3 className="text-lg font-bold text-white mb-6">90-Day Cash Flow Runway</h3>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#14151b" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#475569" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0c0d12', border: '1px solid #1e293b', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '11px', color: '#818cf8' }}
                    labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: 'white' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#818cf8" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorBalance)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Working Capital Lockup Dashboard */}
          <div style={{
            background: "rgba(17, 19, 24, 0.85)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)"
          }}>
            <h3 className="text-lg font-bold text-white mb-6">Working Capital Capital Lockup</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-900/50">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Slow-Moving Stock</span>
                <p className="text-lg font-bold text-white mt-1">₹{lockups.slowMovingStock.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Aged 90+ days in warehouse</p>
              </div>
              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-900/50">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Returns-In-Transit</span>
                <p className="text-lg font-bold text-white mt-1">₹{lockups.returnsInTransit.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Shipping logistics assets</p>
              </div>
              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-900/50">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Disputed Claims</span>
                <p className="text-lg font-bold text-white mt-1">₹{lockups.pendingReimbursements.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Weight/damaged return files</p>
              </div>
              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-900/50">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Blocked ITC</span>
                <p className="text-lg font-bold text-rose-400 mt-1">₹{lockups.blockedItc.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Vendor GSTR-2B missing files</p>
              </div>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
}
