"use client";

import { useEffect, useState } from "react";
import { Database, FileSpreadsheet } from "lucide-react";
import { fetchStagingStatus, type StagingStatus as SSType } from "../lib/api";

export default function StagingStatus({ userId, monthYear }: { userId: string; monthYear: string }) {
  const [status, setStatus] = useState<SSType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchStagingStatus(userId, monthYear)
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, [userId, monthYear]);

  return (
    <div className="glass-card" style={{ padding: "16px 18px" }} id="staging-status-card">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Database size={14} color="var(--text-secondary)" />
        <span style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>Staging Status</span>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div className="skeleton" style={{ height: 32 }} />
          <div className="skeleton" style={{ height: 32 }} />
          <div className="skeleton" style={{ height: 32 }} />
          <div className="skeleton" style={{ height: 32 }} />
        </div>
      ) : status ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-input)", textAlign: "center" }}>
              <p style={{ fontSize: "0.58rem", color: "var(--text-muted)", marginBottom: 2 }}>SALES ROWS</p>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: status.sales_rows_staged > 0 ? "var(--accent-indigo)" : "var(--text-muted)" }}>
                {status.sales_rows_staged.toLocaleString()}
              </p>
            </div>
            <div style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-input)", textAlign: "center" }}>
              <p style={{ fontSize: "0.58rem", color: "var(--text-muted)", marginBottom: 2 }}>PAYMENT ROWS</p>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: status.payment_rows_staged > 0 ? "var(--accent-emerald)" : "var(--text-muted)" }}>
                {status.payment_rows_staged.toLocaleString()}
              </p>
            </div>
            <div style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-input)", textAlign: "center" }}>
              <p style={{ fontSize: "0.58rem", color: "var(--text-muted)", marginBottom: 2 }}>RETURN ROWS</p>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: status.returns_rows_staged > 0 ? "var(--accent-rose)" : "var(--text-muted)" }}>
                {status.returns_rows_staged.toLocaleString()}
              </p>
            </div>
            <div style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-input)", textAlign: "center" }}>
              <p style={{ fontSize: "0.58rem", color: "var(--text-muted)", marginBottom: 2 }}>CATALOG SKUS</p>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: status.catalog_products > 0 ? "var(--accent-amber)" : "var(--text-muted)" }}>
                {status.catalog_products.toLocaleString()}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <FileSpreadsheet size={12} color={status.ready_to_reconcile ? "var(--accent-emerald)" : "var(--text-muted)"} />
            <span style={{ fontSize: "0.7rem", color: status.ready_to_reconcile ? "var(--accent-emerald)" : "var(--text-secondary)" }}>
              {status.ready_to_reconcile ? "Ready to reconcile period" : "Upload Sales + Payments to reconcile"}
            </span>
          </div>
        </>
      ) : (
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Unable to check staging status</p>
      )}
    </div>
  );
}
