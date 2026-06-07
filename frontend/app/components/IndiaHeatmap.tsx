"use client";

import { useState } from "react";
import { STATE_PATHS } from "../lib/state_paths";

interface StateData {
  orders: number;
  revenue: number;
}

interface HeatmapProps {
  data: Record<string, StateData>;
}

export default function IndiaHeatmap({ data }: HeatmapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Calculate highest revenue to normalize color ranges
  const maxRevenue = Math.max(
    ...Object.values(data).map((d) => d.revenue),
    1000 // Default fallback minimum
  );

  const getFillColor = (stateId: string) => {
    const record = data[stateId];
    if (!record || record.revenue === 0) {
      return "rgba(255, 255, 255, 0.05)"; // Empty state color
    }
    
    // Gradient computation from Indigo-dim to bright Indigo
    const intensity = Math.min(record.revenue / maxRevenue, 1);
    return `rgba(129, 140, 248, ${0.15 + intensity * 0.85})`;
  };

  const handleMouseMove = (e: React.MouseEvent, stateId: string) => {
    const bounds = e.currentTarget.parentElement?.getBoundingClientRect();
    if (bounds) {
      // Relative cursor tracking inside the SVG layout
      setTooltipPos({
        x: e.clientX - bounds.left + 15,
        y: e.clientY - bounds.top - 50,
      });
    }
    setHoveredState(stateId);
  };

  const handleMouseLeave = () => {
    setHoveredState(null);
  };

  const fmtINR = (n: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  };

  const hoverData = hoveredState ? data[hoveredState] : null;

  return (
    <div
      className="glass-card"
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        minHeight: "560px",
      }}
      id="india-sales-heatmap"
    >
      <div style={{ alignSelf: "flex-start", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "4px" }}>
          India Sales Heatmap
        </h3>
        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          Geographic sales distribution based on shipping destination state
        </p>
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: "550px", height: "auto" }}>
        <svg
          viewBox="0 0 612 696"
          style={{
            width: "100%",
            height: "100%",
            filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.4))",
          }}
        >
          {STATE_PATHS.map((state) => (
            <path
              key={state.id}
              d={state.d}
              fill={getFillColor(state.id)}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1.5"
              style={{
                transition: "all 0.2s ease",
                cursor: "pointer",
              }}
              onMouseMove={(e) => handleMouseMove(e, state.id)}
              onMouseLeave={handleMouseLeave}
              // Glow effect on hover
              opacity={hoveredState === state.id ? 0.95 : 0.8}
            />
          ))}
        </svg>

        {/* Floating Tooltip */}
        {hoveredState && (
          <div
            className="glass-card"
            style={{
              position: "absolute",
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
              pointerEvents: "none",
              padding: "10px 14px",
              zIndex: 10,
              backgroundColor: "rgba(17, 19, 24, 0.95)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-glow-indigo)",
              minWidth: "160px",
            }}
          >
            <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
              {hoveredState}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "0.72rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Orders:</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  {hoverData?.orders ? hoverData.orders.toLocaleString() : "0"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Revenue:</span>
                <span style={{ color: "var(--accent-indigo)", fontWeight: 700 }}>
                  {hoverData?.revenue ? fmtINR(hoverData.revenue) : "₹0"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div
        style={{
          marginTop: "auto",
          width: "100%",
          maxWidth: "340px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-secondary)" }}>
          <span>Low Sales</span>
          <span>High Sales</span>
        </div>
        <div
          style={{
            height: "6px",
            borderRadius: "var(--radius-full)",
            background: "linear-gradient(90deg, rgba(129, 140, 248, 0.15) 0%, rgba(129, 140, 248, 1) 100%)",
          }}
        />
      </div>
    </div>
  );
}
