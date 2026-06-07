"use client";

import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Percent,
  AlertTriangle,
  Scale,
  Briefcase,
  Layers,
} from "lucide-react";
import type { AnalyticsResponse } from "../lib/api";

function fmt(n: number): string {
  if (Math.abs(n) >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  if (Math.abs(n) >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function MetricCards({
  analytics,
  onCardClick,
}: {
  analytics: AnalyticsResponse;
  onCardClick: (type: "revenue" | "profit" | "settled" | "audit") => void;
}) {
  const {
    gross_revenue,
    gross_tax,
    returns_refund,
    net_revenue,
    settled_cash,
    platform_fees,
    cogs,
    total_profit,
    tcs,
    tds,
    variance,
    total_orders,
    flagged_count,
  } = analytics.summary;

  const profitMargin = net_revenue > 0 ? ((total_profit / net_revenue) * 100).toFixed(1) : "0.0";
  const returnRate = gross_revenue > 0 ? ((returns_refund / gross_revenue) * 100).toFixed(1) : "0.0";

  return (
    <div style={{ marginBottom: 24 }}>
      {/* ─── PRIMARY METRIC BLOCKS ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        {/* Net Revenue */}
        <div
          className="glass-card metric-card indigo"
          id="metric-revenue"
          onClick={() => onCardClick("revenue")}
          style={{ cursor: "pointer", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
              Net Sales Revenue
            </span>
            <div style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", background: "var(--accent-indigo-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IndianRupee size={15} color="var(--accent-indigo)" />
            </div>
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>{fmt(net_revenue)}</p>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 6 }}>
            <span>Gross: {fmt(gross_revenue)}</span>
            <span style={{ color: "var(--accent-rose)" }}>Returns: {fmt(returns_refund)}</span>
          </div>
        </div>

        {/* Net Profit */}
        <div
          className="glass-card metric-card emerald"
          id="metric-profit"
          onClick={() => onCardClick("profit")}
          style={{ cursor: "pointer", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
              Total Net Profit
            </span>
            <div style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", background: total_profit >= 0 ? "var(--accent-emerald-dim)" : "var(--accent-rose-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={15} color={total_profit >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)"} />
            </div>
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", color: total_profit >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
            {fmt(total_profit)}
          </p>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 6 }}>
            Net Margin: <span style={{ fontWeight: 600, color: total_profit >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}>{profitMargin}%</span>
          </p>
        </div>

        {/* Settled Cash */}
        <div
          className="glass-card metric-card amber"
          id="metric-settled"
          onClick={() => onCardClick("settled")}
          style={{ cursor: "pointer", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
              Collected Cash
            </span>
            <div style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", background: "var(--accent-amber-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Scale size={15} color="var(--accent-amber)" />
            </div>
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>{fmt(settled_cash)}</p>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 6 }}>
            TCS: {fmt(tcs)} | TDS: {fmt(tds)}
          </p>
        </div>

        {/* Audit Discrepancy */}
        <div
          className="glass-card metric-card rose"
          id="metric-audit"
          onClick={() => onCardClick("audit")}
          style={{ cursor: "pointer", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
              Audit Discrepancy
            </span>
            <div style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", background: "var(--accent-rose-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={15} color="var(--accent-rose)" />
            </div>
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", color: variance > 100 ? "var(--accent-rose)" : "var(--text-primary)" }}>
            {fmt(variance)}
          </p>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 6 }}>
            Flagged Orders: <span style={{ fontWeight: 600, color: "var(--accent-rose)" }}>{flagged_count}</span> / {total_orders}
          </p>
        </div>
      </div>

      {/* ─── EXPENSE & OPERATIONAL RATIOS ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Cost Structure Breakdown */}
        <div className="glass-card" style={{ padding: "16px 20px" }}>
          <h4 style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: "14px" }}>
            Expense Allocation (COGS vs Fees)
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* COGS */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "4px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Briefcase size={12} color="var(--text-secondary)" /> Cost of Goods (COGS)</span>
                <span style={{ fontWeight: 600 }}>{fmt(cogs)} ({net_revenue > 0 ? ((cogs / net_revenue) * 100).toFixed(0) : "0"}%)</span>
              </div>
              <div style={{ height: "4px", background: "var(--bg-elevated)", borderRadius: "var(--radius-full)" }}>
                <div style={{ height: "100%", width: `${net_revenue > 0 ? Math.min((cogs / net_revenue) * 100, 100) : 0}%`, background: "var(--accent-indigo)", borderRadius: "var(--radius-full)" }} />
              </div>
            </div>

            {/* Marketplace Fees */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "4px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Layers size={12} color="var(--text-secondary)" /> Platform Fees & Commission</span>
                <span style={{ fontWeight: 600 }}>{fmt(platform_fees)} ({net_revenue > 0 ? ((platform_fees / net_revenue) * 100).toFixed(0) : "0"}%)</span>
              </div>
              <div style={{ height: "4px", background: "var(--bg-elevated)", borderRadius: "var(--radius-full)" }}>
                <div style={{ height: "100%", width: `${net_revenue > 0 ? Math.min((platform_fees / net_revenue) * 100, 100) : 0}%`, background: "var(--accent-amber)", borderRadius: "var(--radius-full)" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Operating Ratios */}
        <div className="glass-card" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-around", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: "var(--radius-full)", background: "var(--accent-rose-dim)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
              <TrendingDown size={18} color="var(--accent-rose)" />
            </div>
            <p style={{ fontSize: "1.2rem", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{returnRate}%</p>
            <p style={{ fontSize: "0.62rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>
              Return Rate
            </p>
          </div>

          <div style={{ width: "1px", height: "50px", background: "var(--border-subtle)" }} />

          <div style={{ textAlign: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: "var(--radius-full)", background: "var(--accent-emerald-dim)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
              <Percent size={18} color="var(--accent-emerald)" />
            </div>
            <p style={{ fontSize: "1.2rem", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{profitMargin}%</p>
            <p style={{ fontSize: "0.62rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>
              Net Margin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
