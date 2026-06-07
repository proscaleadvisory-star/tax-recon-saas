"use client";

import React, { useState, useEffect } from "react";
import { 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { ProfitabilityService, SkuProfitability, ChannelProfitability } from "@/lib/services/profitability-service";

export default function ProfitabilityTab() {
  const [skus, setSkus] = useState<SkuProfitability[]>([]);
  const [channels, setChannels] = useState<ChannelProfitability[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    setSkus(ProfitabilityService.getSkuProfitabilityList());
    setChannels(ProfitabilityService.getChannelProfitabilityList());
  }, []);

  const categories = ["All", ...Array.from(new Set(skus.map(s => s.category)))];

  const filteredSkus = skus.filter(s => {
    const matchesCategory = filterCategory === "All" || s.category === filterCategory;
    const matchesSearch = s.skuId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.productName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">True Profitability Engine</h1>
        <p className="text-slate-400 mt-1">Order-level cost allocation, return shipping charges, and true net margins.</p>
      </div>

      {/* Channel Summary */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-white">Channel Profitability Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {channels.map((chan) => {
            const isPos = chan.netProfit > 0;
            return (
              <div 
                key={chan.channel} 
                style={{
                  background: "rgba(17, 19, 24, 0.85)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "20px",
                  position: "relative",
                  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)"
                }}
                className="group"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{chan.channel}</span>
                  <span className={`flex items-center text-xs font-bold ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                    {isPos ? <ArrowUpRight className="h-4.5 w-4.5" /> : <ArrowDownRight className="h-4.5 w-4.5" />}
                    {chan.marginPercent}%
                  </span>
                </div>
                <p className="text-2xl font-black text-white">₹{chan.netProfit.toLocaleString("en-IN")}</p>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Net profit after ad & logistics costs</p>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-900/60 text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500">Gross Sales:</span>
                    <p className="font-bold text-slate-200">₹{(chan.grossSales / 100000).toFixed(1)}L</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Return Rate:</span>
                    <p className="font-bold text-slate-200">{(chan.returnRate * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SKU Margins Grid */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-white">SKU Margin Details (CM2)</h3>
          
          {/* Controls */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search SKU..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500/50"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 outline-none cursor-pointer focus:border-indigo-500/50"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
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
                <th className="p-4 pl-6">SKU Code</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Units</th>
                <th className="p-4 text-right">Gross price</th>
                <th className="p-4 text-right">COGS</th>
                <th className="p-4 text-right">Commissions</th>
                <th className="p-4 text-right">Forward Shipping</th>
                <th className="p-4 text-right">Ad Spend/Unit</th>
                <th className="p-4 text-right">Return Loss/Unit</th>
                <th className="p-4 text-right">Net Margin</th>
              </tr>
            </thead>
            <tbody>
              {filteredSkus.map((sku) => {
                const isPos = sku.netProfit > 0;
                // returns loss calculation: rate * (return shipping + damaged loss)
                const returnsLoss = sku.returnRate * (sku.returnShippingCost + sku.damagedLoss);
                return (
                  <tr key={sku.skuId} className="border-b border-slate-900/60 hover:bg-slate-900/30 transition-all">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-white">{sku.skuId}</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-xs">{sku.productName}</p>
                    </td>
                    <td className="p-4 text-slate-400 font-medium">{sku.category}</td>
                    <td className="p-4 text-right font-mono text-slate-300 font-bold">{sku.unitsSold}</td>
                    <td className="p-4 text-right font-mono text-slate-300">₹{sku.grossSalesPrice}</td>
                    <td className="p-4 text-right font-mono text-slate-400">₹{sku.cogs}</td>
                    <td className="p-4 text-right font-mono text-slate-400">₹{sku.commissions.toFixed(1)}</td>
                    <td className="p-4 text-right font-mono text-slate-400">₹{sku.shippingFee}</td>
                    <td className="p-4 text-right font-mono text-slate-400">₹{sku.adSpend}</td>
                    <td className="p-4 text-right font-mono text-slate-400">₹{returnsLoss.toFixed(1)}</td>
                    <td className="p-4 text-right pr-6">
                      <span className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-lg ${
                        isPos ? "text-emerald-400 bg-emerald-500/5 border border-emerald-500/10" : "text-rose-400 bg-rose-500/5 border border-rose-500/10"
                      }`}>
                        {isPos ? "+" : ""}₹{sku.netProfit.toFixed(1)} ({sku.marginPercent}%)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
