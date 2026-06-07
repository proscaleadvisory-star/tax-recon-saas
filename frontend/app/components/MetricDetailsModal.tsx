"use client";

import { X, IndianRupee, TrendingUp, Scale, AlertTriangle, ShieldAlert } from "lucide-react";
import type { AnalyticsResponse } from "../lib/api";

interface Props {
  type: "revenue" | "profit" | "settled" | "audit";
  analytics: AnalyticsResponse;
  onClose: () => void;
}

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function MetricDetailsModal({ type, analytics, onClose }: Props) {
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
  const expectedPayout = net_revenue; // expected cash payout

  // Count risk flags
  const riskCounts = analytics.flagged_orders.reduce((acc, curr) => {
    acc[curr.risk] = (acc[curr.risk] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const renderContent = () => {
    switch (type) {
      case "revenue":
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "var(--radius-sm)", background: "var(--accent-indigo-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IndianRupee size={18} color="var(--accent-indigo)" />
              </div>
              <h4 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Net Sales Revenue Breakdown</h4>
            </div>

            {/* Formula Block */}
            <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Calculation Formula</span>
              <code style={{ fontSize: "0.85rem", color: "var(--accent-indigo)", fontWeight: 700 }}>Net Sales = Gross Revenue (Invoice) - Customer Refunds</code>
            </div>

            {/* Breakdown Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Gross Sales (Total Invoice Value)</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{fmtINR(gross_revenue)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-secondary)" }}>(-) Customer Returns / Refunds</span>
                <span style={{ fontWeight: 600, color: "var(--accent-rose)" }}>{fmtINR(returns_refund)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "2px solid var(--border-default)", fontSize: "0.95rem", fontWeight: 700 }}>
                <span>Net Sales Revenue</span>
                <span style={{ color: "var(--accent-indigo)" }}>{fmtINR(net_revenue)}</span>
              </div>
            </div>

            {/* Tax break explanation */}
            <div style={{ marginTop: "24px" }}>
              <h5 style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "12px" }}>Tax & Return Analytics</h5>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="glass-card" style={{ padding: "12px" }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>GST Component Included</span>
                  <p style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "4px", color: "var(--text-primary)" }}>{fmtINR(gross_tax)}</p>
                </div>
                <div className="glass-card" style={{ padding: "12px" }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Return Rate (Quantity Basis)</span>
                  <p style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "4px", color: "var(--accent-rose)" }}>{returnRate}%</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "profit":
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "var(--radius-sm)", background: "var(--accent-emerald-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={18} color="var(--accent-emerald)" />
              </div>
              <h4 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Net Profit & Margin Breakdown</h4>
            </div>

            {/* Formula Block */}
            <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Calculation Formula</span>
              <code style={{ fontSize: "0.85rem", color: "var(--accent-emerald)", fontWeight: 700 }}>Net Profit = Net Sales - COGS (Cost of Goods) - Platform Fees</code>
            </div>

            {/* Breakdown Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Net Sales Revenue</span>
                <span style={{ fontWeight: 600 }}>{fmtINR(net_revenue)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-secondary)" }}>(-) Cost of Goods Sold (COGS)</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{fmtINR(cogs)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-secondary)" }}>(-) Platform Fees & Commission</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{fmtINR(platform_fees)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "2px solid var(--border-default)", fontSize: "0.95rem", fontWeight: 700 }}>
                <span>Total Net Profit</span>
                <span style={{ color: "var(--accent-emerald)" }}>{fmtINR(total_profit)}</span>
              </div>
            </div>

            {/* Net Margin indicator */}
            <div style={{ marginTop: "24px", display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Unit Economic Net Profit Margin</span>
                <div style={{ height: "8px", background: "var(--bg-elevated)", borderRadius: "var(--radius-full)", marginTop: "6px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max(0, Math.min(parseFloat(profitMargin), 100))}%`, background: "var(--accent-emerald)", borderRadius: "var(--radius-full)" }} />
                </div>
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-emerald)", paddingLeft: "10px" }}>
                {profitMargin}%
              </div>
            </div>
          </div>
        );

      case "settled":
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "var(--radius-sm)", background: "var(--accent-amber-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Scale size={18} color="var(--accent-amber)" />
              </div>
              <h4 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Collected Cash & Payout Audit</h4>
            </div>

            {/* Formula Block */}
            <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Audit Verification</span>
              <code style={{ fontSize: "0.85rem", color: "var(--accent-amber)", fontWeight: 700 }}>Actual Cash Settled = Payout received in Bank + Tax Deductions</code>
            </div>

            {/* Breakdown Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Settled Amount (Platform Statement)</span>
                <span style={{ fontWeight: 600 }}>{fmtINR(settled_cash)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-secondary)" }}>TCS GST Deducted (Claimable)</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{fmtINR(tcs)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-secondary)" }}>TDS Income Tax Deducted (Claimable)</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{fmtINR(tds)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "2px solid var(--border-default)", fontSize: "0.95rem", fontWeight: 700 }}>
                <span>Collected Cash (Aggregate)</span>
                <span style={{ color: "var(--accent-amber)" }}>{fmtINR(settled_cash)}</span>
              </div>
            </div>

            {/* Operational Alert */}
            <div className="glass-card" style={{ marginTop: "20px", display: "flex", gap: "10px", alignItems: "flex-start", padding: "12px", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
              <ShieldAlert size={18} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>Tax Claims Ledger (GSTR-2B / Form 26AS)</p>
                <p style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: "3px", lineHeight: 1.4 }}>
                  Ensure that TCS ({fmtINR(tcs)}) and TDS ({fmtINR(tds)}) values match your government portal ledger summaries to claim credit during monthly filing.
                </p>
              </div>
            </div>
          </div>
        );

      case "audit":
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "var(--radius-sm)", background: "var(--accent-rose-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle size={18} color="var(--accent-rose)" />
              </div>
              <h4 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Audit Discrepancy & Variance Analysis</h4>
            </div>

            {/* Formula Block */}
            <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Variance Formula</span>
              <code style={{ fontSize: "0.85rem", color: "var(--accent-rose)", fontWeight: 700 }}>Variance = Expected Net Revenue - Settled Cash Payout</code>
            </div>

            {/* Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              <div className="glass-card" style={{ padding: "12px" }}>
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Flagged Orders</span>
                <p style={{ fontSize: "1.2rem", fontWeight: 800, marginTop: "4px", color: "var(--accent-rose)" }}>{flagged_count} / {total_orders}</p>
              </div>
              <div className="glass-card" style={{ padding: "12px" }}>
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Cumulative Variance</span>
                <p style={{ fontSize: "1.2rem", fontWeight: 800, marginTop: "4px", color: "var(--accent-rose)" }}>{fmtINR(variance)}</p>
              </div>
            </div>

            {/* Audit Flag Categorizations */}
            <h5 style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "10px" }}>Discrepancy Classifications</h5>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "140px", overflowY: "auto", paddingRight: "4px" }}>
              {Object.entries(riskCounts).map(([riskType, count]) => (
                <div
                  key={riskType}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.78rem"
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{riskType.replace(/_/g, " ")}</span>
                  <span className="badge badge-missing" style={{ padding: "3px 8px", fontSize: "0.68rem" }}>{count} Orders</span>
                </div>
              ))}
              {Object.keys(riskCounts).length === 0 && (
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", padding: "10px" }}>No active flags. System matches perfectly.</p>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 110,
        padding: "20px",
      }}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "480px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          padding: "24px",
          backgroundColor: "rgba(17, 19, 24, 0.96)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-glow-indigo)"
        }}
      >
        {/* Close trigger */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Content */}
        {renderContent()}

        {/* Action Button */}
        <button
          onClick={onClose}
          className="btn-primary"
          style={{ width: "100%", marginTop: "24px", padding: "10px 0", fontSize: "0.85rem" }}
        >
          Close Analysis
        </button>
      </div>
    </div>
  );
}
