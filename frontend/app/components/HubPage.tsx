"use client";

import { useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  ArrowDownToLine,
  Bell,
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Search,
  ShieldCheck,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";

type ModuleKey = "ecommerce" | "gst" | "profit" | "tax" | "cfo";

type ModuleConfig = {
  key: ModuleKey;
  title: string;
  eyebrow: string;
  description: string;
  icon: typeof ReceiptText;
  accent: string;
  kpis: Array<{ label: string; value: string; tone: "success" | "warning" | "neutral" }>;
  rows: Array<{ item: string; source: string; owner: string; status: string; amount: string }>;
  queue: string[];
  evidence: string[];
};

const modules: ModuleConfig[] = [
  {
    key: "ecommerce",
    title: "Ecommerce Reconciliation",
    eyebrow: "Marketplace settlement control",
    description: "Match marketplace payouts, bank settlements, SKU leakage, GST variance and dispute packs in one reviewed workspace.",
    icon: ReceiptText,
    accent: "#22D3EE",
    kpis: [
      { label: "Files received", value: "12", tone: "neutral" },
      { label: "Open exceptions", value: "18", tone: "warning" },
      { label: "Ready evidence", value: "7", tone: "success" },
      { label: "Review owners", value: "4", tone: "neutral" },
    ],
    rows: [
      { item: "Amazon payout batch", source: "Marketplace report", owner: "Finance", status: "Needs review", amount: "INR 8.4L" },
      { item: "Bank settlement mapping", source: "ICICI statement", owner: "Treasury", status: "Matched", amount: "INR 8.1L" },
      { item: "SKU claim leakage", source: "Returns ledger", owner: "Ops", status: "Evidence draft", amount: "INR 42K" },
      { item: "GST variance pack", source: "Tax workbook", owner: "Tax", status: "Queued", amount: "INR 71K" },
    ],
    queue: ["Confirm marketplace fee rule", "Attach bank receipt evidence", "Assign SKU leakage owner"],
    evidence: ["Settlement workbook", "Dispute packet", "Variance memo"],
  },
  {
    key: "gst",
    title: "GST Recon Engine",
    eyebrow: "Input credit review",
    description: "Cross-check purchase books with GSTR-2B, tune fuzzy keys, and export exception evidence without noisy screens.",
    icon: Zap,
    accent: "#8B5CF6",
    kpis: [
      { label: "Vendor files", value: "31", tone: "neutral" },
      { label: "Blocked credits", value: "9", tone: "warning" },
      { label: "Resolved matches", value: "24", tone: "success" },
      { label: "Export packs", value: "5", tone: "neutral" },
    ],
    rows: [
      { item: "GSTR-2B invoice group", source: "Government return", owner: "GST lead", status: "Matched", amount: "INR 2.8L" },
      { item: "Vendor filing gap", source: "Purchase book", owner: "AP", status: "Needs review", amount: "INR 64K" },
      { item: "Fuzzy GSTIN match", source: "Vendor master", owner: "Tax", status: "Queued", amount: "INR 28K" },
      { item: "Credit evidence pack", source: "Recon workbook", owner: "GST lead", status: "Ready", amount: "INR 1.1L" },
    ],
    queue: ["Review unmatched vendor GSTIN", "Send filing gap reminder", "Export credit evidence"],
    evidence: ["GSTR-2B exception list", "Vendor follow-up log", "Credit claim packet"],
  },
  {
    key: "profit",
    title: "Profit Cockpit",
    eyebrow: "SKU margin control",
    description: "Track SKU economics, returns, COGS drift, runaway ads and weighted revenue leakage with a focused operating queue.",
    icon: CircleDollarSign,
    accent: "#10B981",
    kpis: [
      { label: "SKU groups", value: "48", tone: "neutral" },
      { label: "Margin reviews", value: "11", tone: "warning" },
      { label: "Closed claims", value: "14", tone: "success" },
      { label: "Cost rules", value: "6", tone: "neutral" },
    ],
    rows: [
      { item: "Weighted revenue leakage", source: "SKU ledger", owner: "Category", status: "Needs review", amount: "INR 96K" },
      { item: "COGS drift rule", source: "Inventory book", owner: "Finance", status: "Queued", amount: "INR 1.3L" },
      { item: "Return claim packet", source: "Marketplace returns", owner: "Ops", status: "Evidence draft", amount: "INR 37K" },
      { item: "Ad spend exception", source: "Campaign exports", owner: "Growth", status: "Matched", amount: "INR 52K" },
    ],
    queue: ["Approve COGS rule update", "Review return claim evidence", "Tag runaway ad groups"],
    evidence: ["SKU margin workbook", "COGS change log", "Claim evidence pack"],
  },
  {
    key: "tax",
    title: "Direct Tax Recon",
    eyebrow: "Evidence desk",
    description: "Reconcile AIS, TIS, Form 16, bank receipts and remediation tasks from a single audit-ready review desk.",
    icon: FileCheck2,
    accent: "#F59E0B",
    kpis: [
      { label: "Statements loaded", value: "8", tone: "neutral" },
      { label: "Open tasks", value: "13", tone: "warning" },
      { label: "Evidence ready", value: "6", tone: "success" },
      { label: "Owners", value: "3", tone: "neutral" },
    ],
    rows: [
      { item: "AIS receipt mismatch", source: "AIS statement", owner: "Tax", status: "Needs review", amount: "INR 1.7L" },
      { item: "Form 16 mapping", source: "Payroll upload", owner: "HR finance", status: "Matched", amount: "INR 74K" },
      { item: "Bank receipt proof", source: "Bank statement", owner: "Treasury", status: "Evidence draft", amount: "INR 2.2L" },
      { item: "TIS remediation note", source: "Tax workbook", owner: "Tax", status: "Queued", amount: "INR 43K" },
    ],
    queue: ["Attach bank receipt copy", "Review AIS category", "Prepare remediation note"],
    evidence: ["AIS reconciliation memo", "Form 16 packet", "Receipt evidence folder"],
  },
  {
    key: "cfo",
    title: "Virtual CFO OS",
    eyebrow: "Local finance operating system",
    description: "Run budget grids, forecasts, variance reports, ledger audits and CFO chat locally with consistent review governance.",
    icon: Bot,
    accent: "#22D3EE",
    kpis: [
      { label: "Planning views", value: "5", tone: "neutral" },
      { label: "Variance reviews", value: "10", tone: "warning" },
      { label: "Reports ready", value: "4", tone: "success" },
      { label: "Local tables", value: "18", tone: "neutral" },
    ],
    rows: [
      { item: "Budget grid update", source: "SQLite workspace", owner: "FP&A", status: "Queued", amount: "FY 2026" },
      { item: "Forecast assumption review", source: "Scenario model", owner: "CFO office", status: "Needs review", amount: "Q2" },
      { item: "Ledger audit export", source: "Ledger book", owner: "Controller", status: "Ready", amount: "INR 3.6L" },
      { item: "CFO chat brief", source: "Local notes", owner: "FP&A", status: "Evidence draft", amount: "June" },
    ],
    queue: ["Lock scenario assumptions", "Export variance report", "Review ledger evidence"],
    evidence: ["Budget workbook", "Variance report", "Ledger audit packet"],
  },
];

const statusStyle: Record<string, string> = {
  "Needs review": "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]",
  Matched: "border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]",
  Ready: "border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]",
  Queued: "border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#C4B5FD]",
  "Evidence draft": "border-[#22D3EE]/30 bg-[#22D3EE]/10 text-[#67E8F9]",
};

interface HubPageProps {
  user: User;
}

export default function HubPage({ user }: HubPageProps) {
  const [activeKey, setActiveKey] = useState<ModuleKey>("ecommerce");
  const [client, setClient] = useState("ProScale Advisory");
  const [period, setPeriod] = useState("FY 2025-26");
  const [searchTerm, setSearchTerm] = useState("");
  const [compactRows, setCompactRows] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState("Workspace ready");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeModule = useMemo(
    () => modules.find((module) => module.key === activeKey) ?? modules[0],
    [activeKey],
  );
  const ActiveIcon = activeModule.icon;
  const visibleRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return activeModule.rows;
    return activeModule.rows.filter((row) =>
      [row.item, row.source, row.owner, row.status, row.amount].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  }, [activeModule.rows, searchTerm]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleModuleChange = (key: ModuleKey) => {
    setActiveKey(key);
    setSearchTerm("");
    setMobileNavOpen(false);
    setNotice(`${modules.find((module) => module.key === key)?.title ?? "Module"} opened`);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files?.length) return;
    setNotice(`${files.length} file${files.length > 1 ? "s" : ""} queued for ${activeModule.title}`);
  };

  const downloadAuditPack = (label: string) => {
    const lines = [
      "CLIENT Suite evidence export",
      `Client: ${client}`,
      `Period: ${period}`,
      `Module: ${activeModule.title}`,
      `Pack: ${label}`,
      "",
      "Included workpapers:",
      ...activeModule.evidence.map((item) => `- ${item}`),
      "",
      "Review table:",
      ...activeModule.rows.map((row) => `- ${row.item} | ${row.source} | ${row.status} | ${row.amount}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeModule.key}-${label.toLowerCase().replaceAll(" ", "-")}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice(`${label} exported`);
  };

  return (
    <div className="min-h-screen bg-[#05070B] text-[#F8FAFC]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[292px] shrink-0 border-r border-[#1F2937] bg-[#0B1018] lg:flex lg:flex-col">
          <div className="border-b border-[#1F2937] px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#8B5CF6]/40 bg-[#8B5CF6]/15">
                <LayoutDashboard size={20} className="text-[#C4B5FD]" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">CLIENT Suite</p>
                <p className="text-sm text-[#94A3B8]">Finance command layer</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-5">
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive = activeKey === module.key;
              return (
                <button
                  key={module.key}
                  onClick={() => handleModuleChange(module.key)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition duration-200 ${
                    isActive
                      ? "border-[#8B5CF6]/45 bg-[#111827] text-white shadow-[0_0_0_1px_rgba(139,92,246,0.12)]"
                      : "border-transparent text-[#94A3B8] hover:border-[#1F2937] hover:bg-[#111827]/70 hover:text-[#F8FAFC]"
                  }`}
                >
                  <Icon size={18} style={{ color: isActive ? module.accent : "#64748B" }} />
                  <span className="text-sm font-medium">{module.title}</span>
                </button>
              );
            })}
          </nav>

          <div className="border-t border-[#1F2937] p-4">
            <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4">
              <p className="text-sm font-semibold text-[#F8FAFC]">Workspace status</p>
              <p className="mt-1 text-sm leading-6 text-[#94A3B8]">
                Local-first processing, role-based review, and export-ready evidence packs.
              </p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-[#1F2937] bg-[#05070B]/92 backdrop-blur-xl">
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between xl:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => setMobileNavOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1F2937] bg-[#0B1018] text-[#94A3B8] lg:hidden"
                >
                  <Menu size={18} />
                </button>
                <div className="min-w-0">
                  <p className="text-sm text-[#94A3B8]">Logged in as</p>
                  <p className="truncate text-sm font-medium text-[#F8FAFC]">{user.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <SelectControl
                  label="Client"
                  value={client}
                  options={["ProScale Advisory", "Demo Retail Group", "Northstar Exports"]}
                  onChange={setClient}
                />
                <SelectControl
                  label="Period"
                  value={period}
                  options={["FY 2025-26", "FY 2024-25", "Q1 2026", "June 2026"]}
                  onChange={setPeriod}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => handleFileUpload(event.currentTarget.files)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#1F2937] bg-[#111827] px-4 text-sm font-medium text-[#F8FAFC] transition hover:border-[#22D3EE]/50"
                >
                  <UploadCloud size={16} />
                  Upload
                </button>
                <button
                  onClick={() => downloadAuditPack("Audit pack")}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 text-sm font-semibold text-white transition hover:bg-[#7C3AED]"
                >
                  <ArrowDownToLine size={16} />
                  Export
                </button>
                <button
                  onClick={() => setNotice("No new review alerts")}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1F2937] bg-[#111827] text-[#94A3B8] transition hover:text-[#F8FAFC]"
                >
                  <Bell size={16} />
                </button>
                <button
                  onClick={handleSignOut}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#1F2937] bg-[#0B1018] px-4 text-sm font-medium text-[#94A3B8] transition hover:text-[#F8FAFC]"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 xl:px-8">
            <div className="mx-auto max-w-[1500px]">
              <section className="rounded-2xl border border-[#1F2937] bg-[#0B1018] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-7">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#1F2937] bg-[#111827]">
                        <ActiveIcon size={22} style={{ color: activeModule.accent }} />
                      </div>
                      <div>
                        <p className="text-sm text-[#94A3B8]">{activeModule.eyebrow}</p>
                        <h1 className="text-3xl font-semibold tracking-tight text-[#F8FAFC] sm:text-4xl">
                          {activeModule.title}
                        </h1>
                      </div>
                    </div>
                    <p className="mt-5 max-w-3xl text-base leading-7 text-[#94A3B8]">
                      {activeModule.description}
                    </p>
                  </div>

                  <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-[#1F2937] bg-[#05070B] px-4 py-3">
                    <Search size={17} className="text-[#64748B]" />
                    <input
                      aria-label="Search workspace"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search files, exceptions, evidence..."
                      className="w-full bg-transparent text-sm text-[#F8FAFC] outline-none placeholder:text-[#64748B]"
                    />
                  </div>
                </div>

                <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {activeModule.kpis.map((kpi) => (
                    <div key={kpi.label} className="rounded-xl border border-[#1F2937] bg-[#111827] p-5">
                      <p className="text-sm text-[#94A3B8]">{kpi.label}</p>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <p className="text-3xl font-semibold tracking-tight">{kpi.value}</p>
                        <span className={`h-2.5 w-2.5 rounded-full ${toneDot(kpi.tone)}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.8fr)]">
                <section className="overflow-hidden rounded-2xl border border-[#1F2937] bg-[#0B1018]">
                  <div className="flex items-center justify-between border-b border-[#1F2937] px-5 py-4">
                    <div>
                      <h2 className="text-lg font-semibold text-[#F8FAFC]">Primary review table</h2>
                      <p className="text-sm text-[#94A3B8]">One clean queue for matching, review and export decisions.</p>
                    </div>
                    <button
                      onClick={() => setCompactRows((value) => !value)}
                      className="rounded-lg border border-[#1F2937] bg-[#111827] px-3 py-2 text-sm font-medium text-[#94A3B8] transition hover:text-[#F8FAFC]"
                    >
                      {compactRows ? "Comfort view" : "Compact view"}
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] border-collapse text-left">
                      <thead className="bg-[#111827] text-sm text-[#94A3B8]">
                        <tr>
                          <th className="px-5 py-4 font-medium">Item</th>
                          <th className="px-5 py-4 font-medium">Source</th>
                          <th className="px-5 py-4 font-medium">Owner</th>
                          <th className="px-5 py-4 font-medium">Status</th>
                          <th className="px-5 py-4 text-right font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1F2937]">
                        {visibleRows.map((row) => (
                          <tr key={`${activeModule.key}-${row.item}`} className="transition hover:bg-[#111827]/70">
                            <td className={`px-5 ${compactRows ? "py-3" : "py-4"} text-sm font-medium text-[#F8FAFC]`}>{row.item}</td>
                            <td className={`px-5 ${compactRows ? "py-3" : "py-4"} text-sm text-[#94A3B8]`}>{row.source}</td>
                            <td className={`px-5 ${compactRows ? "py-3" : "py-4"} text-sm text-[#94A3B8]`}>{row.owner}</td>
                            <td className={`px-5 ${compactRows ? "py-3" : "py-4"}`}>
                              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusStyle[row.status] ?? statusStyle.Queued}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className={`px-5 ${compactRows ? "py-3" : "py-4"} text-right text-sm font-semibold text-[#F8FAFC]`}>{row.amount}</td>
                          </tr>
                        ))}
                        {visibleRows.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#94A3B8]">
                              No rows match this search.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <aside className="space-y-6">
                  <section className="rounded-2xl border border-[#1F2937] bg-[#0B1018] p-5">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={18} className="text-[#10B981]" />
                      <h2 className="text-lg font-semibold">Action queue</h2>
                    </div>
                    <div className="mt-5 space-y-3">
                      {activeModule.queue.map((item, index) => (
                        <button
                          key={item}
                          onClick={() =>
                            setCompletedActions((current) => ({
                              ...current,
                              [`${activeModule.key}-${item}`]: !current[`${activeModule.key}-${item}`],
                            }))
                          }
                          className="flex w-full items-center justify-between rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 text-left text-sm text-[#F8FAFC] transition hover:border-[#8B5CF6]/50"
                        >
                          <span className={completedActions[`${activeModule.key}-${item}`] ? "text-[#64748B] line-through" : ""}>{item}</span>
                          <span className={completedActions[`${activeModule.key}-${item}`] ? "text-[#10B981]" : "text-[#64748B]"}>
                            {completedActions[`${activeModule.key}-${item}`] ? "Done" : index + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[#1F2937] bg-[#0B1018] p-5">
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={18} className="text-[#22D3EE]" />
                      <h2 className="text-lg font-semibold">Evidence and export</h2>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#94A3B8]">
                      Prepare client-ready workpapers with review trail, source references and export notes.
                    </p>
                    <div className="mt-5 space-y-3">
                      {activeModule.evidence.map((item) => (
                        <div key={item} className="flex items-center justify-between rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3">
                          <span className="text-sm text-[#F8FAFC]">{item}</span>
                          <FileCheck2 size={16} className="text-[#64748B]" />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => downloadAuditPack("Evidence pack")}
                      className="mt-5 w-full rounded-xl bg-[#8B5CF6] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7C3AED]"
                    >
                      Export audit pack
                    </button>
                  </section>
                </aside>
              </div>
              <div className="mt-5 rounded-xl border border-[#1F2937] bg-[#0B1018] px-4 py-3 text-sm text-[#94A3B8]">
                {notice}
              </div>
            </div>
          </main>
        </section>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-sm lg:hidden">
          <div className="ml-auto h-full max-w-sm rounded-2xl border border-[#1F2937] bg-[#0B1018] p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold">Modules</p>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1F2937] text-[#94A3B8]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <button
                    key={module.key}
                    onClick={() => handleModuleChange(module.key)}
                    className="flex w-full items-center gap-3 rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 text-left text-sm text-[#F8FAFC]"
                  >
                    <Icon size={18} style={{ color: module.accent }} />
                    {module.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="inline-flex h-10 items-center gap-3 rounded-lg border border-[#1F2937] bg-[#111827] px-4 text-left transition focus-within:border-[#8B5CF6] hover:border-[#334155]">
      <span className="hidden text-sm text-[#64748B] sm:inline">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="appearance-none bg-transparent text-sm font-medium text-[#F8FAFC] outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#0B1018] text-[#F8FAFC]">
            {option}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none text-[#94A3B8]" />
    </label>
  );
}

function toneDot(tone: "success" | "warning" | "neutral") {
  if (tone === "success") return "bg-[#10B981]";
  if (tone === "warning") return "bg-[#F59E0B]";
  return "bg-[#64748B]";
}
