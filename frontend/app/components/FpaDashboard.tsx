"use client";

import React, { useState, useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  Layers, 
  Sparkles, 
  RefreshCw, 
  Plus, 
  Bot, 
  Send,
  AlertTriangle,
  CheckCircle,
  Play,
  Globe,
  Database,
  Search,
  DollarSign,
  Briefcase,
  Cpu,
  ArrowRightLeft,
  ChevronRight,
  Loader2
} from "lucide-react";
import {
  fetchFpaMeta,
  fetchFpaGridData,
  saveBudgetCell,
  cloneScenario,
  runConsolidation,
  runForecast,
  detectAnomalies,
  fetchVarianceInsights,
  askFinancialChatbot,
  triggerErpIntegration,
  type FpaMeta,
  type FpaFact,
  type AnomalyItem,
  type ForecastItem
} from "../lib/api";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend
} from "recharts";

interface FpaDashboardProps {
  user: User;
  onBackToHub: () => void;
}

interface ChatMessage {
  sender: "user" | "cfo";
  text: string;
  timestamp: Date;
}

export default function FpaDashboard({ user, onBackToHub }: FpaDashboardProps) {
  // Tabs: 'cockpit' (budget spreadsheet), 'consolidation' (multicurrency), 'forecasting' (regression), 'anomalies' (isolation forest)
  const [activeTab, setActiveTab] = useState<"cockpit" | "consolidation" | "forecasting" | "anomalies">("cockpit");
  
  // Metadata & selection states
  const [meta, setMeta] = useState<FpaMeta | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");
  
  // Grid Data states
  const [gridData, setGridData] = useState<FpaFact[]>([]);
  const [loadingGrid, setLoadingGrid] = useState<boolean>(false);
  const [savingCells, setSavingCells] = useState<Record<string, "saving" | "saved" | "error">>({});
  
  // Integration ERP states
  const [syncingErp, setSyncingErp] = useState<boolean>(false);
  const [erpSystem, setErpSystem] = useState<string>("quickbooks");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  // Consolidation states
  const [targetCurrency, setTargetCurrency] = useState<string>("USD");
  const [consolidating, setConsolidating] = useState<boolean>(false);
  const [consolidationResult, setConsolidationResult] = useState<any>(null);
  
  // Forecasting states
  const [forecastAccountId, setForecastAccountId] = useState<string>("");
  const [forecastPeriods, setForecastPeriods] = useState<number>(3);
  const [forecasting, setForecasting] = useState<boolean>(false);
  const [forecastResult, setForecastResult] = useState<ForecastItem[] | null>(null);
  const [forecastModelName, setForecastModelName] = useState<string>("");
  const [autoModelSelected, setAutoModelSelected] = useState<boolean>(false);
  
  // Anomaly states
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [loadingAnomalies, setLoadingAnomalies] = useState<boolean>(false);
  
  // Scenario Clone states
  const [showCloneModal, setShowCloneModal] = useState<boolean>(false);
  const [newScenarioName, setNewScenarioName] = useState<string>("");
  const [newScenarioDesc, setNewScenarioDesc] = useState<string>("");
  const [cloneGrowthRate, setCloneGrowthRate] = useState<number>(0.05); // +5%
  const [cloneAllocationRule, setCloneAllocationRule] = useState<string>("uniform");
  const [cloning, setCloning] = useState<boolean>(false);
  
  // AI Chatbot states
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: "cfo",
      text: "Hello! I am your AI Virtual CFO. Ask me questions about runway, opex variance, cash flow projection, or draft an executive summary.",
      timestamp: new Date()
    }
  ]);
  const [botLoading, setBotLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize: Load meta dimensions
  useEffect(() => {
    loadMeta();
  }, [user.id]);

  // Load grid facts whenever selections change
  useEffect(() => {
    if (selectedScenarioId) {
      loadGridFacts();
    }
  }, [selectedScenarioId, selectedCompanyId, selectedDepartmentId]);

  // Scroll chatbot to end
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatOpen]);

  const loadMeta = async () => {
    try {
      const data = await fetchFpaMeta(user.id);
      setMeta(data);
      if (data.companies.length > 0) {
        setSelectedCompanyId(data.companies[0].id);
      }
      if (data.scenarios.length > 0) {
        // Find first active scenario or default
        const active = data.scenarios.find(s => s.is_active) || data.scenarios[0];
        setSelectedScenarioId(active.id);
      }
      if (data.accounts.length > 0) {
        setForecastAccountId(data.accounts[0].id);
      }
    } catch (err) {
      console.error("Failed to load meta dimensions", err);
    }
  };

  const loadGridFacts = async () => {
    if (!selectedScenarioId) return;
    setLoadingGrid(true);
    try {
      const data = await fetchFpaGridData(user.id, selectedScenarioId);
      setGridData(data);
    } catch (err) {
      console.error("Failed to load financial facts", err);
    } finally {
      setLoadingGrid(false);
    }
  };

  // Run anomaly audit (called on mount/focusing tab)
  const runAnomalyAudit = async () => {
    setLoadingAnomalies(true);
    try {
      const res = await detectAnomalies(user.id);
      setAnomalies(res.anomalies);
    } catch (err) {
      console.error("Anomaly audit failed", err);
    } finally {
      setLoadingAnomalies(false);
    }
  };

  useEffect(() => {
    if (activeTab === "anomalies") {
      runAnomalyAudit();
    }
  }, [activeTab]);

  // Handle cell edit save
  const handleCellBlur = async (
    accountId: string,
    periodId: string,
    deptId: string,
    currentVal: number,
    originalVal: number,
    currencyCode: string
  ) => {
    if (currentVal === originalVal) return;
    
    const cellKey = `${accountId}-${periodId}-${deptId}`;
    setSavingCells(prev => ({ ...prev, [cellKey]: "saving" }));
    
    try {
      await saveBudgetCell({
        scenario_id: selectedScenarioId,
        company_id: selectedCompanyId,
        department_id: deptId,
        account_id: accountId,
        time_period_id: periodId,
        amount: currentVal,
        currency_code: currencyCode,
        tenant_id: user.id
      });
      setSavingCells(prev => ({ ...prev, [cellKey]: "saved" }));
      // Reload silently to fetch new USD consolidated figures
      const updatedFacts = await fetchFpaGridData(user.id, selectedScenarioId);
      setGridData(updatedFacts);
      
      setTimeout(() => {
        setSavingCells(prev => {
          const c = { ...prev };
          delete c[cellKey];
          return c;
        });
      }, 2000);
    } catch (err) {
      console.error("Failed to save cell amount", err);
      setSavingCells(prev => ({ ...prev, [cellKey]: "error" }));
    }
  };

  // ERP Sync Trigger
  const handleSyncErp = async () => {
    setSyncingErp(true);
    setSyncMessage(null);
    try {
      const res = await triggerErpIntegration({
        tenant_id: user.id,
        company_id: selectedCompanyId,
        erp_system: erpSystem
      });
      setSyncMessage(res.message);
      await loadGridFacts();
    } catch (err: any) {
      setSyncMessage(`Error: ${err.message || "Failed ERP pull"}`);
    } finally {
      setSyncingErp(false);
    }
  };

  // Run Scenario Cloning
  const handleCloneScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioName) return;
    setCloning(true);
    try {
      const res = await cloneScenario({
        scenario_id: selectedScenarioId,
        new_name: newScenarioName,
        description: newScenarioDesc,
        growth_rate: cloneGrowthRate,
        allocation_rule: cloneAllocationRule,
        tenant_id: user.id
      });
      setShowCloneModal(false);
      setNewScenarioName("");
      setNewScenarioDesc("");
      await loadMeta(); // refresh scenarios list
      setSelectedScenarioId(res.scenario_id); // switch to the new scenario
    } catch (err) {
      console.error("Scenario clone failed", err);
    } finally {
      setCloning(false);
    }
  };

  // Consolidation Trigger
  const handleRunConsolidation = async () => {
    setConsolidating(true);
    setConsolidationResult(null);
    try {
      const res = await runConsolidation({
        scenario_id: selectedScenarioId,
        target_currency: targetCurrency,
        tenant_id: user.id
      });
      setConsolidationResult(res);
      await loadGridFacts();
    } catch (err) {
      console.error("Consolidation failed", err);
    } finally {
      setConsolidating(false);
    }
  };

  // Forecasting Trigger
  const handleRunForecast = async () => {
    if (!forecastAccountId) return;
    setForecasting(true);
    setForecastResult(null);
    try {
      const res = await runForecast({
        tenant_id: user.id,
        company_id: selectedCompanyId,
        account_id: forecastAccountId,
        periods_to_forecast: forecastPeriods
      });
      setForecastResult(res.forecast);
      setForecastModelName(res.model);
      setAutoModelSelected(res.auto_selected || false);
    } catch (err) {
      console.error("Forecasting run failed", err);
    } finally {
      setForecasting(false);
    }
  };

  // Chatbot Send Message
  const handleSendChat = async (textToSend?: string) => {
    const messageText = textToSend || chatInput;
    if (!messageText.trim()) return;

    setChatMessages(prev => [
      ...prev,
      { sender: "user", text: messageText, timestamp: new Date() }
    ]);
    if (!textToSend) setChatInput("");
    
    setBotLoading(true);
    try {
      const res = await askFinancialChatbot(messageText, user.id);
      setChatMessages(prev => [
        ...prev,
        { sender: "cfo", text: res.response, timestamp: new Date() }
      ]);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        { 
          sender: "cfo", 
          text: `Oops, I encountered an issue: ${err.message || "Network Error"}. Please check backend logs.`, 
          timestamp: new Date() 
        }
      ]);
    } finally {
      setBotLoading(false);
    }
  };

  // Generate Executive Summary
  const handleGenerateNarrative = async () => {
    setChatOpen(true);
    setBotLoading(true);
    try {
      const res = await fetchVarianceInsights(user.id, selectedCompanyId);
      setChatMessages(prev => [
        ...prev,
        { sender: "cfo", text: res.narrative, timestamp: new Date() }
      ]);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        { sender: "cfo", text: `Failed to compile insights: ${err.message}`, timestamp: new Date() }
      ]);
    } finally {
      setBotLoading(false);
    }
  };

  if (!meta) {
    return (
      <div className="min-h-screen bg-[#06070a] flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <span className="text-sm">Retrieving Multi-Tenant Dimensional Models...</span>
      </div>
    );
  }

  // Get active company currency
  const activeCompany = meta.companies.find(c => c.id === selectedCompanyId);
  const companyCurrency = activeCompany?.currency || "INR";

  // Filter accounts and departments matching selection
  const activeDepartments = meta.departments.filter(d => d.company_id === selectedCompanyId);
  
  // Organize grid spreadsheet
  // Row structure: Accounts grouped by type (e.g. REVENUE, COGS, OPERATING_EXPENSE)
  // Columns: Time Periods
  const periods = meta.periods;
  const accounts = meta.accounts;

  // Pivot calculator
  const getCellValue = (accountId: string, periodId: string) => {
    let matches = gridData.filter(f => f.account_id === accountId && f.period_id === periodId);
    if (selectedDepartmentId !== "all") {
      matches = matches.filter(f => f.department_id === selectedDepartmentId);
    }
    return matches.reduce((sum, item) => sum + item.amount, 0);
  };

  const getCellUsdValue = (accountId: string, periodId: string) => {
    let matches = gridData.filter(f => f.account_id === accountId && f.period_id === periodId);
    if (selectedDepartmentId !== "all") {
      matches = matches.filter(f => f.department_id === selectedDepartmentId);
    }
    return matches.reduce((sum, item) => sum + item.amount_usd, 0);
  };

  const getCellFactId = (accountId: string, periodId: string) => {
    const match = gridData.find(f => f.account_id === accountId && f.period_id === periodId);
    return match?.id || "";
  };

  // Group accounts by type for spreadsheet categories
  const accountGroups = {
    REVENUE: accounts.filter(a => a.type === "REVENUE"),
    COGS: accounts.filter(a => a.type === "COGS"),
    OPERATING_EXPENSE: accounts.filter(a => a.type === "OPERATING_EXPENSE"),
    ASSET: accounts.filter(a => a.type === "ASSET"),
    LIABILITY: accounts.filter(a => a.type === "LIABILITY"),
    EQUITY: accounts.filter(a => a.type === "EQUITY")
  };

  // Calculate summaries for KPIs
  const currentScenario = meta.scenarios.find(s => s.id === selectedScenarioId);
  const isActualScenario = currentScenario?.type === "ACTUAL";

  // Totals calculations
  let totalRevenue = 0;
  let totalOpex = 0;
  let totalCogs = 0;
  
  gridData.forEach(f => {
    const acct = accounts.find(a => a.id === f.account_id);
    if (acct) {
      if (acct.type === "REVENUE") totalRevenue += f.amount_usd;
      if (acct.type === "OPERATING_EXPENSE") totalOpex += f.amount_usd;
      if (acct.type === "COGS") totalCogs += f.amount_usd;
    }
  });

  const netProfit = totalRevenue - totalOpex - totalCogs;
  const burnRate = totalOpex + totalCogs;
  // Mock runway based on total cash assets in ASSET category or fallback
  let cashAssets = 0;
  gridData.forEach(f => {
    const acct = accounts.find(a => a.id === f.account_id);
    if (acct && acct.type === "ASSET" && acct.subtype === "CASH_AND_EQUIVALENTS") {
      cashAssets += f.amount_usd;
    }
  });
  if (cashAssets === 0) cashAssets = 120000; // demo fallback in USD
  const runwayMonths = burnRate > 0 ? (cashAssets / (burnRate / (periods.length || 1))) : 12;

  // Find if a fact is an anomaly
  const isFactAnomalous = (factId: string) => {
    return anomalies.some(a => a.fact_id === factId);
  };

  // Format currency helpers
  const formatCurrency = (val: number, cur: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Pre-load chart data for forecasting tab
  const getForecastChartData = () => {
    if (!forecastResult) return [];
    
    // Get historical facts
    const historicalFacts = gridData
      .filter(f => f.account_id === forecastAccountId && f.company_id === selectedCompanyId)
      .map(f => {
        const period = periods.find(p => p.id === f.period_id);
        return {
          name: period?.label || "Historical",
          amount: f.amount,
          type: "Historical"
        };
      });

    const predictions = forecastResult.map(f => ({
      name: f.period_label,
      forecast: f.amount,
      range: [f.lower_ci, f.upper_ci],
      type: "Forecast"
    }));

    return [...historicalFacts, ...predictions];
  };

  return (
    <div className="relative min-h-screen bg-[#06070a] text-slate-100 flex flex-col justify-between overflow-x-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[150px] pointer-events-none" />

      {/* Header bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-slate-900 bg-[#06070a]/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBackToHub}
            className="w-9 h-9 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-all hover:bg-slate-800"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">
                FP&A Command Center
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 font-bold uppercase tracking-wider">
                Virtual CFO
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Version 3.0 • Multi-Currency Ledger Isolation</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* AI CFO Drawer toggle */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-bold text-slate-950 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Bot size={14} className="text-slate-950" />
            Talk to AI CFO
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        
        {/* Controls Ribbon */}
        <div className="rounded-3xl border border-slate-800 bg-[#0d0f14]/50 backdrop-blur-xl p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Entity Selector */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Legal Entity</span>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
              >
                {meta.companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.currency})</option>
                ))}
              </select>
            </div>

            {/* Scenario Selector */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Scenario Model</span>
                <button 
                  onClick={() => setShowCloneModal(true)}
                  className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus size={8} /> Clone New
                </button>
              </div>
              <select
                value={selectedScenarioId}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
              >
                {meta.scenarios.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} [{s.type}]</option>
                ))}
              </select>
            </div>

            {/* Department Selector */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Department</span>
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
              >
                <option value="all">All Departments (Consolidated)</option>
                {activeDepartments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              onClick={handleGenerateNarrative}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/25 transition-all"
            >
              <Sparkles size={12} />
              CFO Summary
            </button>

            <button
              onClick={loadGridFacts}
              className={`p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all ${loadingGrid ? "animate-spin text-indigo-400" : ""}`}
              title="Refresh Grid Data"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Global Financial Metrics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800/80 bg-[#0d0f14]/30 backdrop-blur-md p-5 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">Consolidated Revenue (USD)</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black tracking-tight text-indigo-300">
                ${(totalRevenue).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Multi-currency converted value</p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-[#0d0f14]/30 backdrop-blur-md p-5 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">Monthly Burn Runway</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-2xl font-black tracking-tight ${runwayMonths < 6 ? "text-amber-400" : "text-emerald-400"}`}>
                {runwayMonths.toFixed(1)} Months
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Target Runway: &gt; 12 months</p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-[#0d0f14]/30 backdrop-blur-md p-5 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Opex (USD)</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black tracking-tight text-slate-200">
                ${(totalOpex).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Operating expense allocations</p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-[#0d0f14]/30 backdrop-blur-md p-5 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">Net Profit Pool (USD)</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-2xl font-black tracking-tight ${netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                ${(netProfit).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Pre-tax consolidated earnings</p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-800/60 text-xs font-semibold gap-6">
          <button
            onClick={() => setActiveTab("cockpit")}
            className={`pb-3 border-b-2 px-1 transition-all ${activeTab === "cockpit" ? "border-indigo-500 text-slate-200 font-bold" : "border-transparent text-slate-500 hover:text-slate-300"}`}
          >
            Budget Grid
          </button>
          <button
            onClick={() => setActiveTab("consolidation")}
            className={`pb-3 border-b-2 px-1 transition-all ${activeTab === "consolidation" ? "border-indigo-500 text-slate-200 font-bold" : "border-transparent text-slate-500 hover:text-slate-300"}`}
          >
            Eliminations & Consolidations
          </button>
          <button
            onClick={() => setActiveTab("forecasting")}
            className={`pb-3 border-b-2 px-1 transition-all ${activeTab === "forecasting" ? "border-indigo-500 text-slate-200 font-bold" : "border-transparent text-slate-500 hover:text-slate-300"}`}
          >
            ML Time-Series Forecasting
          </button>
          <button
            onClick={() => setActiveTab("anomalies")}
            className={`pb-3 border-b-2 px-1 transition-all ${activeTab === "anomalies" ? "border-indigo-500 text-slate-200 font-bold" : "border-transparent text-slate-500 hover:text-slate-300"}`}
          >
            Outlier Anomaly Audit
          </button>
        </div>

        {/* Tab contents */}
        {activeTab === "cockpit" && (
          <div className="flex flex-col gap-6">
            
            {/* Spreadsheet Budget Grid Card */}
            <div className="rounded-3xl border border-slate-800 bg-[#0d0f14]/30 backdrop-blur-xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-slate-800/80 bg-slate-900/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Interactive Planning Spreadsheet</h3>
                  <p className="text-[11px] text-slate-400">Values are shown in {companyCurrency}. Click any cell to edit budget values directly.</p>
                </div>
                
                {/* ERP Sync Quick Control */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sync ERP</span>
                  <select
                    value={erpSystem}
                    onChange={(e) => setErpSystem(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="quickbooks">QuickBooks API</option>
                    <option value="sap">SAP BusinessOne</option>
                    <option value="oracle">Oracle NetSuite</option>
                  </select>
                  <button
                    onClick={handleSyncErp}
                    disabled={syncingErp}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-[10px] font-bold text-emerald-300 transition-all disabled:opacity-50"
                  >
                    {syncingErp ? <Loader2 size={10} className="animate-spin" /> : <Database size={10} />}
                    Sync Now
                  </button>
                </div>
              </div>

              {/* ERP Sync status banner */}
              {syncMessage && (
                <div className="px-5 py-2.5 bg-indigo-500/10 border-b border-indigo-500/20 text-xs text-indigo-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database size={14} />
                    <span>{syncMessage}</span>
                  </div>
                  <button onClick={() => setSyncMessage(null)} className="text-[10px] font-bold opacity-75 hover:opacity-100">Dismiss</button>
                </div>
              )}

              {/* Grid element */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/30 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-5 min-w-[240px]">Account Name</th>
                      <th className="py-3.5 px-4 text-center">Type</th>
                      {periods.map((p) => (
                        <th key={p.id} className="py-3.5 px-4 text-right min-w-[120px]">{p.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-xs">
                    
                    {/* Render helper */}
                    {Object.entries(accountGroups).map(([groupName, groupAccounts]) => {
                      if (groupAccounts.length === 0) return null;
                      return (
                        <React.Fragment key={groupName}>
                          {/* Section Header */}
                          <tr className="bg-slate-900/50 text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
                            <td colSpan={periods.length + 2} className="py-2.5 px-5">
                              {groupName.replace("_", " ")}
                            </td>
                          </tr>

                          {/* Accounts rows */}
                          {groupAccounts.map((a) => (
                            <tr key={a.id} className="hover:bg-slate-900/20 transition-all">
                              <td className="py-3.5 px-5">
                                <div className="font-semibold text-slate-300">{a.name}</div>
                                <div className="text-[9px] font-mono text-slate-500">{a.code}</div>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="text-[9px] px-2 py-0.5 rounded-full border border-slate-800 bg-slate-900 text-slate-400">
                                  {a.subtype}
                                </span>
                              </td>

                              {/* Columns for periods */}
                              {periods.map((p) => {
                                const cellVal = getCellValue(a.id, p.id);
                                const cellUsd = getCellUsdValue(a.id, p.id);
                                const factId = getCellFactId(a.id, p.id);
                                const isAnomalous = isFactAnomalous(factId);
                                const cellKey = `${a.id}-${p.id}-${selectedDepartmentId}`;
                                const cellState = savingCells[cellKey];

                                return (
                                  <td key={p.id} className="py-2.5 px-4 text-right relative">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {/* Saving indicators */}
                                      {cellState === "saving" && <Loader2 size={10} className="animate-spin text-indigo-400" />}
                                      {cellState === "saved" && <CheckCircle size={10} className="text-emerald-400" />}
                                      {cellState === "error" && <AlertTriangle size={10} className="text-red-400" />}
                                      
                                      {/* Anomaly flag */}
                                      {isAnomalous && (
                                        <div 
                                          className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse cursor-pointer"
                                          title="Isolation Forest outlier flagged! Click forecasting to inspect."
                                        />
                                      )}

                                      <input
                                        type="number"
                                        defaultValue={cellVal}
                                        onBlur={(e) => {
                                          const v = parseFloat(e.target.value) || 0;
                                          handleCellBlur(a.id, p.id, selectedDepartmentId === "all" ? activeDepartments[0]?.id : selectedDepartmentId, v, cellVal, companyCurrency);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            (e.target as HTMLInputElement).blur();
                                          }
                                        }}
                                        disabled={isActualScenario}
                                        className={`bg-slate-950/70 border text-right text-xs rounded-lg px-2 py-1 w-24 focus:outline-none focus:ring-1 transition-all font-mono font-medium ${
                                          isActualScenario 
                                            ? "border-transparent text-slate-400 cursor-not-allowed" 
                                            : isAnomalous
                                              ? "border-amber-500/40 text-amber-300 focus:ring-amber-500 focus:border-amber-500"
                                              : "border-slate-800/80 text-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                                        }`}
                                      />
                                    </div>
                                    <div className="text-[8px] text-slate-500 font-mono mt-0.5">
                                      ${cellUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })} USD
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "consolidation" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Consolidation Settings */}
            <div className="rounded-3xl border border-slate-800 bg-[#0d0f14]/30 backdrop-blur-xl p-6 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6">
                  <Globe size={22} className="text-purple-400" />
                </div>
                <h3 className="text-base font-bold text-slate-100 mb-2">Intercompany Eliminations</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Select a target reporting currency. Running the engine will translate all subsidiary accounts using current period rates, detect intercompany transactions (accounts matching codes starting with `INT-`), and set their consolidated offset value to zero to avoid balance sheet inflation.
                </p>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Reporting Currency</span>
                    <select
                      value={targetCurrency}
                      onChange={(e) => setTargetCurrency(e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handleRunConsolidation}
                disabled={consolidating}
                className="mt-8 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-98 disabled:opacity-50"
              >
                {consolidating ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                Trigger Multi-Currency Consolidation
              </button>
            </div>

            {/* Consolidation Results display */}
            <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-[#0d0f14]/30 backdrop-blur-xl p-6">
              <h3 className="text-sm font-bold text-slate-200 mb-4">Consolidation Engine Logs</h3>
              
              {!consolidationResult ? (
                <div className="h-[260px] border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
                  <Globe size={24} className="text-slate-600" />
                  <span>Consolidation pipeline is idle. Run consolidation to pull report metrics.</span>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Eliminated Rules</span>
                      <h4 className="text-xl font-extrabold text-purple-300 mt-2">{consolidationResult.eliminated_transactions}</h4>
                      <p className="text-[9px] text-slate-500 mt-1">Intercompany logs nullified</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Converted Assets</span>
                      <h4 className="text-xl font-extrabold text-indigo-300 mt-2">{consolidationResult.converted_transactions}</h4>
                      <p className="text-[9px] text-slate-500 mt-1">Sub accounts translated</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consolidated Total</span>
                      <h4 className="text-xl font-extrabold text-emerald-400 mt-2">
                        ${consolidationResult.consolidated_total_usd.toLocaleString()}
                      </h4>
                      <p className="text-[9px] text-slate-500 mt-1">USD equivalent value</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 text-xs text-indigo-300 flex items-start gap-3">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="font-bold">Consolidation Successful</h5>
                      <p className="mt-1 leading-relaxed text-indigo-400">
                        {consolidationResult.message || "All multi-entity fact values have been translated using period-end currency rates and intercompany ledger accounts were wiped clean."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === "forecasting" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Forecast parameters */}
            <div className="rounded-3xl border border-slate-800 bg-[#0d0f14]/30 backdrop-blur-xl p-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                <TrendingUp size={22} className="text-indigo-400" />
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2">ARIMA / Seasonal Forecast</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Generate driver forecasts using a linear trend regression fitting seasonality patterns on historical Actuals. Includes a confidence band for worst/best opex predictions.
              </p>

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Target Account</span>
                  <select
                    value={forecastAccountId}
                    onChange={(e) => setForecastAccountId(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    {meta.accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.code} • {a.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Periods (Months)</span>
                  <select
                    value={forecastPeriods}
                    onChange={(e) => setForecastPeriods(parseInt(e.target.value))}
                    className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={3}>Next 3 Months</option>
                    <option value={6}>Next 6 Months</option>
                    <option value={12}>Next 12 Months</option>
                  </select>
                </div>

                <button
                  onClick={handleRunForecast}
                  disabled={forecasting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-98 disabled:opacity-50 mt-4"
                >
                  {forecasting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  Generate ML Forecast
                </button>
              </div>
            </div>

            {/* Forecast Chart display */}
            <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-[#0d0f14]/30 backdrop-blur-xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200 mb-1">Regression Trend Projection Chart</h3>
                {forecastModelName && (
                  <p className="text-[10px] text-slate-400">
                    Model: <span className="font-semibold text-indigo-400 font-mono">{forecastModelName}</span>
                    {autoModelSelected && " (Auto-selected based on residual minimization)"}
                  </p>
                )}
              </div>

              {!forecastResult ? (
                <div className="h-[280px] border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 text-xs gap-3 my-4">
                  <TrendingUp size={24} className="text-slate-600" />
                  <span>Chart is empty. Generate a forecast model to see trends.</span>
                </div>
              ) : (
                <div className="h-[280px] w-full my-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={getForecastChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#181a20" />
                      <XAxis dataKey="name" stroke="#52525b" fontSize={10} />
                      <YAxis stroke="#52525b" fontSize={10} />
                      <ChartTooltip 
                        contentStyle={{ background: "#0d0f14", borderColor: "#27272a", borderRadius: "12px" }}
                        labelStyle={{ color: "#e4e4e7", fontSize: "11px", fontWeight: "bold" }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      
                      {/* Confidence intervals Shading */}
                      <Area 
                        name="Confidence Bound (95%)" 
                        type="monotone" 
                        dataKey="range" 
                        stroke="none" 
                        fill="#6366f1" 
                        fillOpacity={0.08} 
                      />

                      {/* Historical Solid Line */}
                      <Line 
                        name="Historical Actuals" 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#10b981" 
                        strokeWidth={2} 
                        dot={{ r: 4, stroke: "#10b981", strokeWidth: 1, fill: "#0d0f14" }}
                      />

                      {/* Forecasted Dashed Line */}
                      <Line 
                        name="Projected Forecast" 
                        type="monotone" 
                        dataKey="forecast" 
                        stroke="#6366f1" 
                        strokeWidth={2} 
                        strokeDasharray="5 5"
                        dot={{ r: 4, stroke: "#6366f1", strokeWidth: 1, fill: "#0d0f14" }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              <p className="text-[10px] text-slate-500 text-center">
                * Confidence bands scale dynamically based on the residual standard deviation errors of past historical periods.
              </p>
            </div>

          </div>
        )}

        {activeTab === "anomalies" && (
          <div className="rounded-3xl border border-slate-800 bg-[#0d0f14]/30 backdrop-blur-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Isolation Forest Outliers</h3>
                <p className="text-xs text-slate-400">Scikit-learn model trained on absolute transaction values. Flagging outliers outside a 10% contamination threshold.</p>
              </div>
              <button
                onClick={runAnomalyAudit}
                disabled={loadingAnomalies}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                {loadingAnomalies ? <Loader2 size={12} className="animate-spin text-indigo-400" /> : <RefreshCw size={12} />}
                Run Audit Now
              </button>
            </div>

            {loadingAnomalies ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                <Loader2 className="animate-spin text-indigo-500" size={24} />
                <span>Training local Isolation Forest classifier...</span>
              </div>
            ) : anomalies.length === 0 ? (
              <div className="py-16 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
                <CheckCircle size={24} className="text-emerald-500" />
                <span>No opex outliers or budget variance anomalies detected for this period.</span>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-[#06070a]/40">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/30 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Account Code</th>
                      <th className="py-3 px-4">Account Name</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4 text-right">Value (INR)</th>
                      <th className="py-3 px-4 text-center">Score</th>
                      <th className="py-3 px-4">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300">
                    {anomalies.map((anom, idx) => (
                      <tr key={idx} className="hover:bg-amber-500/[0.02] transition-all">
                        <td className="py-3.5 px-4 font-semibold text-slate-400">{anom.period}</td>
                        <td className="py-3.5 px-4 font-mono text-amber-400 font-bold">{anom.account_code}</td>
                        <td className="py-3.5 px-4 font-semibold">{anom.account_name}</td>
                        <td className="py-3.5 px-4 text-slate-400">{anom.department}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-medium">{formatCurrency(anom.amount, anom.currency)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-bold font-mono">
                            {anom.score.toFixed(3)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px] max-w-[240px] truncate" title={anom.reason}>{anom.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      {/* AI CFO sliding drawer */}
      {chatOpen && (
        <div className="fixed top-0 right-0 h-full w-[400px] border-l border-slate-800 bg-[#07080a]/95 backdrop-blur-2xl shadow-2xl z-50 flex flex-col justify-between animate-in slide-in-from-right duration-300">
          
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-900/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Bot size={16} className="text-indigo-400 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">AI Virtual CFO Assistant</h4>
                <p className="text-[9px] text-slate-500">Zero Execution Cost Local Engine</p>
              </div>
            </div>
            <button 
              onClick={() => setChatOpen(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800 hover:bg-slate-800 transition-all"
            >
              Hide
            </button>
          </div>

          {/* Drawer Chat Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}
              >
                {msg.sender === "cfo" && (
                  <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex-shrink-0 flex items-center justify-center mt-1">
                    <Bot size={11} className="text-indigo-400" />
                  </div>
                )}
                <div>
                  <div className={`p-3 rounded-2xl text-[11px] leading-relaxed ${
                    msg.sender === "user" 
                      ? "bg-indigo-600 text-slate-950 font-semibold rounded-tr-none" 
                      : "bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none"
                  }`}>
                    {/* Render basic bullets/headers formatting manually for chatbot outputs */}
                    {msg.text.split("\n").map((line, i) => {
                      if (line.startsWith("###")) {
                        return <h5 key={i} className="font-extrabold text-xs text-indigo-300 my-1.5">{line.replace("###", "")}</h5>;
                      }
                      if (line.startsWith("-")) {
                        return <li key={i} className="ml-3 my-0.5 list-disc">{line.replace("-", "").trim()}</li>;
                      }
                      return <p key={i} className="my-0.5">{line}</p>;
                    })}
                  </div>
                  <span className="text-[8px] text-slate-500 block mt-1 font-mono text-right">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {botLoading && (
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex-shrink-0 flex items-center justify-center mt-1">
                  <Bot size={11} className="text-indigo-400" />
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-[11px] flex items-center gap-2">
                  <Loader2 size={11} className="animate-spin text-indigo-400" />
                  <span>Synthesizing balance sheet pools...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick prompt Chips */}
          <div className="px-4 py-2 border-t border-slate-800/40 bg-slate-900/5 flex flex-wrap gap-1.5">
            <button
              onClick={() => handleSendChat("How is our actual revenue performing against budget?")}
              className="text-[9px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all text-left"
            >
              Revenue performance?
            </button>
            <button
              onClick={() => handleSendChat("What is our total opex variance?")}
              className="text-[9px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all text-left"
            >
              Opex variance?
            </button>
            <button
              onClick={() => handleSendChat("How is my cash runway looking?")}
              className="text-[9px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all text-left"
            >
              Cash runway?
            </button>
          </div>

          {/* Drawer input box */}
          <div className="p-4 border-t border-slate-800/80 bg-[#06070a] flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendChat();
              }}
              placeholder="Ask CFO a financial question..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-medium"
            />
            <button
              onClick={() => handleSendChat()}
              className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-slate-950 font-bold hover:bg-indigo-500 transition-all active:scale-95"
            >
              <Send size={12} className="text-slate-950" />
            </button>
          </div>

        </div>
      )}

      {/* Scenario Clone Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#0d0f14] p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Plus size={18} className="text-indigo-400" />
              <h4 className="text-sm font-bold text-slate-200">Clone Scenario Model</h4>
            </div>

            <form onSubmit={handleCloneScenario} className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Scenario Name</span>
                <input
                  type="text"
                  required
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  placeholder="e.g. Q3 Growth Scenario"
                  className="bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Description</span>
                <textarea
                  value={newScenarioDesc}
                  onChange={(e) => setNewScenarioDesc(e.target.value)}
                  placeholder="Scenario scaling factors..."
                  rows={2}
                  className="bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 text-slate-200 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Growth Rate</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={cloneGrowthRate}
                    onChange={(e) => setCloneGrowthRate(parseFloat(e.target.value))}
                    className="bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 text-slate-200 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Allocation Rule</span>
                  <select
                    value={cloneAllocationRule}
                    onChange={(e) => setCloneAllocationRule(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 text-slate-200"
                  >
                    <option value="uniform">Uniform Scaling</option>
                    <option value="revenue_weighted">Revenue Weighted</option>
                    <option value="opex_only">Opex Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCloneModal(false)}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cloning}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {cloning ? <Loader2 size={12} className="animate-spin text-slate-950" /> : <Play size={12} />}
                  Clone Baseline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer bar */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 border-t border-slate-900/60 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-500">
        <span>© 2026 ProScale Suite • Financial Planning & Analysis Framework</span>
        <div className="flex gap-4">
          <a href="#" className="hover:underline">Consolidation Ledger Rules</a>
          <a href="#" className="hover:underline">Virtual CFO Audit Logs</a>
        </div>
      </footer>
    </div>
  );
}
