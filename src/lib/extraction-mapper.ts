// Map Extracted Financial Data to Assumptions

import type { Assumptions } from './financial-logic';
import type {
  ExtractedFinancials,
  DerivedMetrics,
  ExtractionWarning,
} from './extraction-types';

/**
 * Calculate derived metrics from extracted financials
 */
export function calculateDerivedMetrics(data: ExtractedFinancials): DerivedMetrics {
  const revenue = data.revenue || 1; // Avoid division by zero
  const cogs = data.costOfRevenue || 0;

  // Margins
  const grossMargin = ((revenue - cogs) / revenue) * 100;
  const operatingMargin = (data.operatingIncome / revenue) * 100;
  const netMargin = (data.netIncome / revenue) * 100;

  // Effective tax rate
  const effectiveTaxRate =
    data.incomeBeforeTax > 0
      ? (data.incomeTaxExpense / data.incomeBeforeTax) * 100
      : 25; // Default to 25%

  // Revenue growth rate
  const revenueGrowthRate =
    data.priorYearRevenue && data.priorYearRevenue > 0
      ? ((revenue - data.priorYearRevenue) / data.priorYearRevenue) * 100
      : null;

  // Working capital days
  // DSO = (A/R / Revenue) * 365
  const daysReceivables =
    data.accountsReceivable > 0 ? (data.accountsReceivable / revenue) * 365 : 45;

  // DIO = (Inventory / COGS) * 365
  const daysInventory =
    data.inventory > 0 && cogs > 0 ? (data.inventory / cogs) * 365 : 60;

  // DPO = (A/P / COGS) * 365
  const daysPayables =
    data.accountsPayable > 0 && cogs > 0 ? (data.accountsPayable / cogs) * 365 : 30;

  // Cost percentages
  const cogsPercent = (cogs / revenue) * 100;

  // SG&A percent (use operating expenses if SG&A not available)
  const sgaPercent =
    data.sgaExpense !== null
      ? (data.sgaExpense / revenue) * 100
      : data.operatingExpenses > 0
        ? ((data.operatingExpenses - (data.depreciationAmortization || 0)) / revenue) * 100
        : 20; // Default

  // CapEx percent (estimate from PP&E if not directly available)
  // Rough estimate: CapEx ~= D&A for mature companies
  const capexPercent =
    data.depreciationAmortization > 0
      ? (data.depreciationAmortization / revenue) * 100
      : null;

  // Depreciation as % of PP&E
  const depreciationRate =
    data.propertyPlantEquipment > 0
      ? (data.depreciationAmortization / data.propertyPlantEquipment) * 100
      : 10; // Default 10-year straight line

  // Interest rate on debt
  const interestRate =
    data.totalDebt > 0
      ? (data.interestExpense / data.totalDebt) * 100
      : 5; // Default 5%

  return {
    grossMargin,
    operatingMargin,
    netMargin,
    effectiveTaxRate,
    revenueGrowthRate,
    daysReceivables,
    daysInventory,
    daysPayables,
    cogsPercent,
    sgaPercent,
    capexPercent,
    depreciationRate,
    interestRate,
  };
}

/**
 * Map extracted financials to Assumptions interface
 */
export function mapToAssumptions(
  data: ExtractedFinancials,
  metrics: DerivedMetrics
): Assumptions {
  const revenue = data.revenue || 1000000000; // Default $1B

  // Calculate net debt (total debt - cash)
  const netDebt = Math.max(
    0,
    (data.totalDebt || 0) - (data.cashAndEquivalents || 0)
  );

  // Estimate depreciation years from rate
  const depreciationYears =
    metrics.depreciationRate > 0
      ? Math.round(100 / metrics.depreciationRate)
      : 10;

  // Estimate yearly debt repayment (rough: pay off over 10 years)
  const yearlyRepayment =
    data.totalDebt > 0 ? Math.round(data.totalDebt / 10) : 0;

  // Helper for consistent rounding
  const round = (val: number, decimals: number = 2) => {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  };

  return {
    // Base data
    baseRevenue: Math.round(revenue), // Round to integer for millions
    projectionYears: 5,

    // Income Statement
    revenueGrowthRate: round(metrics.revenueGrowthRate ?? 8), // Default 8% if unknown
    cogsPercent: round(Math.min(95, Math.max(20, metrics.cogsPercent))), // Clamp to reasonable range
    sgaPercent: round(Math.min(50, Math.max(5, metrics.sgaPercent))),
    taxRate: round(Math.min(40, Math.max(10, metrics.effectiveTaxRate))),

    // Balance Sheet / Working Capital
    daysReceivables: Math.round(Math.min(120, Math.max(15, metrics.daysReceivables))),
    daysInventory: Math.round(Math.min(180, Math.max(0, metrics.daysInventory))),
    daysPayables: Math.round(Math.min(120, Math.max(10, metrics.daysPayables))),

    // CapEx & Depreciation
    capexPercent: round(metrics.capexPercent ?? 5),
    depreciationYears: Math.round(Math.min(30, Math.max(3, depreciationYears))),

    // Debt
    debtBalance: Math.round(data.totalDebt || 0),
    interestRate: round(Math.min(15, Math.max(1, metrics.interestRate))),
    yearlyRepayment: Math.round(yearlyRepayment),

    // Valuation
    wacc: 10, // Default - user should adjust
    terminalGrowthRate: 2.5, // Default long-term growth
    sharesOutstanding: Math.round(data.sharesOutstandingDiluted || data.sharesOutstandingBasic || 100000000),
    netDebt: Math.round(netDebt),
  };
}

/**
 * Validate mapped assumptions and return warnings
 */
export function validateAssumptions(
  assumptions: Assumptions,
  data: ExtractedFinancials
): ExtractionWarning[] {
  const warnings: ExtractionWarning[] = [];

  // Check for unusual values
  if (assumptions.cogsPercent > 85) {
    warnings.push({
      field: 'cogsPercent',
      message: `High COGS (${assumptions.cogsPercent.toFixed(1)}%) - verify gross margins`,
      severity: 'medium',
    });
  }

  if (assumptions.cogsPercent < 30) {
    warnings.push({
      field: 'cogsPercent',
      message: `Low COGS (${assumptions.cogsPercent.toFixed(1)}%) - typical for software/services`,
      severity: 'low',
    });
  }

  if (assumptions.taxRate < 15 || assumptions.taxRate > 35) {
    warnings.push({
      field: 'taxRate',
      message: `Unusual tax rate (${assumptions.taxRate.toFixed(1)}%) - may include one-time items`,
      severity: 'medium',
    });
  }

  if (assumptions.revenueGrowthRate > 50) {
    warnings.push({
      field: 'revenueGrowthRate',
      message: `High growth rate (${assumptions.revenueGrowthRate.toFixed(1)}%) - consider if sustainable`,
      severity: 'medium',
    });
  }

  if (assumptions.revenueGrowthRate < 0) {
    warnings.push({
      field: 'revenueGrowthRate',
      message: `Negative growth (${assumptions.revenueGrowthRate.toFixed(1)}%) - revenue declining`,
      severity: 'high',
    });
  }

  if (!data.depreciationAmortization || data.depreciationAmortization === 0) {
    warnings.push({
      field: 'depreciationAmortization',
      message: 'D&A not found - using estimate based on PP&E',
      severity: 'medium',
    });
  }

  if (!data.sharesOutstandingDiluted && !data.sharesOutstandingBasic) {
    warnings.push({
      field: 'sharesOutstanding',
      message: 'Shares outstanding not found - using default value',
      severity: 'high',
    });
  }

  if (assumptions.daysReceivables > 90) {
    warnings.push({
      field: 'daysReceivables',
      message: `High DSO (${assumptions.daysReceivables.toFixed(0)} days) - may indicate collection issues`,
      severity: 'low',
    });
  }

  if (assumptions.daysPayables > 90) {
    warnings.push({
      field: 'daysPayables',
      message: `High DPO (${assumptions.daysPayables.toFixed(0)} days) - stretching payables`,
      severity: 'low',
    });
  }

  return warnings;
}

/**
 * Get a summary of what was extracted vs defaults used
 */
export function getExtractionSummary(
  data: ExtractedFinancials
): { extracted: string[]; defaulted: string[] } {
  const extracted: string[] = [];
  const defaulted: string[] = [];

  // Check what was actually extracted
  if (data.revenue > 0) extracted.push('Revenue');
  else defaulted.push('Revenue');

  if (data.costOfRevenue > 0) extracted.push('COGS');
  else defaulted.push('COGS');

  if (data.operatingExpenses > 0 || data.sgaExpense) extracted.push('Operating Expenses');
  else defaulted.push('Operating Expenses');

  if (data.depreciationAmortization > 0) extracted.push('D&A');
  else defaulted.push('D&A');

  if (data.interestExpense > 0) extracted.push('Interest Expense');
  else defaulted.push('Interest Expense');

  if (data.incomeTaxExpense > 0) extracted.push('Tax Expense');
  else defaulted.push('Tax Rate');

  if (data.accountsReceivable > 0) extracted.push('Accounts Receivable');
  else defaulted.push('DSO');

  if (data.inventory > 0) extracted.push('Inventory');
  else defaulted.push('DIO');

  if (data.accountsPayable > 0) extracted.push('Accounts Payable');
  else defaulted.push('DPO');

  if (data.totalDebt > 0) extracted.push('Total Debt');
  else defaulted.push('Debt');

  if (data.sharesOutstandingDiluted || data.sharesOutstandingBasic)
    extracted.push('Shares Outstanding');
  else defaulted.push('Shares Outstanding');

  if (data.priorYearRevenue) extracted.push('Prior Year Revenue (Growth)');
  else defaulted.push('Growth Rate');

  return { extracted, defaulted };
}
