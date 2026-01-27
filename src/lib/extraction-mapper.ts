// Map Extracted Financial Data to Assumptions

import type { Assumptions } from './financial-logic';
import type {
  ExtractedFinancials,
  DerivedMetrics,
  ExtractionWarning,
  ExtractionConfidence,
  ExtractionSource,
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

  // CapEx percent - use extracted value if available, otherwise estimate from D&A
  // Note: CapEx is reported as a positive outflow in cash flow statements
  let capexPercent: number | null = null;

  if (data.capitalExpenditures && data.capitalExpenditures > 0) {
    // Use directly extracted CapEx (convert to absolute value if negative, as it's often reported as outflow)
    const capex = Math.abs(data.capitalExpenditures);
    capexPercent = (capex / revenue) * 100;
  } else if (data.depreciationAmortization > 0) {
    // Fallback: estimate CapEx ~= D&A for mature companies (not accurate for growing companies)
    capexPercent = (data.depreciationAmortization / revenue) * 100;
  }

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
 * Calibrate and validate confidence scores
 * LLMs often over-estimate their confidence, so we apply sanity checks
 */
export interface CalibrationResult {
  calibratedConfidence: ExtractionConfidence;
  adjustments: ConfidenceAdjustment[];
  overallScore: number;
}

export interface ConfidenceAdjustment {
  field: string;
  originalConfidence: number;
  calibratedConfidence: number;
  reason: string;
}

/**
 * Calibrate confidence scores based on data consistency and source
 */
export function calibrateConfidence(
  data: ExtractedFinancials,
  rawConfidence: ExtractionConfidence,
  source: ExtractionSource
): CalibrationResult {
  const adjustments: ConfidenceAdjustment[] = [];
  const calibrated = { ...rawConfidence };

  // Base calibration factor by source
  // XBRL data is highly reliable, AI is less so
  const sourceMultiplier = source === 'xbrl' ? 1.0 : source === 'hybrid' ? 0.9 : 0.8;

  // 1. Check balance sheet identity: Assets = Liabilities + Equity
  if (data.totalAssets > 0 && data.totalLiabilities > 0 && data.totalEquity !== undefined) {
    const balanceSheetSum = data.totalLiabilities + data.totalEquity;
    const percentDiff = Math.abs(data.totalAssets - balanceSheetSum) / data.totalAssets * 100;

    if (percentDiff > 5) {
      // Balance sheet doesn't balance - reduce confidence in balance sheet items
      const penalty = Math.min(0.3, percentDiff / 100);
      adjustments.push({
        field: 'balanceSheet',
        originalConfidence: rawConfidence.accountsReceivable || 0.8,
        calibratedConfidence: Math.max(0.3, (rawConfidence.accountsReceivable || 0.8) - penalty),
        reason: `Balance sheet off by ${percentDiff.toFixed(1)}%`,
      });
    }
  }

  // 2. Check gross profit identity: Gross Profit = Revenue - COGS
  if (data.revenue > 0 && data.costOfRevenue > 0 && data.grossProfit > 0) {
    const calculatedGrossProfit = data.revenue - data.costOfRevenue;
    const percentDiff = Math.abs(data.grossProfit - calculatedGrossProfit) / data.revenue * 100;

    if (percentDiff > 2) {
      const penalty = Math.min(0.2, percentDiff / 50);
      calibrated.revenue = Math.max(0.4, (calibrated.revenue || 0.8) - penalty);
      calibrated.costOfRevenue = Math.max(0.4, (calibrated.costOfRevenue || 0.8) - penalty);
      adjustments.push({
        field: 'grossProfit',
        originalConfidence: rawConfidence.revenue || 0.8,
        calibratedConfidence: calibrated.revenue,
        reason: `Gross profit doesn't match Revenue - COGS (${percentDiff.toFixed(1)}% diff)`,
      });
    }
  }

  // 3. Check operating income reasonableness
  if (data.operatingIncome > data.grossProfit && data.grossProfit > 0) {
    calibrated.operatingExpenses = Math.max(0.3, (calibrated.operatingExpenses || 0.8) - 0.3);
    adjustments.push({
      field: 'operatingIncome',
      originalConfidence: rawConfidence.operatingExpenses || 0.8,
      calibratedConfidence: calibrated.operatingExpenses,
      reason: 'Operating income exceeds gross profit (impossible)',
    });
  }

  // 4. Check debt consistency: Total debt should >= short-term + long-term
  if (data.totalDebt > 0 && (data.shortTermDebt || 0) + (data.longTermDebt || 0) > 0) {
    const sumDebt = (data.shortTermDebt || 0) + (data.longTermDebt || 0);
    const percentDiff = Math.abs(data.totalDebt - sumDebt) / data.totalDebt * 100;

    if (percentDiff > 10) {
      calibrated.totalDebt = Math.max(0.4, (calibrated.totalDebt || 0.8) - 0.2);
      adjustments.push({
        field: 'totalDebt',
        originalConfidence: rawConfidence.totalDebt || 0.8,
        calibratedConfidence: calibrated.totalDebt,
        reason: `Total debt doesn't match short + long term (${percentDiff.toFixed(1)}% diff)`,
      });
    }
  }

  // 5. Check for suspiciously round numbers (suggests estimation, not extraction)
  const suspiciouslyRoundFields: Array<{ field: keyof ExtractionConfidence; value: number }> = [
    { field: 'revenue', value: data.revenue },
    { field: 'costOfRevenue', value: data.costOfRevenue },
    { field: 'operatingExpenses', value: data.operatingExpenses },
  ];

  for (const { field, value } of suspiciouslyRoundFields) {
    if (value > 0 && isRoundNumber(value)) {
      const currentConf = calibrated[field] || 0.8;
      calibrated[field] = Math.max(0.5, currentConf - 0.1);
      adjustments.push({
        field,
        originalConfidence: rawConfidence[field] || 0.8,
        calibratedConfidence: calibrated[field] as number,
        reason: `Suspiciously round number (${formatCompactNumber(value)}) - may be estimated`,
      });
    }
  }

  // 6. Apply source multiplier to all confidence scores
  if (sourceMultiplier < 1.0) {
    for (const key of Object.keys(calibrated) as Array<keyof ExtractionConfidence>) {
      if (typeof calibrated[key] === 'number') {
        calibrated[key] = (calibrated[key] as number) * sourceMultiplier;
      }
    }
  }

  // 7. Calculate calibrated overall score
  const fieldScores = [
    calibrated.revenue,
    calibrated.costOfRevenue,
    calibrated.operatingExpenses,
    calibrated.totalDebt,
    calibrated.sharesOutstanding,
  ].filter((v): v is number => typeof v === 'number');

  const avgFieldScore = fieldScores.length > 0
    ? fieldScores.reduce((a, b) => a + b, 0) / fieldScores.length
    : 0.5;

  // Penalty for many adjustments
  const adjustmentPenalty = Math.min(0.2, adjustments.length * 0.05);

  calibrated.overall = Math.max(0.1, avgFieldScore - adjustmentPenalty);

  return {
    calibratedConfidence: calibrated,
    adjustments,
    overallScore: calibrated.overall,
  };
}

/**
 * Check if a number is suspiciously round (multiple of 1M, 100K, etc.)
 */
function isRoundNumber(value: number): boolean {
  if (value === 0) return false;

  // Check if divisible by 1 billion with no remainder
  if (value >= 1_000_000_000 && value % 1_000_000_000 === 0) return true;

  // Check if divisible by 100 million with no remainder
  if (value >= 100_000_000 && value % 100_000_000 === 0) return true;

  // Check if divisible by 10 million with no remainder
  if (value >= 10_000_000 && value % 10_000_000 === 0) return true;

  return false;
}

/**
 * Scale validation thresholds
 * These help detect when values weren't properly converted from thousands/millions
 */
const SCALE_THRESHOLDS = {
  // Minimum revenue for a public company (values below suggest not multiplied correctly)
  MIN_REVENUE_DOLLARS: 1_000_000, // $1M - very small public company
  // Maximum reasonable revenue (values above suggest multiplied too many times)
  MAX_REVENUE_DOLLARS: 1_000_000_000_000, // $1T - larger than any company
  // Minimum shares outstanding for a public company
  MIN_SHARES_OUTSTANDING: 1_000_000, // 1 million shares
  // Maximum reasonable working capital days
  MAX_WORKING_CAPITAL_DAYS: 365, // Over 1 year is suspicious
  // Minimum margin sanity check (net income can't exceed revenue)
  MIN_NET_MARGIN: -200, // -200% (losing 2x revenue is extreme but possible for startups)
  MAX_NET_MARGIN: 100, // Can't make more than revenue
};

export interface ScaleValidationResult {
  hasScaleErrors: boolean;
  errors: ScaleError[];
  suggestedCorrections: SuggestedCorrection[];
}

export interface ScaleError {
  field: string;
  message: string;
  currentValue: number;
  likelyScale: 'thousands' | 'millions' | 'billions' | 'over-scaled';
  severity: 'critical' | 'high' | 'medium';
}

export interface SuggestedCorrection {
  field: string;
  currentValue: number;
  suggestedValue: number;
  multiplier: number;
  reason: string;
}

/**
 * Detect scale errors in extracted financials
 * Returns warnings when values appear to be in wrong scale (thousands vs dollars)
 */
export function detectScaleErrors(data: ExtractedFinancials): ScaleValidationResult {
  const errors: ScaleError[] = [];
  const suggestedCorrections: SuggestedCorrection[] = [];

  const revenue = data.revenue || 0;
  const totalAssets = data.totalAssets || 0;
  const netIncome = data.netIncome || 0;
  const shares = data.sharesOutstandingBasic || data.sharesOutstandingDiluted || 0;

  // Check 1: Revenue too low (likely still in thousands)
  if (revenue > 0 && revenue < SCALE_THRESHOLDS.MIN_REVENUE_DOLLARS) {
    // Check if multiplying by 1000 gives a reasonable value
    const scaledRevenue = revenue * 1000;
    if (scaledRevenue >= SCALE_THRESHOLDS.MIN_REVENUE_DOLLARS &&
        scaledRevenue < SCALE_THRESHOLDS.MAX_REVENUE_DOLLARS) {
      errors.push({
        field: 'revenue',
        message: `Revenue of ${formatCompactNumber(revenue)} is extremely low for a public company. Values may still be in thousands.`,
        currentValue: revenue,
        likelyScale: 'thousands',
        severity: 'critical',
      });
      suggestedCorrections.push({
        field: 'revenue',
        currentValue: revenue,
        suggestedValue: scaledRevenue,
        multiplier: 1000,
        reason: 'Revenue appears to be in thousands, not dollars',
      });
    }
  }

  // Check 2: Revenue too high (likely over-multiplied)
  if (revenue > SCALE_THRESHOLDS.MAX_REVENUE_DOLLARS) {
    errors.push({
      field: 'revenue',
      message: `Revenue of ${formatCompactNumber(revenue)} exceeds $1 trillion. Values may have been over-multiplied.`,
      currentValue: revenue,
      likelyScale: 'over-scaled',
      severity: 'critical',
    });
    suggestedCorrections.push({
      field: 'revenue',
      currentValue: revenue,
      suggestedValue: revenue / 1000,
      multiplier: 0.001,
      reason: 'Revenue appears to have been multiplied too many times',
    });
  }

  // Check 3: Net income larger than revenue (mathematically impossible for positive income)
  if (netIncome > 0 && revenue > 0 && netIncome > revenue) {
    errors.push({
      field: 'netIncome',
      message: `Net income (${formatCompactNumber(netIncome)}) exceeds revenue (${formatCompactNumber(revenue)}). Values may be at different scales.`,
      currentValue: netIncome,
      likelyScale: 'over-scaled',
      severity: 'critical',
    });
  }

  // Check 4: Total debt exceeds total assets (usually impossible)
  if (data.totalDebt > 0 && totalAssets > 0 && data.totalDebt > totalAssets * 2) {
    errors.push({
      field: 'totalDebt',
      message: `Total debt (${formatCompactNumber(data.totalDebt)}) is more than twice total assets (${formatCompactNumber(totalAssets)}). Values may be at different scales.`,
      currentValue: data.totalDebt,
      likelyScale: 'over-scaled',
      severity: 'high',
    });
  }

  // Check 5: Shares outstanding too low
  if (shares > 0 && shares < SCALE_THRESHOLDS.MIN_SHARES_OUTSTANDING) {
    errors.push({
      field: 'sharesOutstanding',
      message: `Shares outstanding of ${formatCompactNumber(shares)} is unusually low for a public company. May still be in millions.`,
      currentValue: shares,
      likelyScale: 'millions',
      severity: 'high',
    });
    suggestedCorrections.push({
      field: 'sharesOutstanding',
      currentValue: shares,
      suggestedValue: shares * 1_000_000,
      multiplier: 1_000_000,
      reason: 'Shares appear to be in millions, not individual shares',
    });
  }

  // Check 6: Working capital days are extreme (suggests scale mismatch between AR/AP and revenue)
  if (data.accountsReceivable > 0 && revenue > 0) {
    const daysReceivables = (data.accountsReceivable / revenue) * 365;
    if (daysReceivables > SCALE_THRESHOLDS.MAX_WORKING_CAPITAL_DAYS) {
      errors.push({
        field: 'accountsReceivable',
        message: `Calculated DSO of ${Math.round(daysReceivables)} days is unrealistic. A/R and Revenue may be at different scales.`,
        currentValue: data.accountsReceivable,
        likelyScale: data.accountsReceivable > revenue ? 'over-scaled' : 'thousands',
        severity: 'medium',
      });
    }
  }

  // Check 7: Assets vs Liabilities + Equity should roughly balance
  if (totalAssets > 0 && data.totalLiabilities > 0 && data.totalEquity !== undefined) {
    const balanceSheetSum = data.totalLiabilities + data.totalEquity;
    const difference = Math.abs(totalAssets - balanceSheetSum);
    const percentDiff = (difference / totalAssets) * 100;

    if (percentDiff > 50) {
      errors.push({
        field: 'balanceSheet',
        message: `Balance sheet doesn't balance: Assets (${formatCompactNumber(totalAssets)}) vs L+E (${formatCompactNumber(balanceSheetSum)}). Values may be at different scales.`,
        currentValue: totalAssets,
        likelyScale: 'thousands',
        severity: 'high',
      });
    }
  }

  return {
    hasScaleErrors: errors.length > 0,
    errors,
    suggestedCorrections,
  };
}

/**
 * Format number in compact form for display
 */
function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(1)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

/**
 * Validate mapped assumptions and return warnings
 */
export function validateAssumptions(
  assumptions: Assumptions,
  data: ExtractedFinancials
): ExtractionWarning[] {
  const warnings: ExtractionWarning[] = [];

  // First, run scale validation
  const scaleValidation = detectScaleErrors(data);

  // Add scale errors as high-severity warnings
  for (const error of scaleValidation.errors) {
    warnings.push({
      field: error.field,
      message: error.message,
      severity: error.severity === 'critical' ? 'high' : error.severity,
    });
  }

  // Add suggested corrections as warnings
  for (const correction of scaleValidation.suggestedCorrections) {
    warnings.push({
      field: correction.field,
      message: `Consider: ${correction.reason}. Suggested value: ${formatCompactNumber(correction.suggestedValue)}`,
      severity: 'medium',
    });
  }

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

  // Check for unusual items that may distort earnings
  if (data.unusualItems && data.unusualItems.length > 0) {
    const totalUnusualImpact = data.unusualItems.reduce((sum, item) => {
      return sum + (item.impact === 'negative' ? -item.amount : item.amount);
    }, 0);

    const impactAsPercentOfRevenue = data.revenue > 0
      ? Math.abs(totalUnusualImpact / data.revenue * 100)
      : 0;

    const impactAsPercentOfNetIncome = data.netIncome !== 0
      ? Math.abs(totalUnusualImpact / data.netIncome * 100)
      : 0;

    // Summarize unusual items
    const itemSummary = data.unusualItems.map(i =>
      `${i.description} (${i.impact === 'negative' ? '-' : '+'}${formatCompactNumber(i.amount)})`
    ).join(', ');

    // Flag if unusual items are material (>5% of revenue or >20% of net income)
    if (impactAsPercentOfRevenue > 5 || impactAsPercentOfNetIncome > 20) {
      warnings.push({
        field: 'unusualItems',
        message: `Material one-time items detected: ${itemSummary}. Net impact: ${formatCompactNumber(totalUnusualImpact)} (${impactAsPercentOfRevenue.toFixed(1)}% of revenue)`,
        severity: 'high',
      });
    } else if (data.unusualItems.length > 0) {
      warnings.push({
        field: 'unusualItems',
        message: `One-time items detected: ${itemSummary}. Consider if these affect normalized earnings.`,
        severity: 'medium',
      });
    }

    // Flag specific high-impact categories
    const restructuringItems = data.unusualItems.filter(i => i.category === 'restructuring');
    const impairmentItems = data.unusualItems.filter(i => i.category === 'impairment');

    if (restructuringItems.length > 0) {
      const total = restructuringItems.reduce((sum, i) => sum + i.amount, 0);
      warnings.push({
        field: 'restructuring',
        message: `Restructuring charges of ${formatCompactNumber(total)} detected - may indicate cost-cutting or strategic changes`,
        severity: 'medium',
      });
    }

    if (impairmentItems.length > 0) {
      const total = impairmentItems.reduce((sum, i) => sum + i.amount, 0);
      warnings.push({
        field: 'impairment',
        message: `Impairment charges of ${formatCompactNumber(total)} detected - assets may be overvalued on balance sheet`,
        severity: 'high',
      });
    }
  }

  // Detect if tax rate suggests one-time tax events (not already flagged)
  if (assumptions.taxRate < 5 && !data.unusualItems?.some(i => i.category === 'tax_benefit')) {
    warnings.push({
      field: 'taxRate',
      message: `Very low effective tax rate (${assumptions.taxRate.toFixed(1)}%) - may include one-time tax benefits not captured`,
      severity: 'medium',
    });
  }

  // Detect fiscal year mismatch (non-calendar year-end)
  const fiscalYearInfo = detectFiscalYearMismatch(data);
  if (fiscalYearInfo.isNonCalendarYear) {
    warnings.push({
      field: 'fiscalYear',
      message: fiscalYearInfo.message,
      severity: 'low', // Informational, not a problem
    });
  }

  // Warn if fiscal year is significantly in the past
  const currentYear = new Date().getFullYear();
  const yearsDifference = currentYear - data.fiscalYear;
  if (yearsDifference > 1) {
    warnings.push({
      field: 'fiscalYear',
      message: `Data is from FY${data.fiscalYear} (${yearsDifference} years old). Consider using more recent filings.`,
      severity: yearsDifference > 2 ? 'medium' : 'low',
    });
  }

  return warnings;
}

/**
 * Fiscal year mismatch detection result
 */
export interface FiscalYearInfo {
  fiscalYear: number;
  fiscalPeriod: string;
  isNonCalendarYear: boolean;
  estimatedYearEnd: string | null; // e.g., "September", "June"
  message: string;
}

/**
 * Common fiscal year end months by industry/company pattern
 */
const KNOWN_FISCAL_YEAR_PATTERNS: Record<string, string> = {
  // Tech companies often end in September
  'AAPL': 'September',
  'MSFT': 'June',
  'DELL': 'January',
  // Retail often ends in January (after holiday season)
  'WMT': 'January',
  'TGT': 'January',
  'COST': 'August',
  'HD': 'January',
  // Default calendar year companies have December
};

/**
 * Detect if the company uses a non-calendar fiscal year
 */
export function detectFiscalYearMismatch(data: ExtractedFinancials): FiscalYearInfo {
  const fiscalYear = data.fiscalYear;
  const fiscalPeriod = data.fiscalPeriod || '';
  const ticker = data.ticker;

  let isNonCalendarYear = false;
  let estimatedYearEnd: string | null = null;
  let message = '';

  // Check if we know this company's fiscal year pattern
  if (ticker && KNOWN_FISCAL_YEAR_PATTERNS[ticker]) {
    estimatedYearEnd = KNOWN_FISCAL_YEAR_PATTERNS[ticker];
    if (estimatedYearEnd !== 'December') {
      isNonCalendarYear = true;
    }
  }

  // Try to parse fiscal period string for clues
  // Common patterns: "FY2024", "Fiscal Year Ended September 2024", "Q4 2024"
  const periodLower = fiscalPeriod.toLowerCase();

  // Look for month names
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  for (const month of months) {
    if (periodLower.includes(month)) {
      const monthCapitalized = month.charAt(0).toUpperCase() + month.slice(1);
      if (month !== 'december') {
        isNonCalendarYear = true;
        estimatedYearEnd = monthCapitalized;
      } else {
        estimatedYearEnd = 'December';
      }
      break;
    }
  }

  // Check for patterns like "ended Sep" or "ending Sept"
  const shortMonthPatterns = [
    { pattern: /(?:end(?:ed|ing)?\s+)?(?:sep(?:t)?(?:ember)?)/i, month: 'September' },
    { pattern: /(?:end(?:ed|ing)?\s+)?(?:jun(?:e)?)/i, month: 'June' },
    { pattern: /(?:end(?:ed|ing)?\s+)?(?:jan(?:uary)?)/i, month: 'January' },
    { pattern: /(?:end(?:ed|ing)?\s+)?(?:mar(?:ch)?)/i, month: 'March' },
    { pattern: /(?:end(?:ed|ing)?\s+)?(?:aug(?:ust)?)/i, month: 'August' },
  ];

  for (const { pattern, month } of shortMonthPatterns) {
    if (!estimatedYearEnd && pattern.test(fiscalPeriod)) {
      estimatedYearEnd = month;
      if (month !== 'December') {
        isNonCalendarYear = true;
      }
      break;
    }
  }

  // Build the message
  if (isNonCalendarYear && estimatedYearEnd) {
    message = `Non-calendar fiscal year detected. FY${fiscalYear} ends in ${estimatedYearEnd}. When comparing to calendar-year companies, data may be offset by several months.`;
  } else if (estimatedYearEnd) {
    message = `Fiscal year ends in ${estimatedYearEnd} (calendar year).`;
  } else {
    message = `Fiscal year ${fiscalYear} detected. Unable to determine exact year-end month.`;
  }

  return {
    fiscalYear,
    fiscalPeriod,
    isNonCalendarYear,
    estimatedYearEnd,
    message,
  };
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
