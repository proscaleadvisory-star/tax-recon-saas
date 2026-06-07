"use client";

import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import type { User } from "@supabase/supabase-js";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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
        }}
      >
        <div className="spinner" />
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Loading TaxRecon...
        </p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <Dashboard user={user} />;
}
