/**
 * ProScale Advisory: Database Types
 */

export interface ReconRun {
  id: string;
  date: string;
  fileName: string;
  totalRows: number;
  matchedCount: number;
  taxMismatchCount: number;
  missingIn2BCount: number;
  totalTaxAmount: number;
  varianceAmount: number;
  data: any[]; // The full result set (for history detail)
  headers: { pr: string[]; g2b: string[] };
  mapping: { pr: any; g2b: any };
}


export interface AnalyticsSummary {
  totalTaxProcessed: number;
  overallMatchRate: number;
  totalVariance: number;
  trendData: { month: string; matched: number; unmatched: number }[];
  categoryData: { name: string; value: number }[];
}
