"use client";

import { useState, useCallback, useRef } from "react";
import { UploadCloud, AlertTriangle, FileSpreadsheet, Sparkles } from "lucide-react";
import { fetchPreview, uploadWarehouseLogs, type PreviewResponse } from "../lib/api";
import SchemaMapper from "./SchemaMapper";

interface Props {
  userId: string;
  monthYear: string;
  onUploadComplete: () => void;
}

type FileTypeCat = "sales" | "payment" | "return" | "catalog" | "warehouse";

export default function FileUpload({ userId, monthYear, onUploadComplete }: Props) {
  const [fileType, setFileType] = useState<FileTypeCat>("sales");
  const [isParsing, setIsParsing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsParsing(true);
    setError(null);
    setPreviewData(null);
    setActiveFile(file);
    setStatusMsg(fileType === "warehouse" ? "Uploading warehouse logs..." : "Analyzing schema layout...");

    try {
      if (fileType === "warehouse") {
        const res = await uploadWarehouseLogs(file, userId);
        alert(res.message);
        setPreviewData(null);
        setActiveFile(null);
        onUploadComplete();
      } else {
        const preview = await fetchPreview(file, userId, fileType);
        setPreviewData(preview);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Schema analysis failed");
      setActiveFile(null);
    } finally {
      setIsParsing(false);
      setStatusMsg("");
    }
  }, [userId, fileType, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleMapperComplete = (msg: string) => {
    setPreviewData(null);
    setActiveFile(null);
    alert(msg);
    onUploadComplete();
  };

  const getLabel = () => {
    switch (fileType) {
      case "sales": return "Sales Orders Report";
      case "payment": return "Marketplace Payout Report";
      case "return": return "Customer Sales Returns";
      case "catalog": return "Product Catalog (COGS Master)";
      case "warehouse": return "Warehouse Return Inward Logs";
    }
  };

  return (
    <div className="glass-card" style={{ padding: "20px" }} id="file-uploader-card">
      {/* File type selector tabs */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "10px" }}>
        {(["sales", "payment", "return", "catalog", "warehouse"] as FileTypeCat[]).map((type) => (
          <button
            key={type}
            onClick={() => { setFileType(type); setPreviewData(null); }}
            style={{
              padding: "6px 12px",
              fontSize: "0.72rem",
              fontWeight: 600,
              textTransform: "uppercase",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              background: fileType === type ? "var(--accent-indigo-dim)" : "transparent",
              color: fileType === type ? "var(--accent-indigo)" : "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            {type}
          </button>
        ))}
      </div>

      <div
        className="dropzone"
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); }}
        onClick={() => inputRef.current?.click()}
        style={{ padding: "2.5rem 1.5rem" }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
          style={{ display: "none" }}
        />

        {isParsing ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <div className="spinner" />
            <p className="pulse-text" style={{ fontSize: "0.85rem", color: "var(--accent-indigo)", fontWeight: 600 }}>
              {statusMsg}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", background: "var(--accent-indigo-dim)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
              <UploadCloud size={20} color="var(--accent-indigo)" />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "3px" }}>
                Upload {getLabel()}
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.72rem" }}>
                Drag and drop CSV/Excel here
              </p>
            </div>
            <span className="badge" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", display: "inline-flex", gap: "4px", fontSize: "0.65rem", padding: "3px 8px" }}>
              <Sparkles size={10} color="var(--accent-indigo)" /> Schema Auto-Detect enabled
            </span>
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: "10px", display: "flex", gap: "6px", alignItems: "center", color: "var(--accent-rose)", fontSize: "0.75rem", padding: "6px 12px", background: "var(--accent-rose-dim)", borderRadius: "var(--radius-sm)" }}>
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {/* Pop up schema mapper modal if preview analytics is loaded */}
      {previewData && activeFile && (
        <SchemaMapper
          preview={previewData}
          file={activeFile}
          userId={userId}
          monthYear={monthYear}
          onClose={() => { setPreviewData(null); setActiveFile(null); }}
          onComplete={handleMapperComplete}
        />
      )}
    </div>
  );
}
