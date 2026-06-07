/**
 * ProScale Command Center: Cash Flow Prediction Engine Service
 */

export interface CashForecastPoint {
  date: string;
  balance: number;
  inflow: number;
  outflow: number;
  details: { label: string; amount: number; type: "inflow" | "outflow" }[];
}

export interface ScenarioConfig {
  returnRateChange: number; // e.g. 0.05 (+5%)
  adSpendChange: number; // e.g. -0.20 (-20%)
  vendorDelayDays: number; // e.g. 15
  payoutDelayDays: number; // e.g. 5
}

export class ForecastService {
  private static START_CASH = 845000; // Starting Bank Balance: ₹8,45,000

  // Standard monthly recurring expense calendars
  private static MONTHLY_OUTFLOWS = [
    { day: 1, label: "Employee Salaries", amount: 245000 },
    { day: 5, label: "Warehouse Rent & EMIs", amount: 95000 },
    { day: 7, label: "TDS / TCS Tax Payment", amount: 42500 },
    { day: 10, label: "Software Subscriptions", amount: 12000 },
    { day: 15, label: "Vendor Raw Materials (Primary)", amount: 350000 },
    { day: 20, label: "GSTR-3B Outward GST Payment", amount: 184000 },
    { day: 25, label: "Ad Spend Invoices (Prepaid)", amount: 150000 }
  ];

  // Daily expected marketplace payouts
  private static DAILY_INFLOWS = {
    amazon: { dayOfWeek: 3, amount: 245000, label: "Amazon Weekly Settlement" }, // Wednesday
    meesho: { dayOfWeek: 5, amount: 320000, label: "Meesho Settlement" }, // Friday
    flipkart: { dayOfWeek: 1, amount: 180000, label: "Flipkart Settlement" } // Monday
  };

  public static generate90DayForecast(scenario: ScenarioConfig): CashForecastPoint[] {
    const points: CashForecastPoint[] = [];
    let currentBalance = this.START_CASH;
    const today = new Date();
    
    // We project 90 days out
    for (let dayIndex = 0; dayIndex < 90; dayIndex++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayIndex);
      
      const dayOfMonth = currentDate.getDate();
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      let dailyInflow = 0;
      let dailyOutflow = 0;
      const details: { label: string; amount: number; type: "inflow" | "outflow" }[] = [];
      
      // 1. Process Payout Inflows (with potential delays)
      const adjustedInflowDay = (targetDay: number) => {
        let val = targetDay - scenario.payoutDelayDays;
        if (val < 0) val += 7;
        return val % 7;
      };

      // Inflows are scaled by return rate changes
      const inflowMultiplier = Math.max(0.7, 1 - (scenario.returnRateChange * 1.5));

      if (dayOfWeek === adjustedInflowDay(3)) {
        const amt = this.DAILY_INFLOWS.amazon.amount * inflowMultiplier;
        dailyInflow += amt;
        details.push({ label: this.DAILY_INFLOWS.amazon.label, amount: amt, type: "inflow" });
      }
      if (dayOfWeek === adjustedInflowDay(5)) {
        const amt = this.DAILY_INFLOWS.meesho.amount * inflowMultiplier;
        dailyInflow += amt;
        details.push({ label: this.DAILY_INFLOWS.meesho.label, amount: amt, type: "inflow" });
      }
      if (dayOfWeek === adjustedInflowDay(1)) {
        const amt = this.DAILY_INFLOWS.flipkart.amount * inflowMultiplier;
        dailyInflow += amt;
        details.push({ label: this.DAILY_INFLOWS.flipkart.label, amount: amt, type: "inflow" });
      }

      // Add a baseline of minor daily Shopify prepaid orders
      const shopifyInflow = 22000 * (1 + (scenario.adSpendChange * 0.3)); // Ad changes affect D2C
      dailyInflow += shopifyInflow;
      details.push({ label: "D2C Direct Orders (Shopify PG)", amount: shopifyInflow, type: "inflow" });

      // 2. Process Outflows (with potential delays)
      this.MONTHLY_OUTFLOWS.forEach(outflow => {
        let scheduledDay = outflow.day;
        
        // Vendor invoices can be delayed
        if (outflow.label.includes("Vendor") && scenario.vendorDelayDays > 0) {
          scheduledDay = (scheduledDay + scenario.vendorDelayDays) % 28 || 28;
        }

        if (dayOfMonth === scheduledDay) {
          let amt = outflow.amount;
          
          // Ad spend changes scale the ad outflow
          if (outflow.label.includes("Ad Spend")) {
            amt = amt * (1 + scenario.adSpendChange);
          }
          // Returns increase can increase returns shipping expenses slightly
          if (outflow.label.includes("GST") && scenario.returnRateChange > 0) {
            amt = amt * 0.95; // GST liability might be slightly lower due to higher returns offset
          }

          dailyOutflow += amt;
          details.push({ label: outflow.label, amount: amt, type: "outflow" });
        }
      });

      // Daily baseline ad spends (non-consolidated)
      const dailyAdSpend = 12000 * (1 + scenario.adSpendChange);
      dailyOutflow += dailyAdSpend;
      details.push({ label: "Daily Ad Server Spend (Meta/Google)", amount: dailyAdSpend, type: "outflow" });

      // 3. Update Bank Balance
      currentBalance = currentBalance + dailyInflow - dailyOutflow;
      
      points.push({
        date: currentDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        balance: parseFloat(currentBalance.toFixed(2)),
        inflow: parseFloat(dailyInflow.toFixed(2)),
        outflow: parseFloat(dailyOutflow.toFixed(2)),
        details
      });
    }

    return points;
  }

  public static getWorkingCapitalLockup(): {
    slowMovingStock: number;
    returnsInTransit: number;
    pendingReimbursements: number;
    blockedItc: number;
  } {
    return {
      slowMovingStock: 485000, // stock value aged 90+ days
      returnsInTransit: 182300, // shipping charges locked in transit return pipelines
      pendingReimbursements: 92350, // disputed fees currently unresolved
      blockedItc: 37800 // missing GSTR-2B credit from non-compliant suppliers
    };
  }
}
