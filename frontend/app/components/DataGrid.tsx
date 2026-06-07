"use client";

import { useState, useMemo } from "react";
import { Search, Download, ChevronUp, ChevronDown } from "lucide-react";
import { getExportUrl } from "../lib/api";

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
  orders: OrderDetail[];
  userId: string;
  monthYear: string;
  onOrderClick: (order: OrderDetail) => void;
}

type SortKey = "order_id" | "variance" | "risk" | "net_sales" | "settled_amount";

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DataGrid({ orders, userId, monthYear, onOrderClick }: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("variance");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const perPage = 25;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) =>
      o.order_id.toLowerCase().includes(q) ||
      (o.sku || "").toLowerCase().includes(q) ||
      o.risk.toLowerCase().includes(q)
    );
  }, [orders, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [filtered, sortKey, sortDir]);

  const paged = sorted.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(sorted.length / perPage);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const flagBadge = (f: string) => {
    const cls =
      f === "UNDER_REPORTED"
        ? "badge-under"
        : f === "OVER_REPORTED"
        ? "badge-over"
        : "badge-missing";
    return <span className={`badge ${cls}`}>{f.replace(/_/g, " ")}</span>;
  };

  return (
    <div className="glass-card" style={{ overflow: "hidden" }} id="data-grid-canvas">
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 2 }}>Flagged Reconciliation</h3>
          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            {filtered.length} order discrepancies requiring audit reviews
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              color="var(--text-muted)"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              className="input-field"
              placeholder="Search order ID / SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              style={{ paddingLeft: 32, width: 220, fontSize: "0.8rem" }}
            />
          </div>
          <a
            href={getExportUrl(userId, monthYear)}
            download
            className="btn-secondary"
            style={{ padding: "8px 14px", fontSize: "0.8rem", textDecoration: "none" }}
          >
            <Download size={14} /> Export CSV
          </a>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", maxHeight: "500px", overflowY: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("order_id")}>
                Order ID <SortIcon k="order_id" />
              </th>
              <th>SKU</th>
              <th style={{ cursor: "pointer", textAlign: "right" }} onClick={() => toggleSort("net_sales")}>
                Expected Net Revenue <SortIcon k="net_sales" />
              </th>
              <th style={{ cursor: "pointer", textAlign: "right" }} onClick={() => toggleSort("settled_amount")}>
                Settled Payout <SortIcon k="settled_amount" />
              </th>
              <th style={{ cursor: "pointer", textAlign: "right" }} onClick={() => toggleSort("variance")}>
                Variance <SortIcon k="variance" />
              </th>
              <th style={{ textAlign: "right" }}>Variance %</th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("risk")}>
                Flag <SortIcon k="risk" />
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((o, i) => {
              const varPct = o.net_sales > 0 ? (o.variance / o.net_sales) * 100 : 0;
              return (
                <tr
                  key={`${o.order_id}-${i}`}
                  onClick={() => onOrderClick(o)}
                  style={{ cursor: "pointer", transition: "background 0.2s ease" }}
                  className="hover-row"
                >
                  <td className="mono" style={{ color: "var(--accent-indigo)" }}>
                    {o.order_id}
                  </td>
                  <td className="mono" style={{ color: "var(--text-secondary)", fontSize: "0.72rem" }}>
                    {o.sku || "—"}
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>
                    {fmtINR(o.net_sales)}
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>
                    {fmtINR(o.settled_amount)}
                  </td>
                  <td
                    className="mono"
                    style={{
                      textAlign: "right",
                      color: Math.abs(o.variance) > 1.0 ? "var(--accent-rose)" : "var(--accent-emerald)",
                      fontWeight: 600,
                    }}
                  >
                    {fmtINR(o.variance)}
                  </td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                    {varPct.toFixed(1)}%
                  </td>
                  <td>{flagBadge(o.risk)}</td>
                </tr>
              );
            })}
            {paged.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                  No matching reconciliation records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.75rem",
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>
            Page {page + 1} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn-secondary"
              style={{ padding: "4px 12px", fontSize: "0.75rem" }}
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </button>
            <button
              className="btn-secondary"
              style={{ padding: "4px 12px", fontSize: "0.75rem" }}
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
