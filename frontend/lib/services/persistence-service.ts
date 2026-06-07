/**
 * ProScale Advisory: Persistence Service (Mock Supabase)
 * Uses LocalStorage to simulate a cloud database for "World Class" speed and low cost.
 */

import { ReconRun, AnalyticsSummary } from "@/types/recon";

const STORAGE_KEY = "proscale_recon_runs";

export class PersistenceService {
  /**
   * Save a completed reconciliation run
   */
  static saveRun(run: Omit<ReconRun, "id" | "date">): ReconRun {
    const runs = this.getAllRuns();
    const newRun: ReconRun = {
      ...run,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString()
    };
    
    runs.unshift(newRun); // Newest first
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
    return newRun;
  }

  /**
   * Get all historical runs
   */
  static getAllRuns(): ReconRun[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Delete a specific run
   */
  static deleteRun(id: string): void {
    const runs = this.getAllRuns().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  }

  /**
   * Clear all history
   */
  static clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Generate aggregated analytics for the Analysis tab
   */

  static getAnalyticsSummary(): AnalyticsSummary {
    const runs = this.getAllRuns();
    
    // Aggregate data
    const totalTaxProcessed = runs.reduce((sum, r) => sum + r.totalTaxAmount, 0);
    const totalVariance = runs.reduce((sum, r) => sum + r.varianceAmount, 0);
    const totalMatched = runs.reduce((sum, r) => sum + r.matchedCount, 0);
    const totalRecords = runs.reduce((sum, r) => sum + r.totalRows, 0);
    const overallMatchRate = totalRecords > 0 ? (totalMatched / totalRecords) * 100 : 0;

    // Trend Data (Last 5 runs)
    const trendData = runs.slice(0, 5).reverse().map(r => ({
      month: new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      matched: r.matchedCount,
      unmatched: r.totalRows - r.matchedCount
    }));

    // Category Distribution
    const categoryData = [
      { name: 'Matched', value: totalMatched },
      { name: 'Tax Mismatch', value: runs.reduce((sum, r) => sum + r.taxMismatchCount, 0) },
      { name: 'Missing in 2B', value: runs.reduce((sum, r) => sum + r.missingIn2BCount, 0) }
    ].filter(c => c.value > 0);

    return {
      totalTaxProcessed,
      overallMatchRate,
      totalVariance,
      trendData,
      categoryData
    };
  }
}
