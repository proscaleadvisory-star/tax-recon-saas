/**
 * ProScale Command Center: Leakage Detection Engine Service
 */

export interface FeeLeakage {
  id: string;
  orderId: string;
  channel: string;
  type: "weight_mismatch" | "damaged_return" | "commission_overcharge" | "itc_blocked";
  catalogValue: number;
  chargedValue: number;
  leakageAmount: number;
  dateFlagged: string;
  severity: "low" | "medium" | "high";
  status: "detected" | "disputed" | "recovered" | "write_off";
  supplierOrAwb: string;
}

export class LeakageService {
  private static MOCK_LEAKAGES: FeeLeakage[] = [
    {
      id: "LK-001",
      orderId: "AMZ-994102-392",
      channel: "Amazon IN",
      type: "weight_mismatch",
      catalogValue: 500, // catalog weight in grams
      chargedValue: 1500, // billed courier weight in grams
      leakageAmount: 82.50, // extra shipping charge in INR
      dateFlagged: "2026-06-02",
      severity: "medium",
      status: "detected",
      supplierOrAwb: "AWB-882390123"
    },
    {
      id: "LK-002",
      orderId: "MSH-110294-845",
      channel: "Meesho",
      type: "damaged_return",
      catalogValue: 320, // expected unit refund / return value
      chargedValue: 0,
      leakageAmount: 320.00,
      dateFlagged: "2026-05-28",
      severity: "high",
      status: "detected",
      supplierOrAwb: "AWB-44920194"
    },
    {
      id: "LK-003",
      orderId: "FK-8830129-491",
      channel: "Flipkart",
      type: "commission_overcharge",
      catalogValue: 157.35, // expected commission (15%)
      chargedValue: 215.35, // charged commission (approx 20%)
      leakageAmount: 58.00,
      dateFlagged: "2026-06-01",
      severity: "medium",
      status: "detected",
      supplierOrAwb: "Fixed Fee Discrepancy"
    },
    {
      id: "LK-004",
      orderId: "INV-2026-0492",
      channel: "Purchase Books",
      type: "itc_blocked",
      catalogValue: 0,
      chargedValue: 37800.00, // locked tax credit
      leakageAmount: 37800.00,
      dateFlagged: "2026-05-15",
      severity: "high",
      status: "detected",
      supplierOrAwb: "Alpha Logistics GSTIN: 27AALPA0981M1ZN"
    },
    {
      id: "LK-005",
      orderId: "AMZ-773012-902",
      channel: "Amazon IN",
      type: "weight_mismatch",
      catalogValue: 980,
      chargedValue: 2500,
      leakageAmount: 110.00,
      dateFlagged: "2026-06-03",
      severity: "medium",
      status: "disputed", // currently filed with marketplace
      supplierOrAwb: "AWB-77291039"
    },
    {
      id: "LK-006",
      orderId: "MSH-99210-449",
      channel: "Meesho",
      type: "damaged_return",
      catalogValue: 499,
      chargedValue: 0,
      leakageAmount: 499.00,
      dateFlagged: "2026-05-20",
      severity: "high",
      status: "recovered", // dispute settled and credit received!
      supplierOrAwb: "AWB-992019"
    }
  ];

  public static getLeakagesList(): FeeLeakage[] {
    return this.MOCK_LEAKAGES;
  }

  public static updateLeakageStatus(id: string, status: FeeLeakage["status"]): void {
    const leakage = this.MOCK_LEAKAGES.find(l => l.id === id);
    if (leakage) {
      leakage.status = status;
    }
  }

  public static getTotalLeakageAmount(): number {
    return this.MOCK_LEAKAGES
      .filter(l => l.status === "detected" || l.status === "disputed")
      .reduce((sum, item) => sum + item.leakageAmount, 0);
  }

  public static getClaimTemplateText(leakage: FeeLeakage): string {
    if (leakage.type === "weight_mismatch") {
      return `Subject: Dispute of Incorrect Shipping Weight Charge - Order ID: ${leakage.orderId}

Dear Seller Support Team,

We are writing to dispute the shipping fees charged for Order ID: ${leakage.orderId} (AWB: ${leakage.supplierOrAwb}).

The courier billed weight was registered as ${leakage.chargedValue}g. However, the catalog volumetric weight for this SKU is only ${leakage.catalogValue}g. 

Enclosed are the details:
- Order Reference: ${leakage.orderId}
- AWB Code: ${leakage.supplierOrAwb}
- Volumetric Weight in Registry: ${leakage.catalogValue}g
- Volumetric Weight Billed: ${leakage.chargedValue}g
- Discrepancy Margin: ${leakage.chargedValue - leakage.catalogValue}g
- Overcharged Shipping Fee: INR ${leakage.leakageAmount}

Please audit the weight scan logs and credit the excess amount back to our settlement account.

Regards,
ProScale Advisor Billing Desk`;
    }

    if (leakage.type === "damaged_return") {
      return `Subject: Claim for Damaged Customer Return - Order ID: ${leakage.orderId}

Dear Support Team,

We received a customer return package for Order ID: ${leakage.orderId} (AWB: ${leakage.supplierOrAwb}) in a completely damaged/unsellable state.

As per the marketplace SLA, we request reimbursement for this item.

Reimbursement Details:
- Channel Order Ref: ${leakage.orderId}
- Return Waybill (AWB): ${leakage.supplierOrAwb}
- Product Expected Value: INR ${leakage.leakageAmount}
- Status: Package crushed/seals broken at delivery check.

Please process the claim reimbursement within the standard timeline.

Regards,
ProScale Advisor Warehouse Operations`;
    }

    return `Subject: General Exception Audit Request - ID: ${leakage.orderId}

Reference: Audit Flag ${leakage.id}
Charged Value: INR ${leakage.chargedValue}
Expected Value: INR ${leakage.catalogValue}
Variance: INR ${leakage.leakageAmount}

Please review the attached invoices and credit the difference.`;
  }
}
