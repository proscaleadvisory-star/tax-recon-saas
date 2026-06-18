"use client";

import { useState, useCallback, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  Shield,
  LogOut,
  CalendarDays,
  RefreshCw,
  HelpCircle,
  TrendingUp,
  Map,
  ClipboardList,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import FileUpload from "./FileUpload";
import MetricCards from "./MetricCards";
import StagingStatus from "./StagingStatus";
import DataGrid from "./DataGrid";
import OperationsDashboard from "./OperationsDashboard";
import IndiaHeatmap from "./IndiaHeatmap";
import MetricDetailsModal from "./MetricDetailsModal";
import OrderPreviewModal from "./OrderPreviewModal";
import DisputesList from "./DisputesList";
import {
  triggerReconciliation,
  fetchAnalytics,
  type AnalyticsResponse,
  type ReconcileResponse,
} from "../lib/api";

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type TabType = "reconcile" | "financials" | "geographic" | "disputes";

export default function Dashboard({ user, onBackToHub }: { user: User; onBackToHub?: () => void }) {
  const [monthYear, setMonthYear] = useState(getCurrentMonth());
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [reconcileResult, setReconcileResult] = useState<ReconcileResponse | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>("reconcile");
  const [selectedMetric, setSelectedMetric] = useState<"revenue" | "profit" | "settled" | "audit" | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AnalyticsResponse["flagged_orders"][number] | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const loadAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    setError(null);
    try {
      const data = await fetchAnalytics(user.id, monthYear);
      setAnalytics(data);
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        !e.message.includes("No data") &&
        !e.message.includes("404")
      ) {
        setError(e instanceof Error ? e.message : "Failed to load analytics");
      }
      setAnalytics(null);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [user.id, monthYear]);

  const handleReconcile = useCallback(async () => {
    setIsReconciling(true);
    setError(null);
    setReconcileResult(null);
    try {
      const result = await triggerReconciliation(user.id, monthYear);
      setReconcileResult(result);
      await loadAnalytics();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Reconciliation failed");
    } finally {
      setIsReconciling(false);
    }
  }, [user.id, monthYear, loadAnalytics]);

  // Load analytics when period changes
  useEffect(() => {
    loadAnalytics();
  }, [monthYear, loadAnalytics, refreshKey]);

  const handleUploadComplete = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Nav */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 28px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(7, 8, 10, 0.85)",
          backdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {onBackToHub && (
            <button
              onClick={onBackToHub}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "34px",
                height: "34px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                marginRight: "4px",
                transition: "all 0.2s"
              }}
              title="Back to Suite Hub"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "var(--radius-sm)",
              background: "var(--gradient-hero)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Shield size={17} color="#07080a" strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              background: "var(--gradient-hero)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ProScale Recon OS
          </span>
        </div>

        {/* Tab Controls */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-input)",
            borderRadius: "var(--radius-md)",
            padding: "4px",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <button
            onClick={() => setActiveTab("reconcile")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              fontSize: "0.78rem",
              fontWeight: 600,
              borderRadius: "var(--radius-sm)",
              border: "none",
              cursor: "pointer",
              background: activeTab === "reconcile" ? "var(--bg-elevated)" : "transparent",
              color: activeTab === "reconcile" ? "var(--accent-indigo)" : "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            <ClipboardList size={14} /> Audit & Rec
          </button>
          <button
            onClick={() => setActiveTab("financials")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              fontSize: "0.78rem",
              fontWeight: 600,
              borderRadius: "var(--radius-sm)",
              border: "none",
              cursor: "pointer",
              background: activeTab === "financials" ? "var(--bg-elevated)" : "transparent",
              color: activeTab === "financials" ? "var(--accent-indigo)" : "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            <TrendingUp size={14} /> Profits & Ops
          </button>
          <button
            onClick={() => setActiveTab("geographic")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              fontSize: "0.78rem",
              fontWeight: 600,
              borderRadius: "var(--radius-sm)",
              border: "none",
              cursor: "pointer",
              background: activeTab === "geographic" ? "var(--bg-elevated)" : "transparent",
              color: activeTab === "geographic" ? "var(--accent-indigo)" : "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            <Map size={14} /> Heatmap
          </button>
          <button
            onClick={() => setActiveTab("disputes")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              fontSize: "0.78rem",
              fontWeight: 600,
              borderRadius: "var(--radius-sm)",
              border: "none",
              cursor: "pointer",
              background: activeTab === "disputes" ? "var(--bg-elevated)" : "transparent",
              color: activeTab === "disputes" ? "var(--accent-indigo)" : "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            <ShieldAlert size={14} /> Disputes & Claims
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "6px 12px",
            }}
          >
            <CalendarDays size={15} color="var(--text-secondary)" />
            <input
              type="month"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.8rem",
                outline: "none",
                cursor: "pointer",
              }}
            />
          </div>

          <button onClick={handleSignOut} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Panel */}
      <main
        style={{
          flex: 1,
          padding: "28px",
          maxWidth: "1400px",
          width: "100%",
          margin: "0 auto",
        }}
      >
        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: "var(--accent-rose-dim)",
              border: "1px solid rgba(251,113,133,0.2)",
              borderRadius: "var(--radius-md)",
              color: "var(--accent-rose)",
              fontSize: "0.85rem",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <HelpCircle size={16} />
            {error}
            <button
              onClick={() => setError(null)}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                color: "var(--accent-rose)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {reconcileResult && (
          <div
            style={{
              padding: "14px 18px",
              background: "var(--accent-emerald-dim)",
              border: "1px solid rgba(52,211,153,0.2)",
              borderRadius: "var(--radius-md)",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ color: "var(--accent-emerald)", fontWeight: 600, fontSize: "0.9rem" }}>
                ✓ Financial Reconciliation Complete
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "2px" }}>
                {reconcileResult.message}
              </p>
            </div>
            <div style={{ display: "flex", gap: "20px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>AUDITED</p>
                <p style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>
                  {reconcileResult.total_matched.toLocaleString()}
                </p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>FLAGGED</p>
                <p style={{ color: "var(--accent-rose)", fontWeight: 700 }}>
                  {reconcileResult.total_flagged.toLocaleString()}
                </p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>NET PROFIT</p>
                <p style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>
                  ₹{reconcileResult.net_profit.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Global Financial Metrics Displayed on All Tabs */}
        {analytics && <MetricCards analytics={analytics} onCardClick={setSelectedMetric} />}

        {/* ─── TAB 1: AUDIT & RECONCILIATION ─── */}
        {activeTab === "reconcile" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", marginBottom: "24px" }}>
              <FileUpload userId={user.id} monthYear={monthYear} onUploadComplete={handleUploadComplete} />
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <StagingStatus key={refreshKey} userId={user.id} monthYear={monthYear} />
                <button
                  className="btn-primary"
                  onClick={handleReconcile}
                  disabled={isReconciling}
                  style={{ width: "100%", padding: "14px", fontSize: "0.9rem" }}
                >
                  {isReconciling ? "Processing..." : "Run Reconciliation"}
                </button>
              </div>
            </div>

            {/* Mismatched Audit Ledger Grid */}
            {analytics && analytics.flagged_orders.length > 0 ? (
              <DataGrid
                orders={analytics.flagged_orders as any}
                userId={user.id}
                monthYear={monthYear}
                onOrderClick={setSelectedOrder}
              />
            ) : null}
          </div>
        )}

        {/* ─── TAB 2: FINANCIAL P&L & OPERATIONS ─── */}
        {activeTab === "financials" && (
          <div>
            {analytics ? (
              <OperationsDashboard analytics={analytics} />
            ) : (
              <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  Upload inventory safety logs and run reconciliation to compute operations metrics.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: INDIA HEATMAP ─── */}
        {activeTab === "geographic" && (
          <div>
            {analytics ? (
              <IndiaHeatmap data={analytics.heatmap} />
            ) : (
              <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  Geographic heatmap is compiled during billing ledger reconciliation.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: DISPUTES & CLAIMS ─── */}
        {activeTab === "disputes" && (
          <div>
            <DisputesList userId={user.id} />
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedMetric && analytics && (
        <MetricDetailsModal
          type={selectedMetric}
          analytics={analytics}
          onClose={() => setSelectedMetric(null)}
        />
      )}

      {selectedOrder && (
        <OrderPreviewModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      <footer
        style={{
          padding: "16px 28px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
        }}
      >
        <span>ProScale Advisory Financial OS v2.0</span>
        <span>Built for Indian E-Commerce Sellers</span>
      </footer>
    </div>
  );
}
