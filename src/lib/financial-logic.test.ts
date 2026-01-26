// Unit Tests for Financial Logic Engine
import { describe, it, expect } from 'vitest';
import {
  calculateRevenues,
  calculateDepreciationSchedule,
  calculateDebtSchedule,
  calculateIncomeStatement,
  calculateBalanceSheet,
  calculateCashFlow,
  calculateValuation,
  calculateAllSchedules,
  validateAssumptionsInput,
  sanitizeAssumptions,
  formatCurrency,
  formatPercent,
  formatNumber,
  defaultAssumptions,
  type Assumptions,
} from './financial-logic';

// =============================================================================
// TEST DATA
// =============================================================================

const testAssumptions: Assumptions = {
  baseRevenue: 1_000_000_000, // $1B
  projectionYears: 5,
  revenueGrowthRate: 10,
  cogsPercent: 60,
  sgaPercent: 20,
  taxRate: 25,
  daysReceivables: 45,
  daysInventory: 60,
  daysPayables: 30,
  capexPercent: 5,
  depreciationYears: 10,
  debtBalance: 200_000_000,
  interestRate: 5,
  yearlyRepayment: 20_000_000,
  wacc: 10,
  terminalGrowthRate: 2.5,
  sharesOutstanding: 100_000_000,
  netDebt: 200_000_000,
};

// =============================================================================
// REVENUE CALCULATIONS
// =============================================================================

describe('calculateRevenues', () => {
  it('should project revenues correctly with positive growth', () => {
    const revenues = calculateRevenues(1_000_000_000, 10, 3);

    expect(revenues).toHaveLength(3);
    expect(revenues[0]).toBeCloseTo(1_100_000_000, -1); // Year 1: $1.1B
    expect(revenues[1]).toBeCloseTo(1_210_000_000, -1); // Year 2: $1.21B
    expect(revenues[2]).toBeCloseTo(1_331_000_000, -1); // Year 3: $1.331B
  });

  it('should handle zero growth rate', () => {
    const revenues = calculateRevenues(1_000_000_000, 0, 3);

    revenues.forEach((rev) => {
      expect(rev).toBe(1_000_000_000);
    });
  });

  it('should handle negative growth rate', () => {
    const revenues = calculateRevenues(1_000_000_000, -10, 2);

    expect(revenues[0]).toBeCloseTo(900_000_000, -1);
    expect(revenues[1]).toBeCloseTo(810_000_000, -1);
  });

  it('should return empty array for zero years', () => {
    const revenues = calculateRevenues(1_000_000_000, 10, 0);
    expect(revenues).toHaveLength(0);
  });
});

// =============================================================================
// DEPRECIATION SCHEDULE
// =============================================================================

describe('calculateDepreciationSchedule', () => {
  it('should calculate depreciation schedule correctly', () => {
    const revenues = calculateRevenues(testAssumptions.baseRevenue, testAssumptions.revenueGrowthRate, 3);
    const schedule = calculateDepreciationSchedule(testAssumptions, revenues);

    expect(schedule).toHaveLength(3);

    // Check first year
    expect(schedule[0].year).toBe(1);
    expect(schedule[0].beginningPPE).toBeGreaterThan(0);
    expect(schedule[0].capex).toBeCloseTo(revenues[0] * 0.05, -1);
    expect(schedule[0].endingPPE).toBe(schedule[0].beginningPPE + schedule[0].capex - schedule[0].depreciation);

    // Check continuity between years
    expect(schedule[1].beginningPPE).toBe(schedule[0].endingPPE);
  });

  it('should have non-negative depreciation', () => {
    const revenues = calculateRevenues(testAssumptions.baseRevenue, testAssumptions.revenueGrowthRate, 5);
    const schedule = calculateDepreciationSchedule(testAssumptions, revenues);

    schedule.forEach((row) => {
      expect(row.depreciation).toBeGreaterThanOrEqual(0);
    });
  });
});

// =============================================================================
// DEBT SCHEDULE
// =============================================================================

describe('calculateDebtSchedule', () => {
  it('should calculate debt amortization correctly', () => {
    const schedule = calculateDebtSchedule(testAssumptions);

    expect(schedule).toHaveLength(5);

    // First year
    expect(schedule[0].beginningBalance).toBe(200_000_000);
    expect(schedule[0].interestExpense).toBe(200_000_000 * 0.05);
    expect(schedule[0].repayment).toBe(20_000_000);
    expect(schedule[0].endingBalance).toBe(180_000_000);

    // Check continuity
    expect(schedule[1].beginningBalance).toBe(schedule[0].endingBalance);
  });

  it('should not allow negative debt balance', () => {
    const highRepaymentAssumptions: Assumptions = {
      ...testAssumptions,
      yearlyRepayment: 500_000_000, // More than debt balance
    };
    const schedule = calculateDebtSchedule(highRepaymentAssumptions);

    schedule.forEach((row) => {
      expect(row.endingBalance).toBeGreaterThanOrEqual(0);
    });
  });

  it('should pay off debt completely when repayment exceeds balance', () => {
    const smallDebtAssumptions: Assumptions = {
      ...testAssumptions,
      debtBalance: 50_000_000,
      yearlyRepayment: 20_000_000,
    };
    const schedule = calculateDebtSchedule(smallDebtAssumptions);

    // By year 3, debt should be paid off
    expect(schedule[2].endingBalance).toBe(0);
    expect(schedule[3].beginningBalance).toBe(0);
  });
});

// =============================================================================
// INCOME STATEMENT
// =============================================================================

describe('calculateIncomeStatement', () => {
  it('should calculate income statement correctly', () => {
    const revenues = calculateRevenues(testAssumptions.baseRevenue, testAssumptions.revenueGrowthRate, 3);
    const depSchedule = calculateDepreciationSchedule(testAssumptions, revenues);
    const debtSchedule = calculateDebtSchedule(testAssumptions);
    const incomeStatement = calculateIncomeStatement(testAssumptions, revenues, depSchedule, debtSchedule);

    expect(incomeStatement).toHaveLength(3);

    // Check first year calculations
    const year1 = incomeStatement[0];
    expect(year1.revenue).toBeCloseTo(revenues[0], -1);
    expect(year1.cogs).toBeCloseTo(revenues[0] * 0.6, -1);
    expect(year1.grossProfit).toBeCloseTo(revenues[0] - year1.cogs, -1);
    expect(year1.sga).toBeCloseTo(revenues[0] * 0.2, -1);
    expect(year1.ebit).toBeCloseTo(year1.grossProfit - year1.sga - year1.depreciation, -1);
    expect(year1.ebt).toBeCloseTo(year1.ebit - year1.interestExpense, -1);
  });

  it('should not have negative taxes', () => {
    const revenues = calculateRevenues(testAssumptions.baseRevenue, testAssumptions.revenueGrowthRate, 5);
    const depSchedule = calculateDepreciationSchedule(testAssumptions, revenues);
    const debtSchedule = calculateDebtSchedule(testAssumptions);
    const incomeStatement = calculateIncomeStatement(testAssumptions, revenues, depSchedule, debtSchedule);

    incomeStatement.forEach((row) => {
      expect(row.taxes).toBeGreaterThanOrEqual(0);
    });
  });

  it('should have consistent year numbering', () => {
    const revenues = calculateRevenues(testAssumptions.baseRevenue, testAssumptions.revenueGrowthRate, 5);
    const depSchedule = calculateDepreciationSchedule(testAssumptions, revenues);
    const debtSchedule = calculateDebtSchedule(testAssumptions);
    const incomeStatement = calculateIncomeStatement(testAssumptions, revenues, depSchedule, debtSchedule);

    incomeStatement.forEach((row, i) => {
      expect(row.year).toBe(i + 1);
    });
  });
});

// =============================================================================
// BALANCE SHEET
// =============================================================================

describe('calculateBalanceSheet', () => {
  it('should calculate working capital items correctly', () => {
    const revenues = calculateRevenues(testAssumptions.baseRevenue, testAssumptions.revenueGrowthRate, 3);
    const depSchedule = calculateDepreciationSchedule(testAssumptions, revenues);
    const debtSchedule = calculateDebtSchedule(testAssumptions);
    const incomeStatement = calculateIncomeStatement(testAssumptions, revenues, depSchedule, debtSchedule);
    const balanceSheet = calculateBalanceSheet(testAssumptions, incomeStatement, depSchedule, debtSchedule);

    expect(balanceSheet).toHaveLength(3);

    // Check AR = Revenue / 365 * DSO
    const year1 = balanceSheet[0];
    const expectedAR = (incomeStatement[0].revenue / 365) * testAssumptions.daysReceivables;
    expect(year1.accountsReceivable).toBeCloseTo(expectedAR, -1);

    // Check inventory = COGS / 365 * DIO
    const expectedInventory = (incomeStatement[0].cogs / 365) * testAssumptions.daysInventory;
    expect(year1.inventory).toBeCloseTo(expectedInventory, -1);
  });

  it('should accumulate retained earnings', () => {
    const revenues = calculateRevenues(testAssumptions.baseRevenue, testAssumptions.revenueGrowthRate, 3);
    const depSchedule = calculateDepreciationSchedule(testAssumptions, revenues);
    const debtSchedule = calculateDebtSchedule(testAssumptions);
    const incomeStatement = calculateIncomeStatement(testAssumptions, revenues, depSchedule, debtSchedule);
    const balanceSheet = calculateBalanceSheet(testAssumptions, incomeStatement, depSchedule, debtSchedule);

    // Retained earnings should accumulate
    let cumulativeNetIncome = 0;
    for (let i = 0; i < 3; i++) {
      cumulativeNetIncome += incomeStatement[i].netIncome;
      expect(balanceSheet[i].retainedEarnings).toBeCloseTo(cumulativeNetIncome, -1);
    }
  });
});

// =============================================================================
// CASH FLOW
// =============================================================================

describe('calculateCashFlow', () => {
  it('should calculate unlevered free cash flow correctly', () => {
    const revenues = calculateRevenues(testAssumptions.baseRevenue, testAssumptions.revenueGrowthRate, 3);
    const depSchedule = calculateDepreciationSchedule(testAssumptions, revenues);
    const debtSchedule = calculateDebtSchedule(testAssumptions);
    const incomeStatement = calculateIncomeStatement(testAssumptions, revenues, depSchedule, debtSchedule);
    const cashFlow = calculateCashFlow(testAssumptions, incomeStatement, depSchedule);

    expect(cashFlow).toHaveLength(3);

    // UFCF = EBIT(1-T) + D&A - ΔWC - CapEx
    const year1 = cashFlow[0];
    const ebitAfterTax = incomeStatement[0].ebit * (1 - testAssumptions.taxRate / 100);
    const expectedUFCF = ebitAfterTax + year1.depreciation - year1.changeInNWC - year1.capex;
    expect(year1.unleveredFCF).toBeCloseTo(expectedUFCF, -1);
  });

  it('should track capex from depreciation schedule', () => {
    const revenues = calculateRevenues(testAssumptions.baseRevenue, testAssumptions.revenueGrowthRate, 5);
    const depSchedule = calculateDepreciationSchedule(testAssumptions, revenues);
    const debtSchedule = calculateDebtSchedule(testAssumptions);
    const incomeStatement = calculateIncomeStatement(testAssumptions, revenues, depSchedule, debtSchedule);
    const cashFlow = calculateCashFlow(testAssumptions, incomeStatement, depSchedule);

    cashFlow.forEach((cf, i) => {
      expect(cf.capex).toBe(depSchedule[i].capex);
    });
  });
});

// =============================================================================
// DCF VALUATION
// =============================================================================

describe('calculateValuation', () => {
  it('should calculate present value factors correctly', () => {
    const cashFlows = [
      { year: 1, netIncome: 0, depreciation: 0, changeInNWC: 0, capex: 0, unleveredFCF: 100_000_000 },
      { year: 2, netIncome: 0, depreciation: 0, changeInNWC: 0, capex: 0, unleveredFCF: 110_000_000 },
      { year: 3, netIncome: 0, depreciation: 0, changeInNWC: 0, capex: 0, unleveredFCF: 121_000_000 },
    ];

    const valuation = calculateValuation(cashFlows, 10, 2.5, 100_000_000, 100_000_000);

    // PV factor for year 1 at 10% WACC = 1/1.10 = 0.909
    expect(valuation.pvFactors[0]).toBeCloseTo(0.909, 2);
    expect(valuation.pvFactors[1]).toBeCloseTo(0.826, 2);
    expect(valuation.pvFactors[2]).toBeCloseTo(0.751, 2);
  });

  it('should calculate terminal value using Gordon Growth Model', () => {
    const cashFlows = [
      { year: 1, netIncome: 0, depreciation: 0, changeInNWC: 0, capex: 0, unleveredFCF: 100_000_000 },
    ];

    const valuation = calculateValuation(cashFlows, 10, 2.5, 0, 100_000_000);

    // Terminal Value = FCF * (1 + g) / (WACC - g)
    // = 100M * 1.025 / (0.10 - 0.025) = 100M * 1.025 / 0.075 = 1.367B
    expect(valuation.terminalValue).toBeCloseTo(1_366_666_667, -2);
  });

  it('should derive equity value from enterprise value', () => {
    const cashFlows = [
      { year: 1, netIncome: 0, depreciation: 0, changeInNWC: 0, capex: 0, unleveredFCF: 100_000_000 },
    ];

    const netDebt = 50_000_000;
    const valuation = calculateValuation(cashFlows, 10, 2.5, netDebt, 100_000_000);

    expect(valuation.equityValue).toBe(valuation.enterpriseValue - netDebt);
  });

  it('should calculate implied share price correctly', () => {
    const cashFlows = [
      { year: 1, netIncome: 0, depreciation: 0, changeInNWC: 0, capex: 0, unleveredFCF: 100_000_000 },
    ];

    const sharesOutstanding = 50_000_000;
    const valuation = calculateValuation(cashFlows, 10, 2.5, 100_000_000, sharesOutstanding);

    expect(valuation.impliedSharePrice).toBe(valuation.equityValue / sharesOutstanding);
  });
});

// =============================================================================
// MASTER CALCULATION FUNCTION
// =============================================================================

describe('calculateAllSchedules', () => {
  it('should return all financial schedules', () => {
    const result = calculateAllSchedules(testAssumptions);

    expect(result).toHaveProperty('revenues');
    expect(result).toHaveProperty('incomeStatement');
    expect(result).toHaveProperty('balanceSheet');
    expect(result).toHaveProperty('cashFlow');
    expect(result).toHaveProperty('depreciationSchedule');
    expect(result).toHaveProperty('debtSchedule');
    expect(result).toHaveProperty('valuation');

    expect(result.revenues).toHaveLength(testAssumptions.projectionYears);
    expect(result.incomeStatement).toHaveLength(testAssumptions.projectionYears);
  });

  it('should work with default assumptions', () => {
    const result = calculateAllSchedules(defaultAssumptions);

    expect(result.valuation.impliedSharePrice).toBeGreaterThan(0);
    expect(result.valuation.enterpriseValue).toBeGreaterThan(0);
    expect(result.valuation.equityValue).toBeGreaterThan(0);
  });

  it('should produce positive share price for profitable company', () => {
    const profitableAssumptions: Assumptions = {
      ...testAssumptions,
      cogsPercent: 40, // Higher gross margin
      sgaPercent: 15, // Lower SG&A
    };

    const result = calculateAllSchedules(profitableAssumptions);
    expect(result.valuation.impliedSharePrice).toBeGreaterThan(0);
  });
});

// =============================================================================
// VALIDATION
// =============================================================================

describe('validateAssumptionsInput', () => {
  it('should warn on zero revenue', () => {
    const badAssumptions: Assumptions = { ...testAssumptions, baseRevenue: 0 };
    const warnings = validateAssumptionsInput(badAssumptions);

    expect(warnings.some((w) => w.field === 'baseRevenue')).toBe(true);
    expect(warnings.some((w) => w.severity === 'high')).toBe(true);
  });

  it('should warn on terminal growth >= WACC', () => {
    const badAssumptions: Assumptions = { ...testAssumptions, terminalGrowthRate: 11, wacc: 10 };
    const warnings = validateAssumptionsInput(badAssumptions);

    expect(warnings.some((w) => w.field === 'terminalGrowthRate')).toBe(true);
  });

  it('should warn on very high growth rates', () => {
    const highGrowthAssumptions: Assumptions = { ...testAssumptions, revenueGrowthRate: 75 };
    const warnings = validateAssumptionsInput(highGrowthAssumptions);

    expect(warnings.some((w) => w.field === 'revenueGrowthRate')).toBe(true);
  });

  it('should return empty array for valid assumptions', () => {
    const warnings = validateAssumptionsInput(testAssumptions);

    // May have some low-severity warnings, but no high-severity ones
    const highSeverity = warnings.filter((w) => w.severity === 'high');
    expect(highSeverity).toHaveLength(0);
  });
});

describe('sanitizeAssumptions', () => {
  it('should clamp values within valid ranges', () => {
    const extremeAssumptions: Assumptions = {
      ...testAssumptions,
      revenueGrowthRate: 500, // Way too high
      cogsPercent: 150, // Invalid
      wacc: 0, // Too low
    };

    const sanitized = sanitizeAssumptions(extremeAssumptions);

    expect(sanitized.revenueGrowthRate).toBeLessThanOrEqual(100);
    expect(sanitized.cogsPercent).toBeLessThanOrEqual(95);
    expect(sanitized.wacc).toBeGreaterThanOrEqual(5);
  });

  it('should ensure terminal growth is less than WACC', () => {
    const badAssumptions: Assumptions = {
      ...testAssumptions,
      terminalGrowthRate: 15,
      wacc: 10,
    };

    const sanitized = sanitizeAssumptions(badAssumptions);
    expect(sanitized.terminalGrowthRate).toBeLessThan(sanitized.wacc);
  });

  it('should preserve valid values', () => {
    const sanitized = sanitizeAssumptions(testAssumptions);

    expect(sanitized.revenueGrowthRate).toBe(testAssumptions.revenueGrowthRate);
    expect(sanitized.cogsPercent).toBe(testAssumptions.cogsPercent);
    expect(sanitized.wacc).toBe(testAssumptions.wacc);
  });
});

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

describe('formatCurrency', () => {
  it('should format billions correctly', () => {
    expect(formatCurrency(1_500_000_000)).toBe('$1.50B');
    expect(formatCurrency(10_000_000_000)).toBe('$10.00B');
  });

  it('should format millions correctly', () => {
    expect(formatCurrency(150_000_000)).toBe('$150.00M');
    expect(formatCurrency(1_500_000)).toBe('$1.50M');
  });

  it('should format thousands correctly', () => {
    expect(formatCurrency(150_000)).toBe('$150.00K');
    expect(formatCurrency(1_500)).toBe('$1.50K');
  });

  it('should handle negative values', () => {
    expect(formatCurrency(-1_500_000_000)).toBe('$-1.50B');
  });

  it('should format without compact notation when disabled', () => {
    const result = formatCurrency(1_500_000, false);
    expect(result).toContain('1,500,000');
  });
});

describe('formatPercent', () => {
  it('should format percentages correctly', () => {
    expect(formatPercent(25)).toBe('25.0%');
    expect(formatPercent(10.5)).toBe('10.5%');
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('should respect decimal precision', () => {
    expect(formatPercent(10.567, 2)).toBe('10.57%');
    expect(formatPercent(10.567, 0)).toBe('11%');
  });
});

describe('formatNumber', () => {
  it('should format numbers with commas', () => {
    expect(formatNumber(1000000)).toBe('1,000,000');
    expect(formatNumber(1234567890)).toBe('1,234,567,890');
  });

  it('should round to nearest integer', () => {
    expect(formatNumber(1000.5)).toBe('1,001');
    expect(formatNumber(1000.4)).toBe('1,000');
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  it('should handle single year projection', () => {
    const singleYearAssumptions: Assumptions = {
      ...testAssumptions,
      projectionYears: 1,
    };

    const result = calculateAllSchedules(singleYearAssumptions);
    expect(result.revenues).toHaveLength(1);
    expect(result.valuation.impliedSharePrice).toBeGreaterThan(0);
  });

  it('should handle zero debt', () => {
    const noDebtAssumptions: Assumptions = {
      ...testAssumptions,
      debtBalance: 0,
      netDebt: 0,
      yearlyRepayment: 0,
    };

    const result = calculateAllSchedules(noDebtAssumptions);
    expect(result.debtSchedule[0].interestExpense).toBe(0);
    expect(result.valuation.equityValue).toBe(result.valuation.enterpriseValue);
  });

  it('should handle very high WACC', () => {
    const highWACCAssumptions: Assumptions = {
      ...testAssumptions,
      wacc: 20,
      terminalGrowthRate: 2,
    };

    const result = calculateAllSchedules(highWACCAssumptions);
    // Higher WACC should result in lower valuation
    const baseResult = calculateAllSchedules(testAssumptions);
    expect(result.valuation.enterpriseValue).toBeLessThan(baseResult.valuation.enterpriseValue);
  });

  it('should produce consistent results across multiple runs', () => {
    const result1 = calculateAllSchedules(testAssumptions);
    const result2 = calculateAllSchedules(testAssumptions);

    expect(result1.valuation.impliedSharePrice).toBe(result2.valuation.impliedSharePrice);
    expect(result1.valuation.enterpriseValue).toBe(result2.valuation.enterpriseValue);
  });
});
