"use client";

const API_BASE_URL = 'http://localhost:8001';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  parent_id: string | null;
}

export interface Department {
  id: string;
  name: string;
  entity: string;
  cost_center: string;
}

export interface TimePeriod {
  id: string;
  label: string;
  year: number;
  month: number;
  quarter: string;
}

export interface Scenario {
  id: string;
  name: string;
  type: string;
}

export interface MetaResponse {
  accounts: Account[];
  departments: Department[];
  periods: TimePeriod[];
  scenarios: Scenario[];
}

export interface GridRow {
  account_id: string;
  account_code: string;
  account_name: string;
  dept_id: string;
  dept_name: string;
  values: Record<string, number>;
}

export interface GridResponse {
  periods: { id: string; label: string }[];
  rows: GridRow[];
}

export interface ReportNode {
  name: string;
  is_total: boolean;
  values: Record<string, number>;
}

export interface ReportResponse {
  periods: { id: string; label: string }[];
  currency: string;
  scenario: string;
  nodes: ReportNode[];
}

export interface ForecastPoint {
  period_id: string;
  amount: number;
  lower: number;
  upper: number;
}

export interface Anomaly {
  transaction_id: string;
  date: string;
  account_id: string;
  vendor_id: string;
  cost_center: string;
  amount: number;
  risk_score: number;
  ae_score: number;
  if_score: number;
  reasons: string[];
  attributions: { feature: string; contribution: number }[];
}

export const api = {
  async getMeta(): Promise<MetaResponse> {
    const res = await fetch(`${API_BASE_URL}/api/meta`);
    if (!res.ok) throw new Error('Failed to fetch dimensions');
    return res.json();
  },

  async getGrid(scenario = 'Budget', year = 2024): Promise<GridResponse> {
    const res = await fetch(`${API_BASE_URL}/api/grid?scenario=${scenario}&year=${year}`);
    if (!res.ok) throw new Error('Failed to fetch budget grid');
    return res.json();
  },

  async saveGridCell(
    accountId: string,
    deptId: string,
    periodId: string,
    scenario: string,
    amount: number
  ): Promise<{ status: string; action: string }> {
    const res = await fetch(`${API_BASE_URL}/api/grid/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: accountId,
        dept_id: deptId,
        period_id: periodId,
        scenario,
        amount
      })
    });
    if (!res.ok) throw new Error('Failed to save cell');
    return res.json();
  },

  async runForecast(accountId: string, deptId: string): Promise<{ status: string; forecast: ForecastPoint[] }> {
    const res = await fetch(`${API_BASE_URL}/api/forecast/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: accountId, dept_id: deptId })
    });
    if (!res.ok) throw new Error('Failed to run forecast');
    return res.json();
  },

  async trainAuditor(file?: File): Promise<{ status: string; message: string }> {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    const res = await fetch(`${API_BASE_URL}/api/audit/train`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to train anomaly detector');
    return res.json();
  },

  async runAuditor(file: File): Promise<{ status: string; anomalies: Anomaly[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/api/audit/run`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to run audit');
    return res.json();
  },

  async getReport(type: 'pnl' | 'balancesheet' | 'cashflow', year = 2023, scenario = 'Actuals', currency = 'USD'): Promise<ReportResponse> {
    const res = await fetch(`${API_BASE_URL}/api/reports/${type}?year=${year}&scenario=${scenario}&currency=${currency}`);
    if (!res.ok) throw new Error(`Failed to compile ${type} report`);
    return res.json();
  },

  async getVarianceNarrative(): Promise<{ status: string; narrative: string }> {
    const res = await fetch(`${API_BASE_URL}/api/insights/narrative`);
    if (!res.ok) throw new Error('Failed to fetch narrative');
    return res.json();
  },

  async askChat(question: string): Promise<{ status: string; response: string; engine: string }> {
    const res = await fetch(`${API_BASE_URL}/api/insights/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    if (!res.ok) throw new Error('Failed to get answer');
    return res.json();
  }
};
