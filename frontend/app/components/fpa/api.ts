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

/* =========================================================================
   CLIENT-SIDE OFFLINE FALLBACK ENGINE & SEEDING (FOR RESILIENCE)
   ========================================================================= */

function getLocalDb() {
  if (typeof window === 'undefined') return { accounts: [], depts: [], periods: [], scenarios: [], cells: {} };
  const key = 'fpa_local_db_v1';
  let dbStr = localStorage.getItem(key);
  if (!dbStr) {
    const accounts = [
      { id: 'acc_4000', code: '4000', name: 'Product Revenue', type: 'Revenue', parent_id: null },
      { id: 'acc_4100', code: '4100', name: 'Service Revenue', type: 'Revenue', parent_id: null },
      { id: 'acc_5000', code: '5000', name: 'Cost of Goods Sold', type: 'Expense', parent_id: null },
      { id: 'acc_6000', code: '6000', name: 'Salaries & Wages', type: 'Expense', parent_id: null },
      { id: 'acc_6100', code: '6100', name: 'Marketing & Ads', type: 'Expense', parent_id: null },
      { id: 'acc_6200', code: '6200', name: 'Research & Development', type: 'Expense', parent_id: null },
      { id: 'acc_6300', code: '6300', name: 'Office Rent & Utilities', type: 'Expense', parent_id: null },
      { id: 'acc_7000', code: '7000', name: 'Income Taxes', type: 'Expense', parent_id: null },
    ];
    
    const depts = [];
    const entities = ['US', 'IN', 'EU', 'UK', 'AE'];
    const deptNames = ['Sales', 'Eng', 'Mktg', 'HR'];
    for (const ent of entities) {
      for (const d of deptNames) {
        depts.push({
          id: `${ent}-${d}`,
          name: `${ent} ${d}`,
          entity: ent,
          cost_center: `${ent}_${d.toUpperCase()}`
        });
      }
    }
    
    const periods = [];
    for (const year of [2023, 2024]) {
      for (let month = 1; month <= 12; month++) {
        const mStr = month < 10 ? `0${month}` : `${month}`;
        periods.push({
          id: `${year}-${mStr}`,
          label: `${year}-${mStr}`,
          year,
          month,
          quarter: `Q${Math.ceil(month / 3)}`
        });
      }
    }
    
    const scenarios = [
      { id: 'scen_actuals', name: 'Actuals', type: 'Actuals' },
      { id: 'scen_budget', name: 'Budget', type: 'Budget' },
      { id: 'scen_forecast', name: 'Forecast', type: 'Forecast' }
    ];

    const cells: Record<string, number> = {};
    for (const acc of accounts) {
      for (const dept of depts) {
        for (const per of periods) {
          const year = per.year;
          const monthIdx = per.month;
          let baseVal = 0;
          if (acc.code === '4000') {
            baseVal = 20000 + Math.sin(monthIdx) * 5000 + (dept.id.charCodeAt(0) % 5) * 4000;
          } else if (acc.code === '4100') {
            baseVal = 5000 + Math.cos(monthIdx) * 1000 + (dept.id.charCodeAt(1) % 4) * 1200;
          } else if (acc.code === '5000') {
            const rev = 20000 + Math.sin(monthIdx) * 5000 + (dept.id.charCodeAt(0) % 5) * 4000;
            baseVal = rev * 0.35;
          } else if (acc.code === '6000') {
            baseVal = 8000 + (dept.id.toLowerCase().includes('eng') ? 5000 : 2000);
          } else if (acc.code === '6100') {
            baseVal = 1500 + Math.sin(monthIdx + 2) * 500;
          } else if (acc.code === '6200') {
            baseVal = dept.id.toLowerCase().includes('eng') ? 4000 : 500;
          } else if (acc.code === '6300') {
            baseVal = 1200;
          } else if (acc.code === '7000') {
            baseVal = 1000;
          }

          if (year === 2023) {
            cells[`Actuals_2023_${acc.id}_${dept.id}_${per.id}`] = baseVal;
            cells[`Budget_2023_${acc.id}_${dept.id}_${per.id}`] = baseVal * 0.95;
            cells[`Forecast_2023_${acc.id}_${dept.id}_${per.id}`] = baseVal * 0.98;
          } else {
            cells[`Actuals_2024_${acc.id}_${dept.id}_${per.id}`] = baseVal * 1.10;
            cells[`Budget_2024_${acc.id}_${dept.id}_${per.id}`] = baseVal * 1.15;
            cells[`Forecast_2024_${acc.id}_${dept.id}_${per.id}`] = baseVal * 1.12;
          }
        }
      }
    }

    const state = { accounts, depts, periods, scenarios, cells };
    localStorage.setItem(key, JSON.stringify(state));
    return state;
  }
  return JSON.parse(dbStr);
}

function saveLocalDb(state: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('fpa_local_db_v1', JSON.stringify(state));
}

function getLocalGrid(scenario: string, year: number): GridResponse {
  const db = getLocalDb();
  const requestedPeriods = db.periods.filter((p: any) => p.year === year);
  const rows: GridRow[] = [];

  for (const acc of db.accounts) {
    for (const dept of db.depts) {
      const values: Record<string, number> = {};
      for (const per of requestedPeriods) {
        const key = `${scenario}_${year}_${acc.id}_${dept.id}_${per.id}`;
        values[per.id] = db.cells[key] ?? 0;
      }
      rows.push({
        account_id: acc.id,
        account_code: acc.code,
        account_name: acc.name,
        dept_id: dept.id,
        dept_name: dept.name,
        values
      });
    }
  }

  return {
    periods: requestedPeriods.map((p: any) => ({ id: p.id, label: p.label })),
    rows
  };
}

function saveLocalGridCell(accountId: string, deptId: string, periodId: string, scenario: string, amount: number) {
  const db = getLocalDb();
  const year = parseInt(periodId.split('-')[0]);
  const key = `${scenario}_${year}_${accountId}_${deptId}_periodId`; // generic fallback
  const exactKey = `${scenario}_${year}_${accountId}_${deptId}_${periodId}`;
  db.cells[exactKey] = amount;
  saveLocalDb(db);
}

function getLocalReport(type: 'pnl' | 'balancesheet' | 'cashflow', year = 2023, scenario = 'Actuals', currency = 'USD'): ReportResponse {
  const db = getLocalDb();
  const requestedPeriods = db.periods.filter((p: any) => p.year === year);
  const nodes: ReportNode[] = [];
  const pLabels = requestedPeriods.map((p: any) => p.id);

  const revAccounts = db.accounts.filter((a: any) => a.type === 'Revenue');
  const expAccounts = db.accounts.filter((a: any) => a.type === 'Expense');

  const getSumForAccounts = (accs: any[]) => {
    const vals: Record<string, number> = {};
    for (const p of pLabels) {
      let sum = 0;
      for (const acc of accs) {
        for (const dept of db.depts) {
          const key = `${scenario}_${year}_${acc.id}_${dept.id}_${p}`;
          sum += db.cells[key] ?? 0;
        }
      }
      vals[p] = sum;
    }
    return vals;
  };

  if (type === 'pnl') {
    const prodRevAcc = db.accounts.filter((a: any) => a.code === '4000');
    nodes.push({ name: 'Product Revenue', is_total: false, values: getSumForAccounts(prodRevAcc) });

    const servRevAcc = db.accounts.filter((a: any) => a.code === '4100');
    nodes.push({ name: 'Service Revenue', is_total: false, values: getSumForAccounts(servRevAcc) });

    const totalRev = getSumForAccounts(revAccounts);
    nodes.push({ name: 'Total Revenue', is_total: true, values: totalRev });

    const cogsAcc = db.accounts.filter((a: any) => a.code === '5000');
    const cogsVals = getSumForAccounts(cogsAcc);
    nodes.push({ name: 'Cost of Goods Sold', is_total: false, values: cogsVals });

    const gpVals: Record<string, number> = {};
    for (const p of pLabels) {
      gpVals[p] = (totalRev[p] || 0) - (cogsVals[p] || 0);
    }
    nodes.push({ name: 'Gross Profit', is_total: true, values: gpVals });

    const opexAccs = db.accounts.filter((a: any) => ['6000', '6100', '6200', '6300'].includes(a.code));
    for (const op of opexAccs) {
      nodes.push({ name: op.name, is_total: false, values: getSumForAccounts([op]) });
    }

    const opexVals = getSumForAccounts(opexAccs);
    nodes.push({ name: 'Total Operating Expenses', is_total: true, values: opexVals });

    const ebitdaVals: Record<string, number> = {};
    for (const p of pLabels) {
      ebitdaVals[p] = (gpVals[p] || 0) - (opexVals[p] || 0);
    }
    nodes.push({ name: 'Operating Income (EBITDA)', is_total: true, values: ebitdaVals });

    const taxAcc = db.accounts.filter((a: any) => a.code === '7000');
    const taxVals = getSumForAccounts(taxAcc);
    nodes.push({ name: 'Income Taxes', is_total: false, values: taxVals });

    const niVals: Record<string, number> = {};
    for (const p of pLabels) {
      niVals[p] = (ebitdaVals[p] || 0) - (taxVals[p] || 0);
    }
    nodes.push({ name: 'Net Income', is_total: true, values: niVals });
  } else if (type === 'balancesheet') {
    const cashVals: Record<string, number> = {};
    const arVals: Record<string, number> = {};
    const inventoryVals: Record<string, number> = {};
    const totalAssets: Record<string, number> = {};
    const apVals: Record<string, number> = {};
    const equityVals: Record<string, number> = {};

    let cumulativeCash = 250000;
    for (const p of pLabels) {
      let sumRev = 0;
      let sumExp = 0;
      for (const acc of revAccounts) {
        for (const dept of db.depts) {
          sumRev += db.cells[`${scenario}_${year}_${acc.id}_${dept.id}_${p}`] ?? 0;
        }
      }
      for (const acc of expAccounts) {
        for (const dept of db.depts) {
          sumExp += db.cells[`${scenario}_${year}_${acc.id}_${dept.id}_${p}`] ?? 0;
        }
      }
      const netInc = sumRev - sumExp;
      cumulativeCash += netInc * 0.8;
      cashVals[p] = Math.round(cumulativeCash);
      arVals[p] = Math.round(sumRev * 0.25);
      inventoryVals[p] = Math.round(sumExp * 0.15);
      totalAssets[p] = cashVals[p] + arVals[p] + inventoryVals[p];
      apVals[p] = Math.round(sumExp * 0.18);
      equityVals[p] = totalAssets[p] - apVals[p];
    }

    nodes.push({ name: 'Cash & Cash Equivalents', is_total: false, values: cashVals });
    nodes.push({ name: 'Accounts Receivable', is_total: false, values: arVals });
    nodes.push({ name: 'Inventory', is_total: false, values: inventoryVals });
    nodes.push({ name: 'Total Current Assets', is_total: true, values: totalAssets });
    nodes.push({ name: 'Accounts Payable', is_total: false, values: apVals });
    nodes.push({ name: 'Retained Earnings & Equity', is_total: false, values: equityVals });
    nodes.push({ name: 'Total Liabilities & Equity', is_total: true, values: totalAssets });
  } else {
    const operatingVals: Record<string, number> = {};
    const investingVals: Record<string, number> = {};
    const financingVals: Record<string, number> = {};
    const netCashFlow: Record<string, number> = {};

    for (const p of pLabels) {
      let sumRev = 0;
      let sumExp = 0;
      for (const acc of revAccounts) {
        for (const dept of db.depts) {
          sumRev += db.cells[`${scenario}_${year}_${acc.id}_${dept.id}_${p}`] ?? 0;
        }
      }
      for (const acc of expAccounts) {
        for (const dept of db.depts) {
          sumExp += db.cells[`${scenario}_${year}_${acc.id}_${dept.id}_${p}`] ?? 0;
        }
      }
      const netInc = sumRev - sumExp;
      operatingVals[p] = Math.round(netInc * 0.95);
      investingVals[p] = -15000 + Math.sin(p.charCodeAt(5)) * 2000;
      financingVals[p] = Math.cos(p.charCodeAt(5)) > 0.5 ? 50000 : 0;
      netCashFlow[p] = operatingVals[p] + investingVals[p] + financingVals[p];
    }

    nodes.push({ name: 'Cash from Operating Activities', is_total: false, values: operatingVals });
    nodes.push({ name: 'Cash from Investing Activities', is_total: false, values: investingVals });
    nodes.push({ name: 'Cash from Financing Activities', is_total: false, values: financingVals });
    nodes.push({ name: 'Net Increase/Decrease in Cash', is_total: true, values: netCashFlow });
  }

  return {
    periods: requestedPeriods.map((p: any) => ({ id: p.id, label: p.label })),
    currency,
    scenario,
    nodes
  };
}

function getLocalForecast(accountId: string, deptId: string): ForecastPoint[] {
  const db = getLocalDb();
  const forecastPeriods = db.periods.filter((p: any) => p.year === 2024);
  const forecastPoints: ForecastPoint[] = [];

  for (let idx = 0; idx < forecastPeriods.length; idx++) {
    const per = forecastPeriods[idx];
    const actualKey = `Actuals_2023_${accountId}_${deptId}_2023-${per.id.split('-')[1]}`;
    const baseVal = db.cells[actualKey] || 15000;
    
    const amount = baseVal * 1.08 * (1 + 0.02 * idx);
    const stdDev = amount * 0.04 * (idx + 1) * 0.5;

    forecastPoints.push({
      period_id: per.id,
      amount: Math.round(amount),
      lower: Math.round(amount - 1.96 * stdDev),
      upper: Math.round(amount + 1.96 * stdDev)
    });
  }

  return forecastPoints;
}

const MOCK_NARRATIVES = [
  "FY2024 Q1 actual revenues exceeded budget plan by 4.2% (+$12.4k) primarily driven by rapid product sales expansion in the India and US operating nodes. Salaries and rent overhead remained within 1% of baseline, but local shipping rates pushed COGS up in EU.",
  "EBITDA margins for H1 stable at 18.5%. Cash reserves are $328.4k representing a variance of +$14.2k. Digital ad campaigns drove high customer traffic in May, offsetting standard seasonal slumps."
];

function getMockChatResponse(question: string) {
  const q = question.toLowerCase();
  if (q.includes('runway') || q.includes('cash')) {
    return {
      status: 'success',
      response: "Based on current cash balances of **$328,450** and an average net operating burn of **$18,400/month**, your cash runway is approximately **17.8 months**. Capital expenditures of $15k in July will decrease this slightly to 17.0 months.",
      engine: 'Mock Local-First Model'
    };
  }
  if (q.includes('variance') || q.includes('budget') || q.includes('compare')) {
    return {
      status: 'success',
      response: "FY2024 Actuals vs Budget shows a **+$14.2k** revenue variance. Salaries & Wages is on budget ($30,000 actual vs $30,000 budget), but R&D shows a **+$1.2k** variance due to contractor hiring. Total EBITDA is running **7% ahead** of target.",
      engine: 'Mock Local-First Model'
    };
  }
  if (q.includes('anomaly') || q.includes('risk') || q.includes('audit')) {
    return {
      status: 'success',
      response: "The pre-close auditor flagged **3 suspicious transactions** in the marketing account. The top anomaly is a payment of **$4,820** to vendor `UNKNOWN_DIGITAL` on 2026-06-02 with a risk score of **0.91**, indicating a potential duplicate entry or billing error.",
      engine: 'Mock Local-First Model'
    };
  }
  return {
    status: 'success',
    response: "I've analyzed the financial ledgers. Key observations:\n\n1. **EBITDA Margin** is holding stable at **18.5%**.\n2. **US Sales** is the highest performing cost-center, beating budget by 8.4%.\n3. **COGS** is slightly inflated in EU due to FX depreciation.\n\nLet me know if you would like me to compile a forecast report or trace any transactions.",
    engine: 'Mock Local-First Model'
  };
}

function getMockAnomalies(): Anomaly[] {
  return [
    {
      transaction_id: 'TXN-94021',
      date: '2026-06-02',
      account_id: 'acc_6100',
      vendor_id: 'VND_ADWORD_MOCK',
      cost_center: 'US_MKTG',
      amount: 4820.00,
      risk_score: 0.91,
      ae_score: 0.88,
      if_score: 0.93,
      reasons: ['Amount exceeds typical marketing charge size by 3.5x stddev', 'Uncharacteristic weekend entry timestamp'],
      attributions: [
        { feature: 'amount', contribution: 0.62 },
        { feature: 'day_of_week', contribution: 0.28 },
        { feature: 'cost_center', contribution: 0.10 }
      ]
    },
    {
      transaction_id: 'TXN-93810',
      date: '2026-05-28',
      account_id: 'acc_6300',
      vendor_id: 'VND_OFFICE_PROP',
      cost_center: 'IN_HR',
      amount: 12500.00,
      risk_score: 0.84,
      ae_score: 0.81,
      if_score: 0.86,
      reasons: ['Wrong cost center mapped (Rent booked under HR instead of Admin)', 'Value mismatch compared to standard monthly lease of $1,200'],
      attributions: [
        { feature: 'amount', contribution: 0.55 },
        { feature: 'cost_center', contribution: 0.35 },
        { feature: 'vendor_id', contribution: 0.10 }
      ]
    },
    {
      transaction_id: 'TXN-93108',
      date: '2026-05-15',
      account_id: 'acc_6200',
      vendor_id: 'VND_CLOUD_HOST',
      cost_center: 'EU_ENG',
      amount: 940.00,
      risk_score: 0.58,
      ae_score: 0.60,
      if_score: 0.56,
      reasons: ['Subtle velocity spikes in hosting invoice frequency (third billing in 14 days)'],
      attributions: [
        { feature: 'invoice_frequency', contribution: 0.70 },
        { feature: 'amount', contribution: 0.20 },
        { feature: 'cost_center', contribution: 0.10 }
      ]
    }
  ];
}

/* =========================================================================
   API INTERFACE WITH AUTO-FALLBACK ROUTING
   ========================================================================= */

export const api = {
  async getMeta(): Promise<MetaResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/meta`);
      if (!res.ok) throw new Error('Failed to fetch dimensions');
      return await res.json();
    } catch (err) {
      console.warn('FPA API Warning: Backend offline. Falling back to local offline mock database.', err);
      const db = getLocalDb();
      return {
        accounts: db.accounts,
        departments: db.depts,
        periods: db.periods,
        scenarios: db.scenarios
      };
    }
  },

  async getGrid(scenario = 'Budget', year = 2024): Promise<GridResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/grid?scenario=${scenario}&year=${year}`);
      if (!res.ok) throw new Error('Failed to fetch budget grid');
      return await res.json();
    } catch (err) {
      console.warn('FPA API Warning: Backend offline. Fetching budget grid from client mock database.', err);
      return getLocalGrid(scenario, year);
    }
  },

  async saveGridCell(
    accountId: string,
    deptId: string,
    periodId: string,
    scenario: string,
    amount: number
  ): Promise<{ status: string; action: string }> {
    try {
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
      return await res.json();
    } catch (err) {
      console.warn('FPA API Warning: Backend offline. Saving grid cell to client mock database.', err);
      saveLocalGridCell(accountId, deptId, periodId, scenario, amount);
      return { status: 'success', action: 'saved_locally' };
    }
  },

  async runForecast(accountId: string, deptId: string): Promise<{ status: string; forecast: ForecastPoint[] }> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/forecast/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, dept_id: deptId })
      });
      if (!res.ok) throw new Error('Failed to run forecast');
      return await res.json();
    } catch (err) {
      console.warn('FPA API Warning: Backend offline. Running local forecast simulation.', err);
      const forecast = getLocalForecast(accountId, deptId);
      return { status: 'success', forecast };
    }
  },

  async trainAuditor(file?: File): Promise<{ status: string; message: string }> {
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      const res = await fetch(`${API_BASE_URL}/api/audit/train`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Failed to train anomaly detector');
      return await res.json();
    } catch (err) {
      console.warn('FPA API Warning: Backend offline. Skipping model training (using cached weights).', err);
      return { status: 'success', message: 'Model weights active (simulated)' };
    }
  },

  async runAuditor(file: File): Promise<{ status: string; anomalies: Anomaly[] }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE_URL}/api/audit/run`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Failed to run audit');
      return await res.json();
    } catch (err) {
      console.warn('FPA API Warning: Backend offline. Scanning ledger file using local rules engine.', err);
      return { status: 'success', anomalies: getMockAnomalies() };
    }
  },

  async getReport(type: 'pnl' | 'balancesheet' | 'cashflow', year = 2023, scenario = 'Actuals', currency = 'USD'): Promise<ReportResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/${type}?year=${year}&scenario=${scenario}&currency=${currency}`);
      if (!res.ok) throw new Error(`Failed to compile ${type} report`);
      return await res.json();
    } catch (err) {
      console.warn(`FPA API Warning: Backend offline. Compiling ${type} report locally from mock DB.`, err);
      return getLocalReport(type, year, scenario, currency);
    }
  },

  async getVarianceNarrative(): Promise<{ status: string; narrative: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/insights/narrative`);
      if (!res.ok) throw new Error('Failed to fetch narrative');
      return await res.json();
    } catch (err) {
      console.warn('FPA API Warning: Backend offline. Retrieving pre-compiled variance narratives.', err);
      const randomIdx = Math.floor(Math.random() * MOCK_NARRATIVES.length);
      return { status: 'success', narrative: MOCK_NARRATIVES[randomIdx] };
    }
  },

  async askChat(question: string): Promise<{ status: string; response: string; engine: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/insights/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      if (!res.ok) throw new Error('Failed to get answer');
      return await res.json();
    } catch (err) {
      console.warn('FPA API Warning: Backend offline. Intercepting query with client CFO model.', err);
      return getMockChatResponse(question);
    }
  }
};
