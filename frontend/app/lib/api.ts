const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface PreviewResponse {
  filename: string;
  file_type: string;
  raw_headers: string[];
  suggested_mappings: Record<string, string>;
  canonical_schema: Record<string, { label: string; required: boolean; type?: string }>;
  preview_rows: Record<string, string>[];
  saved_templates: { id: string; name: string; mapping: Record<string, string> }[];
  contract_id?: string | null;
  confidence_level?: string;
  sheet_names?: string[];
  validation_errors?: string[];
  suitability?: string[];
}

export interface UploadResponse {
  status: string;
  file_type: string;
  total_rows: number;
  chunks_processed: number;
  batch_id: string;
  message: string;
}

export interface ReconcileResponse {
  status: string;
  total_matched: number;
  total_flagged: number;
  total_variance: number;
  net_profit: number;
  message: string;
}

export interface AnalyticsResponse {
  summary: {
    gross_revenue: number;
    gross_tax: number;
    returns_refund: number;
    net_revenue: number;
    settled_cash: number;
    platform_fees: number;
    cogs: number;
    total_profit: number;
    tcs: number;
    tds: number;
    variance: number;
    total_orders: number;
    flagged_count: number;
  };
  skus: {
    sku: string;
    name: string;
    sold: number;
    returned: number;
    net_revenue: number;
    cogs: number;
    fees: number;
    profit: number;
    margin_pct: number;
  }[];
  heatmap: Record<string, { orders: number; revenue: number }>;
  inventory: {
    sku: string;
    name: string;
    monthly_sales: number;
    daily_run_rate: number;
    min_safety_stock: number;
    stock_in_transit: number;
    cost: number;
    recommended_inventory_day: number;
    recommended_inventory_week: number;
  }[];
  flagged_orders: {
    order_id: string;
    sku: string;
    product_description: string;
    quantity_sold: number;
    quantity_returned: number;
    net_quantity: number;
    gross_sales: number;
    gross_tax: number;
    tcs_amount: number;
    refund_amount: number;
    settled_amount: number;
    marketplace_fee: number;
    tds_amount: number;
    net_payout: number;
    net_sales: number;
    cost_price: number;
    net_profit: number;
    shipping_state: string;
    variance: number;
    risk: string;
    month_year: string;
  }[];
}

export interface StagingStatus {
  sales_rows_staged: number;
  payment_rows_staged: number;
  returns_rows_staged: number;
  catalog_products: number;
  ready_to_reconcile: boolean;
}

export async function fetchPreview(
  file: File,
  userId: string,
  fileType: string
): Promise<PreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);
  formData.append("file_type", fileType);

  const res = await fetch(`${API_URL}/upload-preview`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Preview parsing failed" }));
    throw new Error(err.detail || "Preview parsing failed");
  }
  return res.json();
}

export async function uploadStream(
  file: File,
  userId: string,
  fileType: string,
  monthYear: string,
  columnMapping: Record<string, string>
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);
  formData.append("file_type", fileType);
  formData.append("month_year", monthYear);
  formData.append("column_mapping_json", JSON.stringify(columnMapping));

  const res = await fetch(`${API_URL}/upload-stream`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Streaming upload failed" }));
    throw new Error(err.detail || "Streaming upload failed");
  }
  return res.json();
}

export async function saveTemplate(
  userId: string,
  templateName: string,
  fileType: string,
  columnMapping: Record<string, string>
): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_URL}/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      template_name: templateName,
      file_type: fileType,
      column_mapping: columnMapping,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Save template failed" }));
    throw new Error(err.detail || "Save template failed");
  }
  return res.json();
}

export async function triggerReconciliation(
  userId: string,
  monthYear: string
): Promise<ReconcileResponse> {
  const res = await fetch(`${API_URL}/reconcile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, month_year: monthYear }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Reconciliation failed" }));
    throw new Error(err.detail || "Reconciliation failed");
  }
  return res.json();
}

export async function fetchAnalytics(
  userId: string,
  monthYear: string
): Promise<AnalyticsResponse> {
  const params = new URLSearchParams({ user_id: userId, month_year: monthYear });
  const res = await fetch(`${API_URL}/analytics?${params}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Analytics query failed" }));
    throw new Error(err.detail || "Analytics query failed");
  }
  return res.json();
}

export async function fetchStagingStatus(
  userId: string,
  monthYear: string
): Promise<StagingStatus> {
  const params = new URLSearchParams({ user_id: userId, month_year: monthYear });
  const res = await fetch(`${API_URL}/staging-status?${params}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Staging status failed" }));
    throw new Error(err.detail || "Staging status failed");
  }
  return res.json();
}

export function getExportUrl(userId: string, monthYear: string): string {
  const params = new URLSearchParams({ user_id: userId, month_year: monthYear });
  return `${API_URL}/export?${params}`;
}

export interface DisputeTicket {
  id: number;
  order_id: string;
  channel: string;
  dispute_type: string;
  amount: number;
  description: string;
  status: "OPEN" | "FILED" | "RESOLVED" | "REJECTED";
  created_at: string;
}

export async function uploadWarehouseLogs(
  file: File,
  userId: string
): Promise<{ status: string; message: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);

  const res = await fetch(`${API_URL}/upload-warehouse-logs`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Warehouse logs upload failed" }));
    throw new Error(err.detail || "Warehouse logs upload failed");
  }
  return res.json();
}

export async function fetchDisputes(userId: string): Promise<DisputeTicket[]> {
  const params = new URLSearchParams({ user_id: userId });
  const res = await fetch(`${API_URL}/disputes?${params}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to fetch disputes" }));
    throw new Error(err.detail || "Failed to fetch disputes");
  }
  return res.json();
}

export async function updateDisputeStatus(
  ticketId: number,
  status: string
): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_URL}/disputes/${ticketId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update status" }));
    throw new Error(err.detail || "Failed to update status");
  }
  return res.json();
}

// ============================================================================
// FP&A / VIRTUAL CFO SERVICES
// ============================================================================
export interface FpaMeta {
  companies: { id: string; name: string; currency: string }[];
  departments: { id: string; company_id: string; name: string }[];
  accounts: { id: string; code: string; name: string; type: string; subtype: string }[];
  periods: { id: string; date: string; label: string; quarter: string; fy: string }[];
  scenarios: { id: string; name: string; description: string; type: string; is_active: boolean }[];
}

export interface FpaFact {
  id: string;
  company_id: string;
  department_id: string;
  account_id: string;
  period_id: string;
  amount: number;
  currency: string;
  amount_usd: number;
}

export interface AnomalyItem {
  fact_id: string;
  amount: number;
  currency: string;
  account_code: string;
  account_name: string;
  department: string;
  period: string;
  score: number;
  reason: string;
}

export interface ForecastItem {
  period_label: string;
  amount: number;
  lower_ci: number;
  upper_ci: number;
}

export async function fetchFpaMeta(tenantId: string): Promise<FpaMeta> {
  const params = new URLSearchParams({ tenant_id: tenantId });
  const res = await fetch(`${API_URL}/api/v1/fpa/meta?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to fetch FPA metadata" }));
    throw new Error(err.detail || "Failed to fetch FPA metadata");
  }
  return res.json();
}

export async function fetchFpaGridData(tenantId: string, scenarioId: string): Promise<FpaFact[]> {
  const params = new URLSearchParams({ tenant_id: tenantId, scenario_id: scenarioId });
  const res = await fetch(`${API_URL}/api/v1/fpa/grid-data?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to fetch grid data" }));
    throw new Error(err.detail || "Failed to fetch grid data");
  }
  return res.json();
}

export async function saveBudgetCell(params: {
  scenario_id: string;
  company_id: string;
  department_id: string;
  account_id: string;
  time_period_id: string;
  amount: number;
  currency_code: string;
  tenant_id: string;
}): Promise<{ status: string; fact_id: string; amount_usd: number }> {
  const res = await fetch(`${API_URL}/api/v1/fpa/budgets/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to save budget cell" }));
    throw new Error(err.detail || "Failed to save budget cell");
  }
  return res.json();
}

export async function cloneScenario(params: {
  scenario_id: string;
  new_name: string;
  description?: string | null;
  growth_rate: number;
  allocation_rule: string;
  tenant_id: string;
}): Promise<{ status: string; scenario_id: string; records_cloned: number; message: string }> {
  const res = await fetch(`${API_URL}/api/v1/fpa/scenarios/clone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to clone scenario" }));
    throw new Error(err.detail || "Failed to clone scenario");
  }
  return res.json();
}

export async function runConsolidation(params: {
  scenario_id: string;
  target_currency: string;
  tenant_id: string;
}): Promise<{
  status: string;
  eliminated_transactions: number;
  converted_transactions: number;
  consolidated_total_usd: number;
  message: string;
}> {
  const res = await fetch(`${API_URL}/api/v1/fpa/consolidation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to run consolidation" }));
    throw new Error(err.detail || "Failed to run consolidation");
  }
  return res.json();
}

export async function runForecast(params: {
  tenant_id: string;
  company_id: string;
  account_id: string;
  periods_to_forecast: number;
}): Promise<{
  status: string;
  model: string;
  forecast: ForecastItem[];
  auto_selected?: boolean;
  metric_evaluated?: string;
}> {
  const formData = new FormData();
  formData.append("tenant_id", params.tenant_id);
  formData.append("company_id", params.company_id);
  formData.append("account_id", params.account_id);
  formData.append("periods_to_forecast", String(params.periods_to_forecast));

  const res = await fetch(`${API_URL}/api/v1/fpa/forecast/run`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to run forecast" }));
    throw new Error(err.detail || "Failed to run forecast");
  }
  return res.json();
}

export async function detectAnomalies(tenantId: string): Promise<{ status: string; anomalies: AnomalyItem[] }> {
  const params = new URLSearchParams({ tenant_id: tenantId });
  const res = await fetch(`${API_URL}/api/v1/fpa/anomaly/detect?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to detect anomalies" }));
    throw new Error(err.detail || "Failed to detect anomalies");
  }
  return res.json();
}

export async function fetchVarianceInsights(tenantId: string, companyId: string): Promise<{ status: string; narrative: string }> {
  const params = new URLSearchParams({ tenant_id: tenantId, company_id: companyId });
  const res = await fetch(`${API_URL}/api/v1/fpa/insights/variance?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to fetch variance insights" }));
    throw new Error(err.detail || "Failed to fetch variance insights");
  }
  return res.json();
}

export async function askFinancialChatbot(question: string, tenantId: string): Promise<{ status: string; response: string }> {
  const res = await fetch(`${API_URL}/api/v1/fpa/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, tenant_id: tenantId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Financial chatbot query failed" }));
    throw new Error(err.detail || "Financial chatbot query failed");
  }
  return res.json();
}

export async function triggerErpIntegration(params: {
  tenant_id: string;
  company_id: string;
  erp_system: string;
}): Promise<{ status: string; message: string }> {
  const formData = new FormData();
  formData.append("tenant_id", params.tenant_id);
  formData.append("company_id", params.company_id);
  formData.append("erp_system", params.erp_system);

  const res = await fetch(`${API_URL}/api/v1/fpa/integrations/erp`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "ERP integration pull failed" }));
    throw new Error(err.detail || "ERP integration pull failed");
  }
  return res.json();
}

