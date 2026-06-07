"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "../lib/supabase";
import {
  Shield,
  ArrowRightLeft,
  BarChart3,
  FileSpreadsheet,
  Zap,
  Lock,
} from "lucide-react";

const features = [
  {
    icon: FileSpreadsheet,
    title: "Bulk Upload",
    desc: "Stream 100k+ row reports directly into the database in chunks.",
  },
  {
    icon: ArrowRightLeft,
    title: "Auto-Reconcile",
    desc: "SQL-powered matching of sales vs payment data in seconds.",
  },
  {
    icon: BarChart3,
    title: "Audit Dashboard",
    desc: "Instant variance detection and GSTR-1 ready analytics.",
  },
  {
    icon: Zap,
    title: "Zero Cost",
    desc: "Runs entirely on free tiers — Vercel, Render, Supabase.",
  },
];

export default function AuthPage() {
  return (
    <main
      style={{
        display: "flex",
        minHeight: "100vh",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* LEFT PANEL — Branding */}
      <div
        style={{
          flex: "1 1 55%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "4rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background orb */}
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "-10%",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", maxWidth: "560px" }}>
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "3rem",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                background: "var(--gradient-hero)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={22} color="#07080a" strokeWidth={2.5} />
            </div>
            <span
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                background: "var(--gradient-hero)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              TaxRecon
            </span>
          </div>

          {/* Hero copy */}
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3.2rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: "1.25rem",
            }}
          >
            E-Commerce Tax
            <br />
            <span
              style={{
                background: "var(--gradient-hero)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Reconciliation
            </span>
          </h1>

          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              marginBottom: "3rem",
              maxWidth: "480px",
            }}
          >
            Match your marketplace sales reports against bank settlements.
            Detect GST discrepancies, flag under-reporting, and generate
            audit-ready variance reports — all from one dashboard.
          </p>

          {/* Feature grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            {features.map((f) => (
              <div
                key={f.title}
                className="glass-card"
                style={{
                  padding: "1.1rem",
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--accent-indigo-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <f.icon size={18} color="var(--accent-indigo)" />
                </div>
                <div>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      marginBottom: "3px",
                    }}
                  >
                    {f.title}
                  </p>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                    }}
                  >
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Auth Form */}
      <div
        style={{
          flex: "1 1 45%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          borderLeft: "1px solid var(--border-subtle)",
          background: "var(--bg-secondary)",
        }}
      >
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <div style={{ marginBottom: "2rem", textAlign: "center" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-md)",
                background: "var(--accent-indigo-dim)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
              }}
            >
              <Lock size={22} color="var(--accent-indigo)" />
            </div>
            <h2
              style={{
                fontSize: "1.4rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                marginBottom: "0.4rem",
              }}
            >
              Welcome back
            </h2>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.875rem",
              }}
            >
              Sign in to your reconciliation dashboard
            </p>
          </div>

          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "#818cf8",
                    brandAccent: "#6366f1",
                    brandButtonText: "#07080a",
                    inputBackground: "#12141b",
                    inputBorder: "rgba(255,255,255,0.1)",
                    inputText: "#f0f1f5",
                    inputPlaceholder: "#565a6e",
                    messageText: "#8b8fa3",
                    anchorTextColor: "#818cf8",
                    dividerBackground: "rgba(255,255,255,0.06)",
                  },
                  space: {
                    inputPadding: "12px",
                  },
                  borderWidths: {
                    inputBorderWidth: "1px",
                  },
                  radii: {
                    inputBorderRadius: "12px",
                    buttonBorderRadius: "12px",
                  },
                },
              },
            }}
            providers={[]}
            redirectTo={
              typeof window !== "undefined" ? window.location.origin : ""
            }
          />
        </div>
      </div>
    </main>
  );
}
