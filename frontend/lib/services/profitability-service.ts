/**
 * ProScale Command Center: Profitability Engine Service
 */

export interface SkuProfitability {
  skuId: string;
  productName: string;
  category: string;
  brand: string;
  unitsSold: number;
  grossSalesPrice: number;
  discounts: number;
  netRevenue: number;
  cogs: number;
  commissions: number;
  shippingFee: number;
  packagingCost: number;
  adSpend: number;
  returnRate: number; // e.g. 0.25 (25%)
  returnShippingCost: number;
  damagedLoss: number;
  netProfit: number;
  marginPercent: number;
}

export interface ChannelProfitability {
  channel: string;
  grossSales: number;
  netRevenue: number;
  returnsCount: number;
  returnRate: number;
  adSpend: number;
  commissionPaid: number;
  logisticsPaid: number;
  netProfit: number;
  marginPercent: number;
}

export class ProfitabilityService {
  private static MOCK_SKUS: SkuProfitability[] = [
    {
      skuId: "D2C-APP-FIT-S",
      productName: "Premium Cotton Slim Fit Shirt (Black / S)",
      category: "Apparel",
      brand: "ProScale Threads",
      unitsSold: 1240,
      grossSalesPrice: 1299,
      discounts: 150,
      netRevenue: 1049,
      cogs: 320,
      commissions: 157.35, // 15% marketplace commission
      shippingFee: 78.50,
      packagingCost: 15.00,
      adSpend: 180.00,
      returnRate: 0.28, // 28% return rate (common in apparel)
      returnShippingCost: 65.00,
      damagedLoss: 45.00,
      netProfit: 135.23,
      marginPercent: 12.89
    },
    {
      skuId: "D2C-APP-FIT-M",
      productName: "Premium Cotton Slim Fit Shirt (Black / M)",
      category: "Apparel",
      brand: "ProScale Threads",
      unitsSold: 2150,
      grossSalesPrice: 1299,
      discounts: 150,
      netRevenue: 1049,
      cogs: 320,
      commissions: 157.35,
      shippingFee: 78.50,
      packagingCost: 15.00,
      adSpend: 165.00,
      returnRate: 0.32, // High returns due to sizing mismatches
      returnShippingCost: 65.00,
      damagedLoss: 45.00,
      netProfit: 97.43,
      marginPercent: 9.29
    },
    {
      skuId: "D2C-ELEC-EAR-BT",
      productName: "ProScale Acoustics Wireless Earbuds",
      category: "Electronics",
      brand: "ProScale Sound",
      unitsSold: 980,
      grossSalesPrice: 2499,
      discounts: 300,
      netRevenue: 2049,
      cogs: 650,
      commissions: 245.88, // 12% commission
      shippingFee: 90.00,
      packagingCost: 25.00,
      adSpend: 380.00,
      returnRate: 0.12, // Lower returns in electronics
      returnShippingCost: 75.00,
      damagedLoss: 110.00,
      netProfit: 593.72,
      marginPercent: 28.98
    },
    {
      skuId: "D2C-COS-MAT-LIP",
      productName: "Matte Finish Waterproof Lipstick (Red)",
      category: "Cosmetics",
      brand: "ProScale Glow",
      unitsSold: 3200,
      grossSalesPrice: 499,
      discounts: 50,
      netRevenue: 419,
      cogs: 65,
      commissions: 83.80, // 20% commission
      shippingFee: 60.00,
      packagingCost: 10.00,
      adSpend: 120.00,
      returnRate: 0.08, // Low returns in cosmetics (non-returnable category mostly, except RTO)
      returnShippingCost: 60.00,
      damagedLoss: 15.00,
      netProfit: 71.00,
      marginPercent: 16.95
    },
    {
      skuId: "D2C-ACC-LEATH-W",
      productName: "Handcrafted RFID Leather Wallet (Brown)",
      category: "Accessories",
      brand: "ProScale Leather",
      unitsSold: 640,
      grossSalesPrice: 1599,
      discounts: 250,
      netRevenue: 1249,
      cogs: 290,
      commissions: 187.35,
      shippingFee: 70.00,
      packagingCost: 20.00,
      adSpend: 290.00,
      returnRate: 0.38, // High RTO rates for premium COD wallets
      returnShippingCost: 65.00,
      damagedLoss: 35.00,
      netProfit: 254.65,
      marginPercent: 20.39
    },
    {
      skuId: "D2C-HOME-MUG-CER",
      productName: "Ceramic Coffee Mug (Set of 2 / Matte Black)",
      category: "Home & Kitchen",
      brand: "ProScale Living",
      unitsSold: 510,
      grossSalesPrice: 799,
      discounts: 100,
      netRevenue: 649,
      cogs: 140,
      commissions: 97.35,
      shippingFee: 110.00, // Heavy item, higher shipping
      packagingCost: 40.00, // Needs bubble wrap
      adSpend: 150.00,
      returnRate: 0.15,
      returnShippingCost: 95.00,
      damagedLoss: 80.00, // High breakage loss
      netProfit: -20.60, // Loss-making due to high weight shipping, bubble wrap, and breakage
      marginPercent: -3.17
    }
  ];

  private static MOCK_CHANNELS: ChannelProfitability[] = [
    {
      channel: "Amazon IN",
      grossSales: 4850000,
      netRevenue: 3950000,
      returnsCount: 420,
      returnRate: 0.16,
      adSpend: 540000,
      commissionPaid: 632000,
      logisticsPaid: 412000,
      netProfit: 1246000,
      marginPercent: 31.54
    },
    {
      channel: "Flipkart",
      grossSales: 3240000,
      netRevenue: 2650000,
      returnsCount: 610,
      returnRate: 0.23,
      adSpend: 310000,
      commissionPaid: 397500,
      logisticsPaid: 325000,
      netProfit: 712500,
      marginPercent: 26.89
    },
    {
      channel: "Meesho",
      grossSales: 4120000,
      netRevenue: 3420000,
      returnsCount: 1480,
      returnRate: 0.36, // High return rate on Meesho
      adSpend: 280000,
      commissionPaid: 171000, // Lower commission %
      logisticsPaid: 724000, // High shipping costs due to RTO rate
      netProfit: 462000,
      marginPercent: 13.51
    },
    {
      channel: "Direct Website (Shopify)",
      grossSales: 1850000,
      netRevenue: 1490000,
      returnsCount: 120,
      returnRate: 0.08,
      adSpend: 620000, // High marketing cost for D2C customer acquisition
      commissionPaid: 37250, // Standard PG charges (2.5%)
      logisticsPaid: 165000,
      netProfit: 212750,
      marginPercent: 14.28
    }
  ];

  public static getSkuProfitabilityList(): SkuProfitability[] {
    return this.MOCK_SKUS;
  }

  public static getChannelProfitabilityList(): ChannelProfitability[] {
    return this.MOCK_CHANNELS;
  }

  public static calculateSkuProfit(sku: SkuProfitability, adjustments?: { returnRateChange?: number; adSpendChange?: number }): SkuProfitability {
    const returnRate = Math.max(0, sku.returnRate + (adjustments?.returnRateChange || 0));
    const adSpend = Math.max(0, sku.adSpend * (1 + (adjustments?.adSpendChange || 0)));
    
    // Recalculate return costs and net profit
    // Return Shipping Cost is applied to return rate times sold units
    const estReturnShipping = returnRate * sku.returnShippingCost;
    const estDamagedLoss = returnRate * sku.damagedLoss;
    
    const grossMargin = sku.netRevenue - sku.cogs - sku.commissions - sku.shippingFee - sku.packagingCost;
    const netProfit = grossMargin - adSpend - estReturnShipping - estDamagedLoss;
    const marginPercent = sku.netRevenue > 0 ? (netProfit / sku.netRevenue) * 100 : 0;
    
    return {
      ...sku,
      returnRate,
      adSpend,
      netProfit,
      marginPercent: parseFloat(marginPercent.toFixed(2))
    };
  }
}
