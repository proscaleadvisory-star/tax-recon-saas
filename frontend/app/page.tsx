"use client";

import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import type { User } from "@supabase/supabase-js";
import AuthPage from "./components/AuthPage";
import HubPage from "./components/HubPage";
import Dashboard from "./components/Dashboard";
import GstDashboard from "./components/GstDashboard";
import ItDashboard from "./components/ItDashboard";
import ProfitabilityDashboard from "./components/ProfitabilityDashboard";
import FpaDashboard from "./components/FpaDashboard";

type ToolKey = "taxrecon" | "gstrecon" | "itrecon" | "profitability" | "fpa";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTool, setCurrentTool] = useState<"hub" | ToolKey>("hub");

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setCurrentTool("hub");
      }
      window.localStorage.removeItem("client-suite-pending-tool");
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        window.localStorage.removeItem("client-suite-pending-tool");
        setCurrentTool("hub");
      }
      if (!session) {
        setCurrentTool("hub"); // reset tool choice on logout
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "16px",
          flexDirection: "column",
          background: "#05070B",
          color: "#F8FAFC",
        }}
      >
        <div className="spinner" />
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Loading ProScale Advisory...
        </p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (currentTool === "taxrecon") {
    return <Dashboard user={user} onBackToHub={() => setCurrentTool("hub")} />;
  }

  if (currentTool === "gstrecon") {
    return <GstDashboard onBackToHub={() => setCurrentTool("hub")} />;
  }

  if (currentTool === "itrecon") {
    return <ItDashboard user={user} onBackToHub={() => setCurrentTool("hub")} />;
  }

  if (currentTool === "profitability") {
    return <ProfitabilityDashboard onBackToHub={() => setCurrentTool("hub")} />;
  }

  if (currentTool === "fpa" && user) {
    return <FpaDashboard user={user} onBackToHub={() => setCurrentTool("hub")} />;
  }

  return <HubPage user={user} onSelectTool={setCurrentTool} />;
}
