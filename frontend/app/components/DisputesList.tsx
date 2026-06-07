"use client";

import { useState, useEffect } from "react";
import { fetchDisputes, updateDisputeStatus, type DisputeTicket } from "../lib/api";
import { AlertCircle, CheckCircle2, Clock, Ban, Send, Download, RefreshCw } from "lucide-react";

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DisputesList({ userId }: { userId: string }) {
  const [tickets, setTickets] = useState<DisputeTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadDisputes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDisputes(userId);
      setTickets(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, [userId]);

  const handleStatusChange = async (id: number, status: "OPEN" | "FILED" | "RESOLVED" | "REJECTED") => {
    setUpdatingId(id);
    try {
      await updateDisputeStatus(id, status);
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t))
      );
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN":
        return <AlertCircle size={15} color="var(--accent-rose)" />;
      case "FILED":
        return <Clock size={15} color="var(--accent-amber)" />;
      case "RESOLVED":
        return <CheckCircle2 size={15} color="var(--accent-emerald)" />;
      case "REJECTED":
        return <Ban size={15} color="var(--text-muted)" />;
      default:
        return null;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "OPEN":
        return "badge-missing";
      case "FILED":
        return "badge-under";
      case "RESOLVED":
        return "badge-over";
      case "REJECTED":
      default:
        return "";
    }
  };

  const handleExportDisputes = () => {
    if (tickets.length === 0) return;
    const headers = ["Ticket ID", "Order ID", "Channel", "Dispute Type", "Disputed Amount", "Description", "Status", "Created At"];
    const rows = filteredTickets.map((t) => [
      t.id,
      t.order_id,
      t.channel,
      t.dispute_type.replace(/_/g, " "),
      t.amount,
      t.description.replace(/"/g, '""'),
      t.status,
      t.created_at
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dispute_claims_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const disputeTypes = Array.from(new Set(tickets.map((t) => t.dispute_type)));

  const filteredTickets = tickets.filter((t) => {
    const matchType = filterType === "ALL" || t.dispute_type === filterType;
    const matchStatus = filterStatus === "ALL" || t.status === filterStatus;
    return matchType && matchStatus;
  });

  const totalDisputedAmount = filteredTickets.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top statistics summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
        <div className="glass-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", color: "var(--text-secondary)" }}>Total Disputed Recoverable</span>
          <p style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "6px", color: "var(--accent-rose)" }}>
            {fmtINR(totalDisputedAmount)}
          </p>
        </div>
        <div className="glass-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", color: "var(--text-secondary)" }}>Open Claims</span>
          <p style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "6px", color: "var(--accent-rose)" }}>
            {tickets.filter((t) => t.status === "OPEN").length} <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-muted)" }}>Tickets</span>
          </p>
        </div>
        <div className="glass-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", color: "var(--text-secondary)" }}>Filed & Awaiting Settlement</span>
          <p style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "6px", color: "var(--accent-amber)" }}>
            {tickets.filter((t) => t.status === "FILED").length} <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-muted)" }}>Tickets</span>
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: "20px" }}>
        {/* Filter bar and controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "2px" }}>Claims & Dispute Log</h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              {filteredTickets.length} active exceptions flagged across Meesho, Flipkart, Amazon, and Myntra
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {/* Filter Category */}
            <select
              className="input-field"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ fontSize: "0.78rem", padding: "6px 10px", width: "160px" }}
            >
              <option value="ALL">All Categories</option>
              {disputeTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            {/* Filter Status */}
            <select
              className="input-field"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ fontSize: "0.78rem", padding: "6px 10px", width: "120px" }}
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="FILED">Filed</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <button onClick={loadDisputes} className="btn-secondary" style={{ padding: "8px 12px" }}>
              <RefreshCw size={14} className={loading ? "spin-animation" : ""} />
            </button>

            <button onClick={handleExportDisputes} className="btn-primary" disabled={filteredTickets.length === 0} style={{ padding: "8px 14px", fontSize: "0.78rem" }}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Dispute ledger table */}
        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <div className="spinner" style={{ margin: "0 auto" }} />
              <p style={{ marginTop: "12px", color: "var(--text-secondary)", fontSize: "0.8rem" }}>Fetching audit tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
              No dispute claims found matching your filter parameters.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "100px" }}>Channel</th>
                  <th style={{ width: "140px" }}>Order ID</th>
                  <th>Dispute Type</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th style={{ width: "110px" }}>Status</th>
                  <th style={{ width: "120px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="hover-row">
                    <td className="mono" style={{ textTransform: "uppercase", fontWeight: 700, color: "var(--accent-indigo)" }}>
                      {t.channel}
                    </td>
                    <td className="mono" style={{ fontSize: "0.75rem" }}>
                      {t.order_id}
                    </td>
                    <td style={{ fontWeight: 600, fontSize: "0.78rem" }}>
                      {t.dispute_type.replace(/_/g, " ")}
                    </td>
                    <td className="mono" style={{ fontWeight: 700, color: "var(--accent-rose)" }}>
                      {fmtINR(t.amount)}
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "var(--text-secondary)", maxWidth: "300px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "normal" }}>
                      {t.description}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(t.status)}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        {getStatusIcon(t.status)}
                        {t.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        {t.status === "OPEN" && (
                          <button
                            onClick={() => handleStatusChange(t.id, "FILED")}
                            disabled={updatingId === t.id}
                            className="btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "0.68rem" }}
                            title="Mark as Filed on Seller Panel"
                          >
                            <Send size={10} /> File
                          </button>
                        )}
                        {t.status === "FILED" && (
                          <>
                            <button
                              onClick={() => handleStatusChange(t.id, "RESOLVED")}
                              disabled={updatingId === t.id}
                              className="btn-secondary"
                              style={{ padding: "4px 8px", fontSize: "0.68rem", borderColor: "var(--accent-emerald)" }}
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleStatusChange(t.id, "REJECTED")}
                              disabled={updatingId === t.id}
                              className="btn-secondary"
                              style={{ padding: "4px 8px", fontSize: "0.68rem" }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {(t.status === "RESOLVED" || t.status === "REJECTED") && (
                          <button
                            onClick={() => handleStatusChange(t.id, "OPEN")}
                            disabled={updatingId === t.id}
                            className="btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "0.68rem" }}
                          >
                            Re-open
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
