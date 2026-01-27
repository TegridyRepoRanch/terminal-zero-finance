// Risk Metrics Calculator
// Calculates key financial risk indicators for investment analysis

import type { ExtractedFinancials } from './extraction-types';
import type { Assumptions, IncomeStatementRow, BalanceSheetRow } from './financial-logic';

/**
 * Risk metrics result
 */
export interface RiskMetrics {
  // Liquidity Ratios
  currentRatio: number | null;
  quickRatio: number | null;
  cashRatio: number | null;

  // Leverage Ratios
  debtToEquity: number | null;
  debtToAssets: number | null;
  debtToEBITDA: number | null;
  netDebtToEBITDA: number | null;

  // Coverage Ratios
  interestCoverage: number | null;
  debtServiceCoverage: number | null;

  // Working Capital
  workingCapital: number | null;
  workingCapitalRatio: number | null;

  // Summary
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number; // 0-100, higher = more risky
  warnings: RiskWarning[];
}

export interface RiskWarning {
  metric: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  value: number;
  threshold: number;
}

/**
 * Risk thresholds for evaluation
 */
const RISK_THRESHOLDS = {
  // Liquidity - below these is concerning
  currentRatio: { healthy: 1.5, warning: 1.0, critical: 0.5 },
  quickRatio: { healthy: 1.0, warning: 0.5, critical: 0.25 },

  // Leverage - above these is concerning
  debtToEquity: { healthy: 1.0, warning: 2.0, critical: 4.0 },
  debtToEBITDA: { healthy: 2.0, warning: 4.0, critical: 6.0 },
  netDebtToEBITDA: { healthy: 1.5, warning: 3.0, critical: 5.0 },

  // Coverage - below these is concerning
  interestCoverage: { healthy: 5.0, warning: 2.0, critical: 1.0 },
};

/**
 * Calculate risk metrics from extracted financials
 */
export function calculateRiskMetrics(data: ExtractedFinancials): RiskMetrics {
  const warnings: RiskWarning[] = [];

  // Calculate EBITDA (approximate if not directly available)
  const ebitda = (data.operatingIncome || 0) + (data.depreciationAmortization || 0);

  // === LIQUIDITY RATIOS ===

  // Current Ratio = Current Assets / Current Liabilities
  const currentRatio = data.totalCurrentAssets && data.totalCurrentLiabilities
    ? data.totalCurrentAssets / data.totalCurrentLiabilities
    : null;

  // Quick Ratio = (Current Assets - Inventory) / Current Liabilities
  const quickRatio = data.totalCurrentAssets && data.totalCurrentLiabilities && data.inventory !== undefined
    ? (data.totalCurrentAssets - data.inventory) / data.totalCurrentLiabilities
    : null;

  // Cash Ratio = Cash / Current Liabilities
  const cashRatio = data.cashAndEquivalents && data.totalCurrentLiabilities
    ? data.cashAndEquivalents / data.totalCurrentLiabilities
    : null;

  // === LEVERAGE RATIOS ===

  // Debt to Equity
  const debtToEquity = data.totalDebt && data.totalEquity && data.totalEquity > 0
    ? data.totalDebt / data.totalEquity
    : null;

  // Debt to Assets
  const debtToAssets = data.totalDebt && data.totalAssets && data.totalAssets > 0
    ? data.totalDebt / data.totalAssets
    : null;

  // Debt to EBITDA
  const debtToEBITDA = data.totalDebt && ebitda > 0
    ? data.totalDebt / ebitda
    : null;

  // Net Debt to EBITDA
  const netDebt = (data.totalDebt || 0) - (data.cashAndEquivalents || 0);
  const netDebtToEBITDA = ebitda > 0 ? netDebt / ebitda : null;

  // === COVERAGE RATIOS ===

  // Interest Coverage = EBIT / Interest Expense
  const interestCoverage = data.interestExpense && data.interestExpense > 0 && data.operatingIncome
    ? data.operatingIncome / data.interestExpense
    : null;

  // Debt Service Coverage (simplified) = EBITDA / (Interest + Principal)
  // Note: We don't have principal repayment data, so using interest only
  const debtServiceCoverage = data.interestExpense && data.interestExpense > 0 && ebitda > 0
    ? ebitda / data.interestExpense
    : null;

  // === WORKING CAPITAL ===

  const workingCapital = data.totalCurrentAssets && data.totalCurrentLiabilities
    ? data.totalCurrentAssets - data.totalCurrentLiabilities
    : null;

  const workingCapitalRatio = workingCapital !== null && data.revenue > 0
    ? (workingCapital / data.revenue) * 100
    : null;

  // === EVALUATE RISK LEVEL ===

  // Generate warnings
  if (currentRatio !== null) {
    if (currentRatio < RISK_THRESHOLDS.currentRatio.critical) {
      warnings.push({
        metric: 'currentRatio',
        message: `Current ratio of ${currentRatio.toFixed(2)}x is critically low - severe liquidity risk`,
        severity: 'high',
        value: currentRatio,
        threshold: RISK_THRESHOLDS.currentRatio.critical,
      });
    } else if (currentRatio < RISK_THRESHOLDS.currentRatio.warning) {
      warnings.push({
        metric: 'currentRatio',
        message: `Current ratio of ${currentRatio.toFixed(2)}x is below 1.0 - potential liquidity issues`,
        severity: 'medium',
        value: currentRatio,
        threshold: RISK_THRESHOLDS.currentRatio.warning,
      });
    }
  }

  if (interestCoverage !== null) {
    if (interestCoverage < RISK_THRESHOLDS.interestCoverage.critical) {
      warnings.push({
        metric: 'interestCoverage',
        message: `Interest coverage of ${interestCoverage.toFixed(1)}x is critical - may struggle to pay interest`,
        severity: 'high',
        value: interestCoverage,
        threshold: RISK_THRESHOLDS.interestCoverage.critical,
      });
    } else if (interestCoverage < RISK_THRESHOLDS.interestCoverage.warning) {
      warnings.push({
        metric: 'interestCoverage',
        message: `Interest coverage of ${interestCoverage.toFixed(1)}x is low - limited financial flexibility`,
        severity: 'medium',
        value: interestCoverage,
        threshold: RISK_THRESHOLDS.interestCoverage.warning,
      });
    }
  }

  if (debtToEBITDA !== null) {
    if (debtToEBITDA > RISK_THRESHOLDS.debtToEBITDA.critical) {
      warnings.push({
        metric: 'debtToEBITDA',
        message: `Debt/EBITDA of ${debtToEBITDA.toFixed(1)}x is very high - heavily leveraged`,
        severity: 'high',
        value: debtToEBITDA,
        threshold: RISK_THRESHOLDS.debtToEBITDA.critical,
      });
    } else if (debtToEBITDA > RISK_THRESHOLDS.debtToEBITDA.warning) {
      warnings.push({
        metric: 'debtToEBITDA',
        message: `Debt/EBITDA of ${debtToEBITDA.toFixed(1)}x indicates elevated leverage`,
        severity: 'medium',
        value: debtToEBITDA,
        threshold: RISK_THRESHOLDS.debtToEBITDA.warning,
      });
    }
  }

  if (debtToEquity !== null) {
    if (debtToEquity > RISK_THRESHOLDS.debtToEquity.critical) {
      warnings.push({
        metric: 'debtToEquity',
        message: `Debt/Equity of ${debtToEquity.toFixed(1)}x is very high - equity cushion is thin`,
        severity: 'high',
        value: debtToEquity,
        threshold: RISK_THRESHOLDS.debtToEquity.critical,
      });
    } else if (debtToEquity > RISK_THRESHOLDS.debtToEquity.warning) {
      warnings.push({
        metric: 'debtToEquity',
        message: `Debt/Equity of ${debtToEquity.toFixed(1)}x is elevated`,
        severity: 'medium',
        value: debtToEquity,
        threshold: RISK_THRESHOLDS.debtToEquity.warning,
      });
    }
  }

  // Calculate overall risk score
  const riskScore = calculateRiskScore({
    currentRatio,
    interestCoverage,
    debtToEBITDA,
    debtToEquity,
    netDebtToEBITDA,
  });

  // Determine risk level
  let riskLevel: RiskMetrics['riskLevel'] = 'low';
  if (riskScore >= 75) {
    riskLevel = 'critical';
  } else if (riskScore >= 50) {
    riskLevel = 'high';
  } else if (riskScore >= 25) {
    riskLevel = 'moderate';
  }

  return {
    currentRatio,
    quickRatio,
    cashRatio,
    debtToEquity,
    debtToAssets,
    debtToEBITDA,
    netDebtToEBITDA,
    interestCoverage,
    debtServiceCoverage,
    workingCapital,
    workingCapitalRatio,
    riskLevel,
    riskScore,
    warnings,
  };
}

/**
 * Calculate overall risk score (0-100)
 */
function calculateRiskScore(metrics: {
  currentRatio: number | null;
  interestCoverage: number | null;
  debtToEBITDA: number | null;
  debtToEquity: number | null;
  netDebtToEBITDA: number | null;
}): number {
  let totalScore = 0;
  let totalWeight = 0;

  // Current Ratio (weight: 20) - lower is riskier
  if (metrics.currentRatio !== null) {
    const t = RISK_THRESHOLDS.currentRatio;
    if (metrics.currentRatio < t.critical) {
      totalScore += 20;
    } else if (metrics.currentRatio < t.warning) {
      totalScore += 15;
    } else if (metrics.currentRatio < t.healthy) {
      totalScore += 8;
    }
    totalWeight += 20;
  }

  // Interest Coverage (weight: 25) - lower is riskier
  if (metrics.interestCoverage !== null) {
    const t = RISK_THRESHOLDS.interestCoverage;
    if (metrics.interestCoverage < t.critical) {
      totalScore += 25;
    } else if (metrics.interestCoverage < t.warning) {
      totalScore += 18;
    } else if (metrics.interestCoverage < t.healthy) {
      totalScore += 8;
    }
    totalWeight += 25;
  }

  // Debt/EBITDA (weight: 25) - higher is riskier
  if (metrics.debtToEBITDA !== null) {
    const t = RISK_THRESHOLDS.debtToEBITDA;
    if (metrics.debtToEBITDA > t.critical) {
      totalScore += 25;
    } else if (metrics.debtToEBITDA > t.warning) {
      totalScore += 18;
    } else if (metrics.debtToEBITDA > t.healthy) {
      totalScore += 8;
    }
    totalWeight += 25;
  }

  // Debt/Equity (weight: 15) - higher is riskier
  if (metrics.debtToEquity !== null) {
    const t = RISK_THRESHOLDS.debtToEquity;
    if (metrics.debtToEquity > t.critical) {
      totalScore += 15;
    } else if (metrics.debtToEquity > t.warning) {
      totalScore += 10;
    } else if (metrics.debtToEquity > t.healthy) {
      totalScore += 5;
    }
    totalWeight += 15;
  }

  // Net Debt/EBITDA (weight: 15) - higher is riskier
  if (metrics.netDebtToEBITDA !== null) {
    const t = RISK_THRESHOLDS.netDebtToEBITDA;
    if (metrics.netDebtToEBITDA > t.critical) {
      totalScore += 15;
    } else if (metrics.netDebtToEBITDA > t.warning) {
      totalScore += 10;
    } else if (metrics.netDebtToEBITDA > t.healthy) {
      totalScore += 5;
    }
    totalWeight += 15;
  }

  // Normalize to 0-100
  return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 50;
}

/**
 * Calculate risk metrics from assumptions and projections
 */
export function calculateRiskMetricsFromAssumptions(
  _assumptions: Assumptions,
  incomeStatement: IncomeStatementRow[],
  balanceSheet: BalanceSheetRow[]
): RiskMetrics {
  // Use Year 1 projections for current ratios
  const is = incomeStatement[0];
  const bs = balanceSheet[0];

  if (!is || !bs) {
    return {
      currentRatio: null,
      quickRatio: null,
      cashRatio: null,
      debtToEquity: null,
      debtToAssets: null,
      debtToEBITDA: null,
      netDebtToEBITDA: null,
      interestCoverage: null,
      debtServiceCoverage: null,
      workingCapital: null,
      workingCapitalRatio: null,
      riskLevel: 'moderate',
      riskScore: 50,
      warnings: [],
    };
  }

  const warnings: RiskWarning[] = [];

  // Calculate EBITDA
  const ebitda = is.ebit + is.depreciation;

  // Liquidity (simplified - using AR + Inventory vs AP)
  const currentAssets = bs.accountsReceivable + bs.inventory + bs.cashPlug;
  const currentLiabilities = bs.accountsPayable;
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : null;
  const quickRatio = currentLiabilities > 0 ? (currentAssets - bs.inventory) / currentLiabilities : null;
  const cashRatio = currentLiabilities > 0 ? bs.cashPlug / currentLiabilities : null;

  // Leverage
  const debtToEquity = bs.totalEquity > 0 ? bs.debtBalance / bs.totalEquity : null;
  const debtToAssets = bs.totalAssets > 0 ? bs.debtBalance / bs.totalAssets : null;
  const debtToEBITDA = ebitda > 0 ? bs.debtBalance / ebitda : null;
  const netDebt = bs.debtBalance - bs.cashPlug;
  const netDebtToEBITDA = ebitda > 0 ? netDebt / ebitda : null;

  // Coverage
  const interestCoverage = is.interestExpense > 0 ? is.ebit / is.interestExpense : null;
  const debtServiceCoverage = is.interestExpense > 0 ? ebitda / is.interestExpense : null;

  // Working capital
  const workingCapital = currentAssets - currentLiabilities;
  const workingCapitalRatio = is.revenue > 0 ? (workingCapital / is.revenue) * 100 : null;

  // Generate warnings (same logic as above)
  if (interestCoverage !== null && interestCoverage < RISK_THRESHOLDS.interestCoverage.warning) {
    warnings.push({
      metric: 'interestCoverage',
      message: `Projected interest coverage of ${interestCoverage.toFixed(1)}x is concerning`,
      severity: interestCoverage < RISK_THRESHOLDS.interestCoverage.critical ? 'high' : 'medium',
      value: interestCoverage,
      threshold: RISK_THRESHOLDS.interestCoverage.warning,
    });
  }

  if (debtToEBITDA !== null && debtToEBITDA > RISK_THRESHOLDS.debtToEBITDA.warning) {
    warnings.push({
      metric: 'debtToEBITDA',
      message: `Projected Debt/EBITDA of ${debtToEBITDA.toFixed(1)}x indicates high leverage`,
      severity: debtToEBITDA > RISK_THRESHOLDS.debtToEBITDA.critical ? 'high' : 'medium',
      value: debtToEBITDA,
      threshold: RISK_THRESHOLDS.debtToEBITDA.warning,
    });
  }

  const riskScore = calculateRiskScore({
    currentRatio,
    interestCoverage,
    debtToEBITDA,
    debtToEquity,
    netDebtToEBITDA,
  });

  let riskLevel: RiskMetrics['riskLevel'] = 'low';
  if (riskScore >= 75) {
    riskLevel = 'critical';
  } else if (riskScore >= 50) {
    riskLevel = 'high';
  } else if (riskScore >= 25) {
    riskLevel = 'moderate';
  }

  return {
    currentRatio,
    quickRatio,
    cashRatio,
    debtToEquity,
    debtToAssets,
    debtToEBITDA,
    netDebtToEBITDA,
    interestCoverage,
    debtServiceCoverage,
    workingCapital,
    workingCapitalRatio,
    riskLevel,
    riskScore,
    warnings,
  };
}

/**
 * Format risk metric for display
 */
export function formatRiskMetric(value: number | null, suffix: string = 'x'): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(2)}${suffix}`;
}

/**
 * Get color class for risk metric
 */
export function getRiskMetricColor(
  value: number | null,
  metric: keyof typeof RISK_THRESHOLDS,
  inverted: boolean = false
): string {
  if (value === null) return 'text-zinc-500';

  const threshold = RISK_THRESHOLDS[metric];
  if (!threshold) return 'text-zinc-300';

  if (inverted) {
    // Higher is worse (debt ratios)
    if (value > threshold.critical) return 'text-red-500';
    if (value > threshold.warning) return 'text-amber-500';
    if (value > threshold.healthy) return 'text-yellow-500';
    return 'text-emerald-500';
  } else {
    // Lower is worse (coverage ratios)
    if (value < threshold.critical) return 'text-red-500';
    if (value < threshold.warning) return 'text-amber-500';
    if (value < threshold.healthy) return 'text-yellow-500';
    return 'text-emerald-500';
  }
}
