"use client";

import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Scale, 
  Plus, 
  UserPlus, 
  UploadCloud, 
  Activity, 
  FileCheck2, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  FileDown, 
  FolderLock,
  Check, 
  Send,
  Loader2,
  Calendar,
  Layers,
  ChevronRight,
  RefreshCw,
  Search
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface ItDashboardProps {
  user: User;
  onBackToHub: () => void;
}

interface Taxpayer {
  id: string;
  pan_masked: string;
  legal_name: string;
  dob_or_incorp?: string;
  taxpayer_type: string;
  locale: string;
}

interface ExceptionItem {
  id: string;
  match_group_id: string | null;
  tax_year: string;
  exception_type: string;
  severity: "low" | "medium" | "high";
  explanation_code: string;
  explanation_text: string;
  recommended_action: string;
  status: "open" | "in_progress" | "resolved" | "ignored";
  created_at: string;
}

interface RemediationTask {
  id: string;
  assignee_user_id: string | null;
  action_type: string;
  due_date: string | null;
  resolution_note: string | null;
  status: "pending" | "resolved" | "cancelled";
  created_at: string;
}

const API_BASE = "http://localhost:8000/api/v1";

export default function ItDashboard({ user, onBackToHub }: ItDashboardProps) {
  // States
  const [taxpayers, setTaxpayers] = useState<Taxpayer[]>([]);
  const [selectedTaxpayer, setSelectedTaxpayer] = useState<Taxpayer | null>(null);
  const [taxYear, setTaxYear] = useState<string>("2025-26");
  const [activeTab, setActiveTab] = useState<"cockpit" | "upload" | "exceptions" | "handoff">("cockpit");
  
  // Registration Form State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newPan, setNewPan] = useState("");
  const [newName, setNewName] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newType, setNewType] = useState("Individual");
  const [registering, setRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Upload Panel State
  const [sourceType, setSourceType] = useState<"ais_json" | "form16_pdf" | "bank_csv" | "manual_claims_csv" | "form26as_txt">("ais_json");
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Reconciliation summary states
  const [reconSummary, setReconSummary] = useState<any>(null);
  const [topExceptions, setTopExceptions] = useState<ExceptionItem[]>([]);
  const [allExceptions, setAllExceptions] = useState<ExceptionItem[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  // Tasks states
  const [activeException, setActiveException] = useState<ExceptionItem | null>(null);
  const [exceptionTasks, setExceptionTasks] = useState<RemediationTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newTaskAction, setNewTaskAction] = useState("ask_deductor_revision");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolvingTaskId, setResolvingTaskId] = useState<string | null>(null);

  // Handoff state
  const [handoffData, setHandoffData] = useState<any>(null);
  const [loadingHandoff, setLoadingHandoff] = useState(false);

  // Download export state
  const [exporting, setExporting] = useState(false);

  // Load taxpayers on mount
  useEffect(() => {
    fetchTaxpayers();
  }, []);

  // Fetch summary when selectedTaxpayer changes
  useEffect(() => {
    if (selectedTaxpayer) {
      fetchSummary();
      fetchExceptions();
      if (activeTab === "handoff") {
        fetchHandoff();
      }
    }
  }, [selectedTaxpayer, taxYear, activeTab]);

  const fetchTaxpayers = async () => {
    try {
      const res = await fetch(`${API_BASE}/taxpayers?tenant_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setTaxpayers(data);
        if (data.length > 0) {
          setSelectedTaxpayer(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch taxpayers", err);
    }
  };

  const fetchSummary = async () => {
    if (!selectedTaxpayer) return;
    setLoadingSummary(true);
    try {
      const res = await fetch(`${API_BASE}/reconciliation/summary?taxpayer_id=${selectedTaxpayer.id}&tax_year=${taxYear}`);
      if (res.ok) {
        const data = await res.json();
        setReconSummary(data.summary);
        setTopExceptions(data.top_exceptions);
      }
    } catch (err) {
      console.error("Failed to fetch recon summary", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchExceptions = async () => {
    if (!selectedTaxpayer) return;
    try {
      const res = await fetch(`${API_BASE}/exceptions?taxpayer_id=${selectedTaxpayer.id}`);
      if (res.ok) {
        const data = await res.json();
        setAllExceptions(data);
      }
    } catch (err) {
      console.error("Failed to fetch exceptions", err);
    }
  };

  const fetchHandoff = async () => {
    if (!selectedTaxpayer) return;
    setLoadingHandoff(true);
    try {
      const res = await fetch(`${API_BASE}/itr-handoff/${selectedTaxpayer.id}/${taxYear}`);
      if (res.ok) {
        const data = await res.json();
        setHandoffData(data.prefill_data);
      }
    } catch (err) {
      console.error("Failed to fetch handoff", err);
    } finally {
      setLoadingHandoff(false);
    }
  };

  const handleRegisterTaxpayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/taxpayers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pan: newPan,
          legal_name: newName,
          dob_or_incorp: newDob || null,
          taxpayer_type: newType,
          locale: "en",
          tenant_id: user.id
        })
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setTaxpayers(prev => [...prev, data.taxpayer]);
        setSelectedTaxpayer(data.taxpayer);
        setShowRegisterModal(false);
        setNewPan("");
        setNewName("");
        setNewDob("");
      } else {
        setErrorMsg(data.detail || "Registration failed.");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to backend server.");
    } finally {
      setRegistering(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload || !selectedTaxpayer) return;

    setUploading(true);
    setUploadStatus("Uploading file...");
    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("taxpayer_id", selectedTaxpayer.id);
    formData.append("source_type", sourceType);

    try {
      const uploadRes = await fetch(`${API_BASE}/imports`, {
        method: "POST",
        body: formData
      });

      if (!uploadRes.ok) {
        throw new Error("Staging upload failed.");
      }

      const uploadData = await uploadRes.json();
      const batchId = uploadData.import_batch_id;

      setUploadStatus("Normalizing records in database fact tables...");
      const normRes = await fetch(`${API_BASE}/imports/${batchId}/normalize`, {
        method: "POST"
      });

      if (normRes.ok) {
        const normData = await normRes.json();
        setUploadStatus(`Successfully normalized ${normData.normalized_records} events from ${fileToUpload.name}!`);
        setFileToUpload(null);
        fetchSummary();
        fetchExceptions();
      } else {
        throw new Error("Normalization phase failed.");
      }
    } catch (err: any) {
      setUploadStatus(`Error: ${err.message || "Something went wrong"}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRunReconciliation = async () => {
    if (!selectedTaxpayer) return;
    setReconciling(true);
    try {
      const res = await fetch(`${API_BASE}/reconciliation/run`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          taxpayer_id: selectedTaxpayer.id,
          tax_year: taxYear
        })
      });

      if (res.ok) {
        fetchSummary();
        fetchExceptions();
      }
    } catch (err) {
      console.error("Reconciliation run failed", err);
    } finally {
      setReconciling(false);
    }
  };

  const fetchTasks = async (exception: ExceptionItem) => {
    setLoadingTasks(true);
    try {
      const res = await fetch(`${API_BASE}/exceptions/${exception.id}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setExceptionTasks(data);
      }
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeException) return;
    setCreatingTask(true);

    try {
      const res = await fetch(`${API_BASE}/exceptions/${activeException.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: newTaskAction,
          due_date: newTaskDueDate || null,
          assignee_user_id: user.id
        })
      });

      if (res.ok) {
        fetchTasks(activeException);
        setNewTaskDueDate("");
      }
    } catch (err) {
      console.error("Failed to create task", err);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleResolveTask = async (taskId: string) => {
    setResolvingTaskId(taskId);
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution_note: resolutionNote || "Remediation action completed successfully.",
          status: "resolved"
        })
      });

      if (res.ok) {
        if (activeException) {
          fetchTasks(activeException);
        }
        fetchSummary();
        fetchExceptions();
        setResolutionNote("");
      }
    } catch (err) {
      console.error("Failed to resolve task", err);
    } finally {
      setResolvingTaskId(null);
    }
  };

  const handleDownloadAuditPack = async () => {
    if (!selectedTaxpayer) return;
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/audit-pack/${selectedTaxpayer.id}/${taxYear}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ITRecon_AuditPack_${selectedTaxpayer.pan_masked}_${taxYear}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Failed to download audit pack", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen flex-col bg-[radial-gradient(circle_at_80%_12%,rgba(168,85,247,0.13),transparent_30%),linear-gradient(135deg,#050508_0%,#080a10_55%,#030405_100%)] text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-5 border-b border-white/10 bg-black/34 px-5 py-4 backdrop-blur-2xl lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <button 
            onClick={onBackToHub}
            className="metal-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-200"
            title="Back to Suite Hub"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-200/24 bg-violet-300/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              <Scale size={18} className="text-violet-100" />
            </div>
            <div className="min-w-0">
              <span className="font-display block truncate text-lg font-black uppercase tracking-[0.12em] text-slate-100">
                Direct Tax Recon Cockpit
              </span>
              <span className="mt-1 block text-xs text-slate-500">AIS, 26AS, Form 16, bank receipts, and ITR handoff.</span>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
          {/* Taxpayer Selector */}
          <div className="relative flex min-w-0 items-center gap-3">
            <select
              value={selectedTaxpayer?.id || ""}
              onChange={(e) => {
                const found = taxpayers.find(t => t.id === e.target.value);
                if (found) setSelectedTaxpayer(found);
              }}
              className="premium-select max-w-[22rem]"
            >
              {taxpayers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.legal_name} ({t.pan_masked})
                </option>
              ))}
              {taxpayers.length === 0 && <option value="">No taxpayer registered</option>}
            </select>
            
            <button
              onClick={() => setShowRegisterModal(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-dashed border-violet-300/24 bg-violet-300/8 text-violet-100 transition-all hover:border-violet-200/55 hover:bg-violet-300/14 active:scale-95"
              title="Register New Taxpayer Profile"
            >
              <UserPlus size={15} />
            </button>
          </div>

          {/* Tax Year Selector */}
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(e.target.value)}
            className="premium-select"
          >
            <option value="2025-26">FY 2025-26 (AY 2026-27)</option>
            <option value="2024-25">FY 2024-25 (AY 2025-26)</option>
          </select>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="hidden w-80 shrink-0 flex-col justify-between border-r border-white/10 bg-[#070911]/88 p-5 shadow-[18px_0_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl lg:flex">
          <div className="space-y-2.5">
            <button
              onClick={() => setActiveTab("cockpit")}
              className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] transition-all cursor-pointer ${
                activeTab === "cockpit" 
                  ? "border-violet-200/24 bg-violet-300/10 text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" 
                  : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              <Activity size={15} />
              Reconciliation Cockpit
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] transition-all cursor-pointer ${
                activeTab === "upload" 
                  ? "border-violet-200/24 bg-violet-300/10 text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" 
                  : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              <UploadCloud size={15} />
              Ingest & Normalize
            </button>
            <button
              onClick={() => setActiveTab("exceptions")}
              className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] transition-all cursor-pointer ${
                activeTab === "exceptions" 
                  ? "border-violet-200/24 bg-violet-300/10 text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" 
                  : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              <AlertTriangle size={15} />
              Mismatch Exceptions ({allExceptions.length})
            </button>
            <button
              onClick={() => setActiveTab("handoff")}
              className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] transition-all cursor-pointer ${
                activeTab === "handoff" 
                  ? "border-violet-200/24 bg-violet-300/10 text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" 
                  : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              <FileCheck2 size={15} />
              ITR filing Prefill Handoff
            </button>
          </div>

          {/* User consent card info */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-[11px] leading-relaxed text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="mb-2 flex items-center gap-2 font-bold uppercase tracking-wider text-violet-100">
              <FolderLock size={12} />
              Consent-Aware
            </div>
            Direct tax statement reconciliation requires explicit taxpayer consent under SPDI Rules and the DPDP Act. Consent logs are automatically recorded.
          </div>
        </aside>

        {/* Dashboard Workspace */}
        <main className="custom-scrollbar min-w-0 flex-1 overflow-y-auto p-5 lg:p-8">
          {/* Dashboard Loader */}
          {loadingSummary && (
            <div className="flex items-center justify-center h-full gap-2">
              <Loader2 className="animate-spin text-purple-500" size={18} />
              <span className="text-xs text-slate-400 font-medium">Querying ledger databases...</span>
            </div>
          )}

          {!loadingSummary && activeTab === "cockpit" && (
            <div className="mx-auto max-w-[1520px] space-y-7">
              {/* Cockpit Intro Banner */}
              <div className="relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-gradient-to-br from-[#171120] via-[#0d0f14] to-[#07080b] p-6 shadow-[0_22px_90px_rgba(0,0,0,0.34)] lg:p-8">
                <div className="absolute right-[-5rem] top-[-7rem] h-64 w-64 rounded-full bg-violet-300/12 blur-[90px]" />
                <div className="relative flex flex-col items-start justify-between gap-6 xl:flex-row">
                <div className="max-w-4xl">
                  <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.28em] text-violet-100/80">Government statement control</p>
                  <h1 className="font-display mb-3 flex items-center gap-2 text-3xl font-black uppercase tracking-[-0.03em] text-slate-100">
                    Cockpit Control Desk
                  </h1>
                  <p className="max-w-3xl text-sm leading-6 text-slate-400">
                    Compare official government statement records (26AS, AIS, TIS) against corporate Form 16 certificates, bank receipts, and manual workbook filing claims.
                  </p>
                </div>
                
                <div className="flex w-full flex-wrap gap-3 xl:w-auto xl:justify-end">
                  <button
                    onClick={handleRunReconciliation}
                    disabled={reconciling || !selectedTaxpayer}
                    className="premium-btn premium-btn-purple min-h-11 flex-1 xl:flex-none px-4 py-3 cursor-pointer whitespace-nowrap"
                  >
                    {reconciling ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} />}
                    Run Reconciliation Rules
                  </button>
                  
                  <button
                    onClick={handleDownloadAuditPack}
                    disabled={exporting || !selectedTaxpayer || !reconSummary}
                    className="premium-btn min-h-11 flex-1 xl:flex-none px-4 py-3 cursor-pointer whitespace-nowrap"
                  >
                    {exporting ? <Loader2 className="animate-spin" size={13} /> : <FileDown size={13} />}
                    Download Audit Pack
                  </button>
                </div>
                </div>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <div className="min-h-[145px] rounded-2xl border border-slate-800/80 bg-[#0c0d12]/70 backdrop-blur-xl p-6 relative overflow-hidden hover:border-purple-500/30 hover:-translate-y-1 transition-all duration-300 shadow-md">
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Matched groups</div>
                  <div className="text-3xl font-black tracking-tight text-slate-100">{reconSummary?.matched_groups || 0}</div>
                  <div className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle size={10} /> Fully matched credits
                  </div>
                </div>

                <div className="min-h-[145px] rounded-2xl border border-slate-800/80 bg-[#0c0d12]/70 backdrop-blur-xl p-6 relative overflow-hidden hover:border-indigo-500/30 hover:-translate-y-1 transition-all duration-300 shadow-md">
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Partial matches</div>
                  <div className="text-3xl font-black tracking-tight text-slate-100">{reconSummary?.partial_groups || 0}</div>
                  <div className="text-[10px] text-yellow-500 font-semibold mt-1 flex items-center gap-1">
                    <AlertTriangle size={10} /> Value/Timing discrepancies
                  </div>
                </div>

                <div className="min-h-[145px] rounded-2xl border border-slate-800/80 bg-[#0c0d12]/70 backdrop-blur-xl p-6 relative overflow-hidden hover:border-rose-500/30 hover:-translate-y-1 transition-all duration-300 shadow-md">
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Unmatched transactions</div>
                  <div className="text-3xl font-black tracking-tight text-slate-100">{reconSummary?.unmatched_groups || 0}</div>
                  <div className="text-[10px] text-red-400 font-semibold mt-1 flex items-center gap-1">
                    <AlertTriangle size={10} /> Omitted details in statements
                  </div>
                </div>

                <div className="min-h-[145px] rounded-2xl border border-slate-800/80 bg-[#0c0d12]/70 backdrop-blur-xl p-6 relative overflow-hidden hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300 shadow-md">
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Active exceptions</div>
                  <div className="text-3xl font-black tracking-tight text-slate-100">{reconSummary?.exception_count || 0}</div>
                  <div className="text-[10px] text-indigo-400 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle size={10} /> Outstanding remediation tickets
                  </div>
                </div>
              </div>

              {/* Exception Summary Panel */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Top Priority Mismatches</h3>
                <div className="border border-slate-800/80 rounded-3xl bg-[#090b10]/60 overflow-x-auto shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
                  <table className="w-full min-w-[1040px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-900 bg-[#0c0e14]/50">
                        <th className="px-6 py-4.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Type / Head</th>
                        <th className="px-6 py-4.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider w-2/5">Explanation Text</th>
                        <th className="px-6 py-4.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Severity</th>
                        <th className="px-6 py-4.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Playbook Action</th>
                        <th className="px-6 py-4.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-right">Resolve</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topExceptions.map((exc) => (
                        <tr key={exc.id} className="border-b border-slate-900/60 hover:bg-[#0c0e14]/25 transition-colors">
                          <td className="px-6 py-4.5">
                            <div className="font-bold text-slate-200 text-xs">{exc.exception_type.replace("_", " ")}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{exc.explanation_code}</div>
                          </td>
                          <td className="px-6 py-4.5 text-slate-300 text-xs leading-relaxed">
                            {exc.explanation_text}
                          </td>
                          <td className="px-6 py-4.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              exc.severity === "high" 
                                ? "bg-red-500/10 text-red-400 border-red-500/20" 
                                : (exc.severity === "medium" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20")
                            }`}>
                              {exc.severity}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 text-xs text-slate-400 max-w-xs truncate" title={exc.recommended_action}>
                            {exc.recommended_action}
                          </td>
                          <td className="px-6 py-4.5 text-right">
                            <button
                              onClick={() => {
                                setActiveException(exc);
                                fetchTasks(exc);
                                setActiveTab("exceptions");
                              }}
                              className="premium-btn premium-btn-purple min-h-10 px-4 py-2 cursor-pointer whitespace-nowrap"
                            >
                              Launch Playbook
                            </button>
                          </td>
                        </tr>
                      ))}
                      {topExceptions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-24 text-center">
                            <div className="flex flex-col items-center justify-center gap-3.5 max-w-md mx-auto">
                              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <CheckCircle size={20} className="animate-pulse" />
                              </div>
                              <span className="text-sm font-bold text-slate-200">No Mismatches Flagged</span>
                              <p className="text-xs text-slate-400 leading-relaxed">
                                No active compliance discrepancies found for this Assessment Year. Ensure files are uploaded and matching has run.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Ingest and Normalize Panel */}
          {activeTab === "upload" && (
            <div className="max-w-2xl mx-auto space-y-8">
              <div>
                <h1 className="text-xl font-extrabold text-slate-100 mb-1.5">Document Ingestion Pipeline</h1>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Stage files for reconciliation. Stage official government portal statements and your corresponding bank ledgers, and then run normalization rules to populate the canonical ledger.
                </p>
              </div>

              <form onSubmit={handleFileUpload} className="space-y-6 bg-[#0c0d12]/50 border border-slate-900 rounded-3xl p-8 shadow-lg">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Ingestion Category</label>
                  <select
                    value={sourceType}
                    onChange={(e: any) => setSourceType(e.target.value)}
                    className="w-full premium-select"
                  >
                    <option value="ais_json">Official AIS statement (JSON format)</option>
                    <option value="form26as_txt">Official Form 26AS (TXT/HTML format)</option>
                    <option value="form16_pdf">Employer Form 16 Certificate (JSON/PDF parser)</option>
                    <option value="bank_csv">Bank Statement Account Register (CSV format)</option>
                    <option value="manual_claims_csv">Filer Return Worksheet Claims (CSV format)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upload File Source</label>
                  <div className="border border-dashed border-slate-800 hover:border-purple-500/40 bg-slate-950/20 rounded-2xl p-8 text-center transition-all cursor-pointer relative group">
                    <input
                      type="file"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setFileToUpload(e.target.files[0]);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <UploadCloud size={32} className="mx-auto text-slate-500 group-hover:text-purple-400 transition-colors mb-3" />
                    <div className="text-xs font-bold text-slate-300 mb-1">
                      {fileToUpload ? fileToUpload.name : "Select or drag file to upload"}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      CSV, TXT, JSON formats accepted
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploading || !fileToUpload || !selectedTaxpayer}
                  className="w-full premium-btn premium-btn-purple py-3.5 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      Processing file pipeline...
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      Ingest & Normalize Document
                    </>
                  )}
                </button>

                {uploadStatus && (
                  <div className="rounded-xl border border-slate-900 bg-slate-950/50 p-4 text-xs font-semibold font-mono text-purple-300 text-center leading-relaxed">
                    {uploadStatus}
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Exceptions and Tasks Panel */}
          {activeTab === "exceptions" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Exceptions List */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-100 mb-1.5">Mismatch Exception Queue</h1>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Active compliance discrepancies detected by rules engine. Launch playbooks to assign tasks, contact deductors, or record adjustments.
                  </p>
                </div>

                <div className="border border-slate-900 rounded-2xl bg-[#090b10]/40 overflow-hidden">
                  <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-slate-900 bg-[#0c0e14]/50 sticky top-0 z-10">
                          <th className="px-6 py-4.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mismatch Scope</th>
                          <th className="px-6 py-4.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-4.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allExceptions.map((exc) => (
                          <tr 
                            key={exc.id} 
                            onClick={() => {
                              setActiveException(exc);
                              fetchTasks(exc);
                            }}
                            className={`border-b border-slate-900/60 hover:bg-[#0c0e14]/25 transition-colors cursor-pointer ${
                              activeException?.id === exc.id ? "bg-[#0d0f15]/80" : ""
                            }`}
                          >
                            <td className="px-6 py-4.5">
                              <div className="font-bold text-slate-200 text-xs">{exc.exception_type.replace("_", " ")}</div>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider mt-1 border ${
                                exc.severity === "high" 
                                  ? "bg-red-500/10 text-red-400 border-red-500/20" 
                                  : (exc.severity === "medium" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20")
                              }`}>
                                {exc.severity}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 text-xs text-slate-300 max-w-sm truncate" title={exc.explanation_text}>
                              {exc.explanation_text}
                            </td>
                            <td className="px-6 py-4.5">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                exc.status === "open"
                                  ? "bg-red-500/5 text-red-400 border border-red-500/15"
                                  : (exc.status === "in_progress" ? "bg-yellow-500/5 text-yellow-400 border border-yellow-500/15" : "bg-emerald-500/5 text-emerald-400 border border-emerald-500/15")
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  exc.status === "open" ? "bg-red-400" : (exc.status === "in_progress" ? "bg-yellow-400" : "bg-emerald-400")
                                }`} />
                                {exc.status.replace("_", " ")}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 text-right">
                              <ChevronRight size={14} className="inline text-slate-600" />
                            </td>
                          </tr>
                        ))}
                        {allExceptions.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-xs">
                              No active compliance exceptions found for this taxpayer.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Playbook Drawer/Right Panel */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Remediation playbook</h3>
                
                {activeException ? (
                  <div className="rounded-2xl border border-slate-900 bg-[#090b10]/40 p-6 space-y-6">
                    {/* Exception Detail */}
                    <div>
                      <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Active Discrepancy</div>
                      <h4 className="text-sm font-bold text-slate-100 mb-2">{activeException.exception_type.replace("_", " ")}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">{activeException.explanation_text}</p>
                      
                      <div className="rounded-xl bg-purple-500/5 border border-purple-500/10 p-4 text-[11px] text-purple-300 leading-relaxed">
                        <div className="font-bold uppercase tracking-wider mb-1">Recommended Action</div>
                        {activeException.recommended_action}
                      </div>
                    </div>

                    {/* Task Actions list */}
                    <div className="space-y-4 pt-4 border-t border-slate-900">
                      <div className="text-xs font-bold text-slate-200">Remediation Playbook Tasks</div>
                      
                      <div className="space-y-3">
                        {exceptionTasks.map((task) => (
                          <div key={task.id} className="rounded-xl border border-slate-900 bg-slate-950/40 p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="text-xs font-bold text-slate-300">
                                {task.action_type.replace(/_/g, " ").toUpperCase()}
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border ${
                                task.status === "pending"
                                  ? "bg-yellow-500/5 text-yellow-400 border-yellow-500/15"
                                  : "bg-emerald-500/5 text-emerald-400 border-emerald-500/15"
                              }`}>
                                {task.status}
                              </span>
                            </div>
                            
                            {task.due_date && (
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                <Calendar size={11} /> Due Date: {task.due_date}
                              </div>
                            )}

                            {task.status === "pending" ? (
                              <div className="space-y-2 pt-2 border-t border-slate-900/60">
                                <input
                                  type="text"
                                  value={resolutionNote}
                                  onChange={(e) => setResolutionNote(e.target.value)}
                                  placeholder="Type resolution remarks..."
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
                                />
                                <button
                                  onClick={() => handleResolveTask(task.id)}
                                  disabled={resolvingTaskId === task.id}
                                  className="premium-btn premium-btn-emerald py-2 px-4 cursor-pointer"
                                >
                                  {resolvingTaskId === task.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                                  Mark Resolved & Close
                                </button>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 leading-relaxed pt-2 border-t border-slate-900/40 font-medium">
                                <span className="font-bold text-slate-500 block mb-0.5">Resolution Notes</span>
                                "{task.resolution_note}"
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {exceptionTasks.length === 0 && !loadingTasks && (
                          <div className="text-center text-slate-600 text-[11px] py-4">
                            No tasks created for this discrepancy playbook.
                          </div>
                        )}
                      </div>

                      {/* Add new task Form */}
                      <form onSubmit={handleCreateTask} className="space-y-3 pt-3 border-t border-slate-900">
                        <select
                          value={newTaskAction}
                          onChange={(e) => setNewTaskAction(e.target.value)}
                          className="w-full premium-select"
                        >
                          <option value="ask_deductor_revision">Ask deductor to revise TDS return</option>
                          <option value="file_rectification">File income tax rectification request</option>
                          <option value="revise_return">Revise filed income tax return (ITR)</option>
                          <option value="submit_ais_feedback">Submit feedback response on AIS portal</option>
                          <option value="ignore_informational">Mark and ignore as informational mismatch</option>
                        </select>

                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
                          />
                          <button
                            type="submit"
                            disabled={creatingTask}
                            className="premium-btn premium-btn-purple py-2.5 px-4.5 cursor-pointer"
                          >
                            {creatingTask ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-900 border-dashed bg-slate-950/10 p-12 text-center text-slate-600 text-xs">
                    <HelpCircle size={32} className="mx-auto text-slate-700 mb-3" />
                    Select an active exception from the queue to run compliance remediation playbook actions.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ITR Handoff Prefill Panel */}
          {activeTab === "handoff" && (
            <div className="max-w-3xl mx-auto space-y-8">
              <div>
                <h1 className="text-xl font-extrabold text-slate-100 mb-1.5 flex items-center gap-2">
                  ITR Filing Prefill Summary
                </h1>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Export verified direct tax transaction values grouped by Income Heads. Sums matching credits to prefill tax filing returns securely.
                </p>
              </div>

              {loadingHandoff ? (
                <div className="flex items-center justify-center py-12 gap-2">
                  <Loader2 className="animate-spin text-purple-500" size={18} />
                  <span className="text-xs text-slate-400">Computing income aggregation ledger...</span>
                </div>
              ) : handoffData ? (
                <div className="space-y-6 bg-[#0c0d12]/50 border border-slate-900 rounded-3xl p-8 shadow-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-xl border border-slate-900 bg-slate-950 p-5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Income from salary</div>
                      <div className="text-2xl font-black text-slate-200">₹{handoffData.income_from_salary.toLocaleString()}</div>
                    </div>
                    
                    <div className="rounded-xl border border-slate-900 bg-slate-950 p-5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Income from Profession</div>
                      <div className="text-2xl font-black text-slate-200">₹{handoffData.income_from_business_profession.toLocaleString()}</div>
                    </div>
                    
                    <div className="rounded-xl border border-slate-900 bg-slate-950 p-5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Income from Other Sources</div>
                      <div className="text-2xl font-black text-slate-200">₹{handoffData.income_from_other_sources.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-900 bg-purple-600/5 p-6 space-y-2">
                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Total claimable tax credit</div>
                    <div className="text-3xl font-black text-purple-300">₹{handoffData.total_tds_tax_credits_claimable.toLocaleString()}</div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Verified TDS tax credits that have been fully reconciled and matched against Form 26AS/AIS statements and are safe to claim on portal filings.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">TDS Schedule Details</h4>
                    <div className="border border-slate-900 rounded-xl bg-slate-950 overflow-hidden">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-900 bg-[#0c0e14]/50">
                            <th className="px-5 py-3.5 font-bold text-slate-400 uppercase tracking-wider">Deductor TAN</th>
                            <th className="px-5 py-3.5 font-bold text-slate-400 uppercase tracking-wider">Deductor Name</th>
                            <th className="px-5 py-3.5 font-bold text-slate-400 uppercase tracking-wider w-1/4">Gross Receipts</th>
                            <th className="px-5 py-3.5 font-bold text-slate-400 uppercase tracking-wider text-right w-1/4">TDS Deducted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {handoffData.tds_schedule_details.map((sch: any, idx: number) => (
                            <tr key={idx} className="border-b border-slate-900/60 hover:bg-[#0c0e14]/25 transition-colors">
                              <td className="px-5 py-3.5 font-mono text-slate-300 font-bold">{sch.tan}</td>
                              <td className="px-5 py-3.5 text-slate-400">{sch.deductor_name}</td>
                              <td className="px-5 py-3.5 text-slate-200">₹{sch.gross_amount.toLocaleString()}</td>
                              <td className="px-5 py-3.5 text-right font-bold text-purple-400">₹{sch.tds_deducted.toLocaleString()}</td>
                            </tr>
                          ))}
                          {handoffData.tds_schedule_details.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-5 py-8 text-center text-slate-600">
                                No verified TDS records found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-900 border-dashed bg-slate-950/10 p-12 text-center text-slate-600 text-xs">
                  Run reconciliation from cockpit control first to compile ITR prefill handoffs.
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Register Taxpayer Profile Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040508]/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0a0c10] border border-slate-900 rounded-3xl p-8 relative shadow-2xl space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-slate-100 mb-1.5 flex items-center gap-2">
                <UserPlus size={16} className="text-purple-400" />
                Register Taxpayer Profile
              </h2>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Add a new client PAN profile. All personal records remain end-to-end encrypted under zero-knowledge keys.
              </p>
            </div>

            <form onSubmit={handleRegisterTaxpayer} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PAN (Permanent Account Number)</label>
                <input
                  type="text"
                  required
                  value={newPan}
                  onChange={(e) => setNewPan(e.target.value)}
                  placeholder="E.g. ABCDE1234F"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Legal Name (As on PAN card)</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="E.g. Rajesh Kumar"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</label>
                  <input
                    type="date"
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Taxpayer Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full premium-select"
                  >
                    <option value="Individual">Individual</option>
                    <option value="HUF">HUF</option>
                    <option value="Company">Company</option>
                    <option value="Firm">Partnership Firm</option>
                  </select>
                </div>
              </div>

              {errorMsg && (
                <div className="text-[10px] font-bold text-red-400 text-center leading-relaxed">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 premium-btn cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="flex-1 premium-btn premium-btn-purple cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {registering && <Loader2 className="animate-spin" size={13} />}
                  Register Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
