// Earnings Quality Score
// Measures the quality and sustainability of reported earnings

import type { ExtractedFinancials, HistoricalDataPoint } from './extraction-types';

/**
 * Earnings quality analysis result
 */
export interface EarningsQualityResult {
  // Core Quality Metrics
  accrualRatio: number | null; // (Net Income - OCF) / Total Assets
  cashConversion: number | null; // OCF / Net Income
  revenueQuality: number | null; // Based on DSO trends, deferred revenue
  earningsVolatility: number | null; // Std dev of earnings growth

  // Quality Scores (0-100, higher is better quality)
  overallScore: number;
  cashFlowScore: number;
  accrualScore: number;
  consistencyScore: number;

  // Quality Level
  qualityLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'concerning';

  // Red Flags
  redFlags: EarningsRedFlag[];

  // Summary
  summary: string;
}

export interface EarningsRedFlag {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  metric?: string;
  value?: number;
}

/**
 * Quality thresholds
 */
const QUALITY_THRESHOLDS = {
  // Accrual Ratio - closer to 0 is better, >10% is concerning
  accrualRatio: { excellent: 0.03, good: 0.05, fair: 0.08, poor: 0.12 },

  // Cash Conversion - >100% is great, <70% is concerning
  cashConversion: { excellent: 1.2, good: 1.0, fair: 0.8, poor: 0.6 },

  // Earnings Volatility - lower is better
  earningsVolatility: { excellent: 0.1, good: 0.2, fair: 0.35, poor: 0.5 },
};

/**
 * Calculate earnings quality from extracted financials
 * Note: Requires Operating Cash Flow which may need to be extracted separately
 */
export function calculateEarningsQuality(
  data: ExtractedFinancials,
  operatingCashFlow?: number
): EarningsQualityResult {
  const redFlags: EarningsRedFlag[] = [];

  // === ACCRUAL RATIO ===
  // Accruals = Net Income - Operating Cash Flow
  // Accrual Ratio = Accruals / Average Total Assets
  // High positive accruals suggest aggressive accounting

  let accrualRatio: number | null = null;
  let accrualScore = 50; // Default

  if (operatingCashFlow !== undefined && data.totalAssets > 0) {
    const accruals = data.netIncome - operatingCashFlow;
    accrualRatio = accruals / data.totalAssets;

    // Score accrual quality (lower absolute value is better)
    const absAccrual = Math.abs(accrualRatio);
    if (absAccrual <= QUALITY_THRESHOLDS.accrualRatio.excellent) {
      accrualScore = 95;
    } else if (absAccrual <= QUALITY_THRESHOLDS.accrualRatio.good) {
      accrualScore = 80;
    } else if (absAccrual <= QUALITY_THRESHOLDS.accrualRatio.fair) {
      accrualScore = 60;
    } else if (absAccrual <= QUALITY_THRESHOLDS.accrualRatio.poor) {
      accrualScore = 40;
    } else {
      accrualScore = 20;
      redFlags.push({
        type: 'high_accruals',
        message: `High accrual ratio of ${(accrualRatio * 100).toFixed(1)}% suggests earnings quality concerns`,
        severity: 'high',
        metric: 'accrualRatio',
        value: accrualRatio,
      });
    }
  }

  // === CASH CONVERSION ===
  // Cash Conversion = Operating Cash Flow / Net Income
  // Should ideally be >= 100%

  let cashConversion: number | null = null;
  let cashFlowScore = 50;

  if (operatingCashFlow !== undefined && data.netIncome !== 0) {
    cashConversion = operatingCashFlow / data.netIncome;

    if (data.netIncome > 0) {
      // Positive net income case
      if (cashConversion >= QUALITY_THRESHOLDS.cashConversion.excellent) {
        cashFlowScore = 95;
      } else if (cashConversion >= QUALITY_THRESHOLDS.cashConversion.good) {
        cashFlowScore = 80;
      } else if (cashConversion >= QUALITY_THRESHOLDS.cashConversion.fair) {
        cashFlowScore = 60;
      } else if (cashConversion >= QUALITY_THRESHOLDS.cashConversion.poor) {
        cashFlowScore = 40;
        redFlags.push({
          type: 'weak_cash_conversion',
          message: `Cash conversion of ${(cashConversion * 100).toFixed(0)}% is below ideal (should be >100%)`,
          severity: 'medium',
          metric: 'cashConversion',
          value: cashConversion,
        });
      } else {
        cashFlowScore = 20;
        redFlags.push({
          type: 'poor_cash_conversion',
          message: `Cash conversion of ${(cashConversion * 100).toFixed(0)}% is poor - earnings not converting to cash`,
          severity: 'high',
          metric: 'cashConversion',
          value: cashConversion,
        });
      }

      // Special case: negative OCF with positive net income
      if (operatingCashFlow < 0) {
        cashFlowScore = 10;
        redFlags.push({
          type: 'negative_ocf',
          message: 'Operating cash flow is negative despite positive net income - major red flag',
          severity: 'high',
          metric: 'cashConversion',
          value: cashConversion,
        });
      }
    }
  }

  // === REVENUE QUALITY ===
  // Based on DSO trends - high DSO suggests aggressive revenue recognition

  let revenueQuality: number | null = null;
  let revenueScore = 70; // Default to neutral

  if (data.accountsReceivable && data.revenue > 0) {
    const dso = (data.accountsReceivable / data.revenue) * 365;

    // DSO > 60 days starts to be concerning for most industries
    if (dso < 30) {
      revenueScore = 95;
    } else if (dso < 45) {
      revenueScore = 85;
    } else if (dso < 60) {
      revenueScore = 70;
    } else if (dso < 90) {
      revenueScore = 50;
      redFlags.push({
        type: 'high_dso',
        message: `DSO of ${dso.toFixed(0)} days is elevated - may indicate collection issues or revenue recognition concerns`,
        severity: 'medium',
        metric: 'dso',
        value: dso,
      });
    } else {
      revenueScore = 30;
      redFlags.push({
        type: 'very_high_dso',
        message: `DSO of ${dso.toFixed(0)} days is very high - significant revenue quality concern`,
        severity: 'high',
        metric: 'dso',
        value: dso,
      });
    }

    revenueQuality = Math.max(0, (90 - dso) / 90); // Normalize to 0-1
  }

  // === MARGIN CONSISTENCY ===
  // Check if margins are suspiciously consistent (may indicate smoothing)

  // This would ideally use historical data, but for single period we check reasonableness
  const grossMargin = data.revenue > 0 ? (data.grossProfit / data.revenue) * 100 : 0;
  const opMargin = data.revenue > 0 ? (data.operatingIncome / data.revenue) * 100 : 0;

  let consistencyScore = 70;

  // Check for margin compression (gross to operating)
  const grossToOpSpread = grossMargin - opMargin;
  if (grossToOpSpread < 0) {
    // Operating margin > Gross margin is impossible without "other income"
    redFlags.push({
      type: 'margin_anomaly',
      message: 'Operating margin exceeds gross margin - unusual accounting',
      severity: 'high',
    });
    consistencyScore = 30;
  }

  // Check for unusual tax situation
  if (data.incomeTaxExpense !== null && data.netIncome > 0) {
    const effectiveTaxRate = (data.incomeTaxExpense / (data.netIncome + data.incomeTaxExpense)) * 100;
    if (effectiveTaxRate < 5) {
      redFlags.push({
        type: 'low_tax_rate',
        message: `Effective tax rate of ${effectiveTaxRate.toFixed(1)}% is unusually low - may include one-time benefits`,
        severity: 'low',
        metric: 'taxRate',
        value: effectiveTaxRate,
      });
    }
  }

  // === CALCULATE OVERALL SCORE ===
  // Weighted average of component scores
  const weights = {
    cashFlow: 0.35,
    accrual: 0.30,
    revenue: 0.20,
    consistency: 0.15,
  };

  const overallScore = Math.round(
    cashFlowScore * weights.cashFlow +
    accrualScore * weights.accrual +
    revenueScore * weights.revenue +
    consistencyScore * weights.consistency
  );

  // Determine quality level
  let qualityLevel: EarningsQualityResult['qualityLevel'];
  if (overallScore >= 85) {
    qualityLevel = 'excellent';
  } else if (overallScore >= 70) {
    qualityLevel = 'good';
  } else if (overallScore >= 55) {
    qualityLevel = 'fair';
  } else if (overallScore >= 40) {
    qualityLevel = 'poor';
  } else {
    qualityLevel = 'concerning';
  }

  // Generate summary
  const summary = generateQualitySummary(
    qualityLevel,
    cashConversion,
    accrualRatio,
    redFlags
  );

  return {
    accrualRatio,
    cashConversion,
    revenueQuality,
    earningsVolatility: null, // Requires historical data
    overallScore,
    cashFlowScore,
    accrualScore,
    consistencyScore,
    qualityLevel,
    redFlags,
    summary,
  };
}

/**
 * Calculate earnings quality from historical data
 * This provides a more complete picture using multi-year data
 */
export function calculateEarningsQualityFromHistory(
  historicalData: HistoricalDataPoint[]
): EarningsQualityResult {
  const redFlags: EarningsRedFlag[] = [];

  if (historicalData.length < 2) {
    return {
      accrualRatio: null,
      cashConversion: null,
      revenueQuality: null,
      earningsVolatility: null,
      overallScore: 50,
      cashFlowScore: 50,
      accrualScore: 50,
      consistencyScore: 50,
      qualityLevel: 'fair',
      redFlags: [{ type: 'insufficient_data', message: 'Insufficient historical data for quality analysis', severity: 'low' }],
      summary: 'Insufficient historical data to assess earnings quality.',
    };
  }

  // === MARGIN VOLATILITY ===
  const opMargins = historicalData.map(d => d.operatingMargin);

  const opMarginVolatility = calculateStdDev(opMargins);

  let consistencyScore = 70;
  if (opMarginVolatility < 2) {
    consistencyScore = 95; // Very stable margins
  } else if (opMarginVolatility < 5) {
    consistencyScore = 80;
  } else if (opMarginVolatility < 10) {
    consistencyScore = 60;
  } else {
    consistencyScore = 40;
    redFlags.push({
      type: 'margin_volatility',
      message: `Operating margin volatility of ${opMarginVolatility.toFixed(1)}% suggests inconsistent earnings`,
      severity: 'medium',
      metric: 'opMarginVolatility',
      value: opMarginVolatility,
    });
  }

  // === EARNINGS GROWTH VOLATILITY ===
  const earningsGrowthRates: number[] = [];
  for (let i = 1; i < historicalData.length; i++) {
    const current = historicalData[i].netIncome;
    const prior = historicalData[i - 1].netIncome;
    if (prior !== 0) {
      earningsGrowthRates.push(((current - prior) / Math.abs(prior)) * 100);
    }
  }

  let earningsVolatility: number | null = null;
  let cashFlowScore = 60;

  if (earningsGrowthRates.length >= 2) {
    earningsVolatility = calculateStdDev(earningsGrowthRates) / 100;

    if (earningsVolatility <= QUALITY_THRESHOLDS.earningsVolatility.excellent) {
      cashFlowScore = 90;
    } else if (earningsVolatility <= QUALITY_THRESHOLDS.earningsVolatility.good) {
      cashFlowScore = 75;
    } else if (earningsVolatility <= QUALITY_THRESHOLDS.earningsVolatility.fair) {
      cashFlowScore = 55;
    } else {
      cashFlowScore = 35;
      redFlags.push({
        type: 'earnings_volatility',
        message: `High earnings volatility (${(earningsVolatility * 100).toFixed(0)}% std dev) indicates unpredictable earnings`,
        severity: 'medium',
        metric: 'earningsVolatility',
        value: earningsVolatility,
      });
    }
  }

  // === MARGIN TREND ===
  // Check if margins are deteriorating
  const latest = historicalData[historicalData.length - 1];
  const earliest = historicalData[0];

  if (latest.operatingMargin < earliest.operatingMargin - 5) {
    redFlags.push({
      type: 'margin_compression',
      message: `Operating margin declined from ${earliest.operatingMargin.toFixed(1)}% to ${latest.operatingMargin.toFixed(1)}% over the period`,
      severity: 'medium',
    });
  }

  // Calculate average accrual ratio from available data
  let accrualScore = 60; // Default without OCF data

  // Revenue quality from DSO trends would go here
  let revenueScore = 70;

  // Overall score
  const overallScore = Math.round(
    cashFlowScore * 0.35 +
    accrualScore * 0.30 +
    revenueScore * 0.20 +
    consistencyScore * 0.15
  );

  let qualityLevel: EarningsQualityResult['qualityLevel'];
  if (overallScore >= 85) {
    qualityLevel = 'excellent';
  } else if (overallScore >= 70) {
    qualityLevel = 'good';
  } else if (overallScore >= 55) {
    qualityLevel = 'fair';
  } else if (overallScore >= 40) {
    qualityLevel = 'poor';
  } else {
    qualityLevel = 'concerning';
  }

  const summary = generateHistoricalQualitySummary(
    qualityLevel,
    opMarginVolatility,
    earningsVolatility,
    redFlags,
    historicalData.length
  );

  return {
    accrualRatio: null, // Would need OCF data
    cashConversion: null,
    revenueQuality: null,
    earningsVolatility,
    overallScore,
    cashFlowScore,
    accrualScore,
    consistencyScore,
    qualityLevel,
    redFlags,
    summary,
  };
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Generate quality summary text
 */
function generateQualitySummary(
  qualityLevel: EarningsQualityResult['qualityLevel'],
  cashConversion: number | null,
  accrualRatio: number | null,
  redFlags: EarningsRedFlag[]
): string {
  const parts: string[] = [];

  parts.push(`Earnings quality is ${qualityLevel}.`);

  if (cashConversion !== null) {
    if (cashConversion >= 1.0) {
      parts.push(`Strong cash conversion at ${(cashConversion * 100).toFixed(0)}% of net income.`);
    } else if (cashConversion >= 0.7) {
      parts.push(`Adequate cash conversion at ${(cashConversion * 100).toFixed(0)}%.`);
    } else {
      parts.push(`Weak cash conversion at ${(cashConversion * 100).toFixed(0)}% - earnings not fully supported by cash flow.`);
    }
  }

  if (accrualRatio !== null && Math.abs(accrualRatio) > 0.08) {
    parts.push(`Elevated accruals (${(accrualRatio * 100).toFixed(1)}%) warrant scrutiny.`);
  }

  const highSeverityFlags = redFlags.filter(f => f.severity === 'high');
  if (highSeverityFlags.length > 0) {
    parts.push(`${highSeverityFlags.length} significant concern${highSeverityFlags.length > 1 ? 's' : ''} identified.`);
  }

  return parts.join(' ');
}

/**
 * Generate summary from historical analysis
 */
function generateHistoricalQualitySummary(
  qualityLevel: EarningsQualityResult['qualityLevel'],
  marginVolatility: number,
  earningsVolatility: number | null,
  redFlags: EarningsRedFlag[],
  years: number
): string {
  const parts: string[] = [];

  parts.push(`Based on ${years} years of data, earnings quality is ${qualityLevel}.`);

  if (marginVolatility < 3) {
    parts.push('Margins are highly stable.');
  } else if (marginVolatility < 7) {
    parts.push('Margins show moderate variability.');
  } else {
    parts.push('Margins are volatile, suggesting cyclicality or operational issues.');
  }

  if (earningsVolatility !== null) {
    if (earningsVolatility < 0.15) {
      parts.push('Earnings growth is consistent.');
    } else if (earningsVolatility > 0.35) {
      parts.push('Earnings growth is highly variable.');
    }
  }

  const highSeverityFlags = redFlags.filter(f => f.severity === 'high');
  if (highSeverityFlags.length > 0) {
    parts.push(`${highSeverityFlags.length} red flag${highSeverityFlags.length > 1 ? 's' : ''} detected.`);
  }

  return parts.join(' ');
}

/**
 * Get color class for quality level
 */
export function getQualityLevelColor(level: EarningsQualityResult['qualityLevel']): string {
  switch (level) {
    case 'excellent':
      return 'text-emerald-500';
    case 'good':
      return 'text-green-500';
    case 'fair':
      return 'text-amber-500';
    case 'poor':
      return 'text-orange-500';
    case 'concerning':
      return 'text-red-500';
    default:
      return 'text-zinc-500';
  }
}

/**
 * Get color class for score
 */
export function getQualityScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 65) return 'text-green-500';
  if (score >= 50) return 'text-amber-500';
  if (score >= 35) return 'text-orange-500';
  return 'text-red-500';
}
