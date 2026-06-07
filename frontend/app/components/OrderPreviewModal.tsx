"use client";

import { X, FileText, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";

interface OrderDetail {
  order_id: string;
  sku: string;
  product_description: string;
  quantity_sold: number;
  quantity_returned: number;
  net_quantity: number;
  gross_sales: number;
  gross_tax: number;
  tcs_amount: number;
  refund_amount: number;
  settled_amount: number;
  marketplace_fee: number;
  tds_amount: number;
  net_payout: number;
  net_sales: number;
  cost_price: number;
  net_profit: number;
  shipping_state: string;
  variance: number;
  risk: string;
  month_year: string;
}

interface Props {
  order: OrderDetail;
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

export default function OrderPreviewModal({ order, onClose }: Props) {
  const getRiskExplanation = (risk: string) => {
    switch (risk) {
      case "MISSING_PAYMENT":
        return "Staged in Sales reports but no settlement transaction was found in the Payout sheet. You are owed this payout.";
      case "MISSING_SALE":
        return "Payout settled by the marketplace, but no matching customer order exists in your Sales exports.";
      case "UNDER_REPORTED":
        return "Marketplace settled payout is lower than your invoiced Net Sales. Verify platform fee deductions.";
      case "OVER_REPORTED":
        return "Marketplace settled payout exceeds the invoiced Net Sales. Verify returns or double-entry payouts.";
      case "UNEXPECTED_RETURN":
        return "Customer return processed, but no initial sales transaction was recorded in your database.";
      default:
        return "Reconciliation matched successfully.";
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
          maxWidth: "600px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          padding: "24px",
          backgroundColor: "rgba(17, 19, 24, 0.96)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-glow-indigo)",
          maxHeight: "90vh",
          overflowY: "auto"
        }}
      >
        {/* Close Button */}
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

        {/* Modal Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "var(--radius-sm)", background: "var(--accent-rose-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FileText size={18} color="var(--accent-rose)" />
          </div>
          <div>
            <h4 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>Audit Receipt: {order.order_id}</h4>
            <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Period: {order.month_year} | State: {order.shipping_state}</span>
          </div>
        </div>

        {/* Risk Banner */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            background: "var(--accent-rose-dim)",
            border: "1px solid rgba(244, 63, 94, 0.2)",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-rose)" }}>Audit Flag Status</span>
            <span className="badge badge-missing">{order.risk.replace(/_/g, " ")}</span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
            {getRiskExplanation(order.risk)}
          </p>
        </div>

        {/* Product Details */}
        <div style={{ marginBottom: "20px" }}>
          <h5 style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>Product Details</h5>
          <div style={{ padding: "12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", fontSize: "0.78rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: "var(--text-muted)" }}>SKU Code:</span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{order.sku}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: "var(--text-muted)" }}>Description:</span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)", maxWidth: "340px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={order.product_description}>{order.product_description}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Unit Volume:</span>
              <span style={{ fontWeight: 600 }}>Sold: {order.quantity_sold} | Returned: {order.quantity_returned} (Net: {order.net_quantity})</span>
            </div>
          </div>
        </div>

        {/* Audit Sheet Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          {/* Expected Revenue column */}
          <div>
            <h5 style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>Expected Financials</h5>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Gross Invoice</span>
                <span>{fmtINR(order.gross_sales)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>(-) Return Refund</span>
                <span style={{ color: "var(--accent-rose)" }}>{fmtINR(order.refund_amount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, paddingTop: "6px", borderTop: "1px solid var(--border-subtle)" }}>
                <span>Expected Net</span>
                <span style={{ color: "var(--accent-indigo)" }}>{fmtINR(order.net_sales)}</span>
              </div>
            </div>
          </div>

          {/* Actual Settled Payout Column */}
          <div>
            <h5 style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>Actual Settled Payout</h5>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Settled Amount</span>
                <span>{fmtINR(order.settled_amount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>TCS GST Deduction</span>
                <span>{fmtINR(order.tcs_amount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>TDS IT Deduction</span>
                <span>{fmtINR(order.tds_amount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, paddingTop: "6px", borderTop: "1px solid var(--border-subtle)" }}>
                <span>Marketplace Fees</span>
                <span>{fmtINR(order.marketplace_fee)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ledger Audit Balance Summary */}
        <div style={{ padding: "14px", background: "var(--bg-input)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontSize: "0.82rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Expected Net Revenue:</span>
            <span style={{ fontWeight: 700 }}>{fmtINR(order.net_sales)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>
            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Actual Settled Cash:</span>
            <span style={{ fontWeight: 700 }}>{fmtINR(order.settled_amount)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
            <span>Audited Variance / Gap:</span>
            <span style={{ color: Math.abs(order.variance) > 1.0 ? "var(--accent-rose)" : "var(--accent-emerald)" }}>{fmtINR(order.variance)}</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="btn-secondary"
          style={{ width: "100%", marginTop: "20px", padding: "10px 0", fontSize: "0.85rem" }}
        >
          Close Preview
        </button>
      </div>
    </div>
  );
}
