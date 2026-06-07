"use client";

import { useState } from "react";
import { AlertCircle, ArrowUpRight, ShieldAlert, Package, ShoppingBag } from "lucide-react";
import type { AnalyticsResponse } from "../lib/api";

interface OpsProps {
  analytics: AnalyticsResponse;
}

export default function OperationsDashboard({ analytics }: OpsProps) {
  const [subTab, setSubTab] = useState<"pl" | "inventory">("pl");
  const { skus, inventory } = analytics;

  const fmtINR = (n: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  };

  return (
    <div className="glass-card" style={{ overflow: "hidden", marginTop: "24px" }} id="operations-canvas">
      {/* Tab Selector */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-card)",
        }}
      >
        <div style={{ display: "flex", gap: "16px" }}>
          <button
            onClick={() => setSubTab("pl")}
            style={{
              background: "none",
              border: "none",
              fontSize: "0.85rem",
              fontWeight: subTab === "pl" ? 700 : 500,
              color: subTab === "pl" ? "var(--accent-indigo)" : "var(--text-secondary)",
              cursor: "pointer",
              paddingBottom: "4px",
              borderBottom: subTab === "pl" ? "2px solid var(--accent-indigo)" : "none",
            }}
          >
            Unit Economics (P&L)
          </button>
          <button
            onClick={() => setSubTab("inventory")}
            style={{
              background: "none",
              border: "none",
              fontSize: "0.85rem",
              fontWeight: subTab === "inventory" ? 700 : 500,
              color: subTab === "inventory" ? "var(--accent-indigo)" : "var(--text-secondary)",
              cursor: "pointer",
              paddingBottom: "4px",
              borderBottom: subTab === "inventory" ? "2px solid var(--accent-indigo)" : "none",
            }}
          >
            Inventory Intelligence
          </button>
        </div>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Operations Console
        </span>
      </div>

      {/* SUB TAB: UNIT ECONOMICS P&L */}
      {subTab === "pl" && (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product SKU</th>
                <th>Units Sold</th>
                <th>Returned</th>
                <th>Net Revenue</th>
                <th>Est. COGS</th>
                <th>Mktplace Fees</th>
                <th>Net Profit</th>
                <th>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {skus.map((item, idx) => (
                <tr key={`${item.sku}-${idx}`}>
                  <td className="mono" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                    {item.sku}
                  </td>
                  <td>{item.sold}</td>
                  <td style={{ color: item.returned > 0 ? "var(--accent-rose)" : "var(--text-muted)" }}>
                    {item.returned}
                  </td>
                  <td className="mono">{fmtINR(item.net_revenue)}</td>
                  <td className="mono">{fmtINR(item.cogs)}</td>
                  <td className="mono" style={{ color: "var(--accent-amber)" }}>
                    {fmtINR(item.fees)}
                  </td>
                  <td
                    className="mono"
                    style={{
                      color: item.profit >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)",
                      fontWeight: 600,
                    }}
                  >
                    {fmtINR(item.profit)}
                  </td>
                  <td>
                    <span
                      className={`badge ${item.profit >= 0 ? "badge-ok" : "badge-under"}`}
                      style={{ display: "inline-flex", gap: "2px" }}
                    >
                      {item.margin_pct}% <ArrowUpRight size={10} />
                    </span>
                  </td>
                </tr>
              ))}
              {skus.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                    No product metrics compiled yet. Upload your SKU Cost Catalog and run reconciliation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB TAB: INVENTORY INTELLIGENCE */}
      {subTab === "inventory" && (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product SKU</th>
                <th>Monthly Sales</th>
                <th>Daily Run Rate</th>
                <th>Safety Threshold</th>
                <th>In Transit</th>
                <th>1-Week Safety Stock</th>
                <th>1-Month Safety Stock</th>
                <th>Status Alerts</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((inv, idx) => {
                const isSafetyTriggered = inv.monthly_sales < inv.min_safety_stock;
                return (
                  <tr key={`${inv.sku}-${idx}`}>
                    <td className="mono" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                      {inv.sku}
                    </td>
                    <td>{inv.monthly_sales}</td>
                    <td className="mono">{inv.daily_run_rate} /day</td>
                    <td>{inv.min_safety_stock}</td>
                    <td style={{ color: "var(--accent-cyan)", fontWeight: 500 }}>
                      {inv.stock_in_transit}
                    </td>
                    <td className="mono" style={{ fontWeight: 600 }}>{inv.recommended_inventory_day} units</td>
                    <td className="mono">{inv.recommended_inventory_week} units</td>
                    <td>
                      {isSafetyTriggered ? (
                        <span className="badge badge-under" style={{ display: "inline-flex", gap: "4px" }}>
                          <ShieldAlert size={10} /> Low Volume Alert
                        </span>
                      ) : (
                        <span className="badge badge-ok" style={{ display: "inline-flex", gap: "4px" }}>
                          <Package size={10} /> Safe
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {inventory.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                    No inventory metrics compiled. Upload your SKU safety parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
