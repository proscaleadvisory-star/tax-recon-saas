"use client";

import { useState, useEffect } from "react";
import { X, Play, Save, Check } from "lucide-react";
import type { PreviewResponse } from "../lib/api";
import { uploadStream, saveTemplate } from "../lib/api";

interface Props {
  preview: PreviewResponse;
  userId: string;
  monthYear: string;
  file: File;
  onClose: () => void;
  onComplete: (msg: string) => void;
}

export default function SchemaMapper({
  preview,
  userId,
  monthYear,
  file,
  onClose,
  onComplete,
}: Props) {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [templateName, setTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize mappings with fuzzy matching suggestions
  useEffect(() => {
    const initialMappings: Record<string, string> = {};
    // Apply suggestions from API
    Object.entries(preview.suggested_mappings).forEach(([raw, canonical]) => {
      initialMappings[raw] = canonical;
    });
    setMappings(initialMappings);
  }, [preview]);

  const handleSelectTemplate = (tpl: typeof preview.saved_templates[0]) => {
    setMappings(tpl.mapping);
    setTemplateName(tpl.name);
  };

  const handleMapChange = (rawHeader: string, canonicalKey: string) => {
    setMappings((prev) => {
      const next = { ...prev };
      if (!canonicalKey) {
        delete next[rawHeader];
      } else {
        next[rawHeader] = canonicalKey;
      }
      return next;
    });
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      setError("Please enter a template name");
      return;
    }
    setIsSavingTemplate(true);
    setError(null);
    try {
      await saveTemplate(userId, templateName, preview.file_type, mappings);
      alert("Template saved successfully!");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleIngest = async () => {
    // Validate required fields
    const missingFields: string[] = [];
    Object.entries(preview.canonical_schema).forEach(([key, spec]) => {
      if (spec.required) {
        const isMapped = Object.values(mappings).includes(key);
        if (!isMapped) {
          missingFields.push(spec.label);
        }
      }
    });

    if (missingFields.length > 0) {
      setError(`Please map the following required fields: ${missingFields.join(", ")}`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const res = await uploadStream(file, userId, preview.file_type, monthYear, mappings);
      onComplete(res.message);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ingestion streaming failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "20px",
      }}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "850px",
          height: "560px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: 0,
          backgroundColor: "var(--bg-secondary)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "4px" }}>
              Dynamic Schema Mapper
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              Mapping: <span style={{ color: "var(--accent-indigo)" }}>{file.name}</span> as{" "}
              <span style={{ textTransform: "uppercase", fontWeight: 600 }}>{preview.file_type}</span>
              {preview.contract_id && (
                <span className="badge" style={{ background: "var(--accent-indigo-dim)", color: "var(--accent-indigo)", fontSize: "0.68rem", padding: "2px 6px" }}>
                  Contract: {preview.contract_id}
                </span>
              )}
              {preview.confidence_level && (
                <span className="badge" style={{ 
                  background: preview.confidence_level === "live_sample_verified" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                  color: preview.confidence_level === "live_sample_verified" ? "#10b981" : "#f59e0b",
                  fontSize: "0.68rem", 
                  padding: "2px 6px" 
                }}>
                  {preview.confidence_level.replace("_", " ")}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Validation Errors */}
        {preview.validation_errors && preview.validation_errors.length > 0 && (
          <div style={{ padding: "10px 24px", background: "rgba(239, 68, 68, 0.15)", color: "var(--accent-rose)", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "4px", borderBottom: "1px solid var(--border-subtle)" }}>
            <strong>Validation Errors/Warnings:</strong>
            <ul style={{ margin: 0, paddingLeft: "16px" }}>
              {preview.validation_errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        {/* Suitability Indicators */}
        {preview.suitability && preview.suitability.length > 0 && (
          <div style={{ padding: "8px 24px", background: "rgba(16, 185, 129, 0.08)", fontSize: "0.72rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.68rem" }}>SUITABILITY:</span>
            {preview.suitability.map(flag => (
              <span key={flag} style={{ color: "#10b981", fontWeight: 600 }}>
                ✓ {flag.replace("suitable_for_", "").replace("_", " ").toUpperCase()}
              </span>
            ))}
          </div>
        )}

        {/* Templates Quick Load */}
        {preview.saved_templates.length > 0 && (
          <div
            style={{
              padding: "12px 24px",
              background: "var(--bg-card)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Apply Layout:
            </span>
            {preview.saved_templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => handleSelectTemplate(tpl)}
                className="premium-btn py-1 px-3 cursor-pointer text-[10px]"
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                {tpl.name}
              </button>
            ))}
          </div>
        )}

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Mappings Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
              Match Source Headers
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "260px", overflowY: "auto", paddingRight: "4px" }}>
              {preview.raw_headers.map((raw) => (
                <div
                  key={raw}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      maxWidth: "160px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={raw}
                  >
                    {raw}
                  </span>
                  <select
                    value={mappings[raw] || ""}
                    onChange={(e) => handleMapChange(raw, e.target.value)}
                    style={{
                      background: "var(--bg-card)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      padding: "4px 8px",
                      fontSize: "0.75rem",
                      outline: "none",
                      width: "180px",
                    }}
                  >
                    <option value="">-- Skip Column --</option>
                    {Object.entries(preview.canonical_schema).map(([key, spec]) => (
                      <option key={key} value={key}>
                        {spec.label} {spec.required ? "*" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Value Previews Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
              Input File Row Preview
            </h4>
            <div
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: "16px",
                flex: 1,
                overflowY: "auto",
                maxHeight: "260px",
              }}
            >
              {preview.preview_rows.slice(0, 3).map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: "16px",
                    paddingBottom: "12px",
                    borderBottom: idx < 2 ? "1px solid var(--border-subtle)" : "none",
                  }}
                >
                  <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-indigo)", marginBottom: "6px" }}>
                    ROW #{idx + 1}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: "0.72rem" }}>
                    {Object.entries(row).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>{k}:</span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Area */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Template Input */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="e.g., Amazon Tax Map V2"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="input-field"
              style={{ width: "200px", fontSize: "0.8rem", padding: "6px 10px" }}
            />
            <button
              onClick={handleSaveTemplate}
              disabled={isSavingTemplate || Object.keys(mappings).length === 0}
              className="premium-btn border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white cursor-pointer py-1.5 px-3.5 text-xs"
            >
              <Save size={14} /> Save Template
            </button>
          </div>

          {/* Action trigger */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={onClose} className="premium-btn border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white cursor-pointer px-4.5 py-2 text-xs">
              Cancel
            </button>
            <button
              onClick={handleIngest}
              disabled={isProcessing}
              className="premium-btn premium-btn-purple cursor-pointer px-6 py-2 text-xs"
            >
              {isProcessing ? (
                "Ingesting..."
              ) : (
                <>
                  <Play size={14} /> Stream to Staging
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 24px",
              background: "var(--accent-rose-dim)",
              color: "var(--accent-rose)",
              fontSize: "0.78rem",
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
