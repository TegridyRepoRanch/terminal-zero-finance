// Terminal Zero - Financial Logic Engine
// All pure calculation functions for DCF valuation

import { VALIDATION_LIMITS } from './constants';

// =============================================================================
// INPUT VALIDATION
// =============================================================================

export interface ValidationWarning {
    field: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
}

/**
 * Validate assumptions and return warnings for problematic values
 */
export function validateAssumptionsInput(assumptions: Assumptions): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Revenue validation
    if (assumptions.baseRevenue <= 0) {
        warnings.push({
            field: 'baseRevenue',
            message: 'Base revenue must be positive',
            severity: 'high',
        });
    }

    // Growth rate validation
    if (assumptions.revenueGrowthRate > VALIDATION_LIMITS.GROWTH_WARNING_HIGH) {
        warnings.push({
            field: 'revenueGrowthRate',
            message: `Growth rate of ${assumptions.revenueGrowthRate}% may be unsustainable`,
            severity: 'medium',
        });
    }
    if (assumptions.revenueGrowthRate < VALIDATION_LIMITS.GROWTH_MIN) {
        warnings.push({
            field: 'revenueGrowthRate',
            message: 'Significant decline in revenue projected',
            severity: 'high',
        });
    }

    // COGS validation
    if (assumptions.cogsPercent > VALIDATION_LIMITS.COGS_WARNING_HIGH) {
        warnings.push({
            field: 'cogsPercent',
            message: `COGS of ${assumptions.cogsPercent}% leaves very thin margins`,
            severity: 'medium',
        });
    }
    if (assumptions.cogsPercent < VALIDATION_LIMITS.COGS_WARNING_LOW) {
        warnings.push({
            field: 'cogsPercent',
            message: `COGS of ${assumptions.cogsPercent}% is unusually low (typical for software)`,
            severity: 'low',
        });
    }

    // Tax rate validation
    if (assumptions.taxRate < VALIDATION_LIMITS.TAX_WARNING_LOW || assumptions.taxRate > VALIDATION_LIMITS.TAX_WARNING_HIGH) {
        warnings.push({
            field: 'taxRate',
            message: `Effective tax rate of ${assumptions.taxRate}% is unusual - may have one-time items`,
            severity: 'low',
        });
    }

    // Working capital validation
    if (assumptions.daysReceivables > VALIDATION_LIMITS.DSO_WARNING) {
        warnings.push({
            field: 'daysReceivables',
            message: `DSO of ${assumptions.daysReceivables} days may indicate collection issues`,
            severity: 'medium',
        });
    }
    if (assumptions.daysPayables > VALIDATION_LIMITS.DPO_WARNING) {
        warnings.push({
            field: 'daysPayables',
            message: `DPO of ${assumptions.daysPayables} days indicates stretched payables`,
            severity: 'low',
        });
    }

    // WACC validation
    if (assumptions.wacc < VALIDATION_LIMITS.WACC_MIN) {
        warnings.push({
            field: 'wacc',
            message: `WACC of ${assumptions.wacc}% is very low - verify cost of capital`,
            severity: 'medium',
        });
    }
    if (assumptions.wacc > VALIDATION_LIMITS.WACC_MAX) {
        warnings.push({
            field: 'wacc',
            message: `WACC of ${assumptions.wacc}% is high - reflects significant risk`,
            severity: 'medium',
        });
    }

    // Terminal growth validation
    if (assumptions.terminalGrowthRate >= assumptions.wacc) {
        warnings.push({
            field: 'terminalGrowthRate',
            message: 'Terminal growth cannot exceed WACC (creates infinite value)',
            severity: 'high',
        });
    }

    return warnings;
}

/**
 * Clamp a value within a range
 */
function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Sanitize assumptions to ensure valid calculations
 */
export function sanitizeAssumptions(assumptions: Assumptions): Assumptions {
    return {
        ...assumptions,
        baseRevenue: Math.max(0, assumptions.baseRevenue),
        projectionYears: clamp(assumptions.projectionYears, VALIDATION_LIMITS.MIN_PROJECTION_YEARS, VALIDATION_LIMITS.MAX_PROJECTION_YEARS),
        revenueGrowthRate: clamp(assumptions.revenueGrowthRate, VALIDATION_LIMITS.GROWTH_MIN, VALIDATION_LIMITS.GROWTH_MAX),
        cogsPercent: clamp(assumptions.cogsPercent, VALIDATION_LIMITS.COGS_MIN, VALIDATION_LIMITS.COGS_MAX),
        sgaPercent: clamp(assumptions.sgaPercent, VALIDATION_LIMITS.SGA_MIN, VALIDATION_LIMITS.SGA_MAX),
        taxRate: clamp(assumptions.taxRate, VALIDATION_LIMITS.TAX_MIN, VALIDATION_LIMITS.TAX_MAX),
        daysReceivables: clamp(assumptions.daysReceivables, VALIDATION_LIMITS.DSO_MIN, VALIDATION_LIMITS.DSO_MAX),
        daysInventory: clamp(assumptions.daysInventory, VALIDATION_LIMITS.DIO_MIN, VALIDATION_LIMITS.DIO_MAX),
        daysPayables: clamp(assumptions.daysPayables, VALIDATION_LIMITS.DPO_MIN, VALIDATION_LIMITS.DPO_MAX),
        wacc: clamp(assumptions.wacc, VALIDATION_LIMITS.WACC_MIN, VALIDATION_LIMITS.WACC_MAX),
        terminalGrowthRate: clamp(assumptions.terminalGrowthRate, VALIDATION_LIMITS.TERMINAL_GROWTH_MIN, Math.min(VALIDATION_LIMITS.TERMINAL_GROWTH_MAX, assumptions.wacc - 0.5)),
    };
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface Assumptions {
    // Base data
    baseRevenue: number;
    projectionYears: number;

    // Income Statement
    revenueGrowthRate: number; // %
    cogsPercent: number; // % of revenue
    sgaPercent: number; // % of revenue
    taxRate: number; // %

    // Balance Sheet
    daysReceivables: number; // DSO
    daysInventory: number; // DIO
    daysPayables: number; // DPO

    // CapEx & Depreciation
    capexPercent: number; // % of revenue
    depreciationYears: number; // Straight-line years

    // Debt
    debtBalance: number;
    interestRate: number; // %
    yearlyRepayment: number;

    // Valuation
    wacc: number; // %
    terminalGrowthRate: number; // %
    sharesOutstanding: number;
    netDebt: number;
}

export interface IncomeStatementRow {
    year: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    sga: number;
    depreciation: number;
    ebit: number;
    interestExpense: number;
    ebt: number;
    taxes: number;
    netIncome: number;
}

export interface BalanceSheetRow {
    year: number;
    accountsReceivable: number;
    inventory: number;
    totalCurrentAssets: number;
    ppe: number;
    totalAssets: number;
    accountsPayable: number;
    debtBalance: number;
    totalLiabilities: number;
    retainedEarnings: number;
    totalEquity: number;
    cashPlug: number;
}

export interface CashFlowRow {
    year: number;
    netIncome: number;
    depreciation: number;
    changeInNWC: number;
    capex: number;
    unleveredFCF: number;
}

export interface DepreciationRow {
    year: number;
    beginningPPE: number;
    capex: number;
    depreciation: number;
    endingPPE: number;
}

export interface DebtRow {
    year: number;
    beginningBalance: number;
    interestExpense: number;
    repayment: number;
    endingBalance: number;
}

export interface ValuationResult {
    ufcfStream: number[];
    pvFactors: number[];
    pvUFCF: number[];
    sumPvUFCF: number;
    terminalValue: number;
    pvTerminalValue: number;
    enterpriseValue: number;
    equityValue: number;
    impliedSharePrice: number;
}

// Default assumptions for a typical company
export const defaultAssumptions: Assumptions = {
    baseRevenue: 1000000000, // $1B
    projectionYears: 5,

    revenueGrowthRate: 8,
    cogsPercent: 60,
    sgaPercent: 20,
    taxRate: 25,

    daysReceivables: 45,
    daysInventory: 60,
    daysPayables: 30,

    capexPercent: 5,
    depreciationYears: 10,

    debtBalance: 200000000, // $200M
    interestRate: 5,
    yearlyRepayment: 20000000, // $20M/year

    wacc: 10,
    terminalGrowthRate: 2.5,
    sharesOutstanding: 100000000, // 100M shares
    netDebt: 200000000, // $200M
};

// Calculate projected revenues
export function calculateRevenues(
    baseRevenue: number,
    growthRate: number,
    years: number
): number[] {
    const revenues: number[] = [];
    let currentRevenue = baseRevenue;

    for (let i = 0; i < years; i++) {
        currentRevenue = currentRevenue * (1 + growthRate / 100);
        revenues.push(currentRevenue);
    }

    return revenues;
}

// Calculate depreciation schedule
export function calculateDepreciationSchedule(
    assumptions: Assumptions,
    revenues: number[]
): DepreciationRow[] {
    const schedule: DepreciationRow[] = [];
    let beginningPPE = assumptions.baseRevenue * (assumptions.capexPercent / 100) * 2; // Assume 2 years of CapEx as starting PPE

    for (let i = 0; i < revenues.length; i++) {
        const capex = revenues[i] * (assumptions.capexPercent / 100);
        const depreciation = (beginningPPE + capex) / assumptions.depreciationYears;
        const endingPPE = beginningPPE + capex - depreciation;

        schedule.push({
            year: i + 1,
            beginningPPE,
            capex,
            depreciation,
            endingPPE,
        });

        beginningPPE = endingPPE;
    }

    return schedule;
}

// Calculate debt schedule
export function calculateDebtSchedule(
    assumptions: Assumptions
): DebtRow[] {
    const schedule: DebtRow[] = [];
    let balance = assumptions.debtBalance;

    for (let i = 0; i < assumptions.projectionYears; i++) {
        const interestExpense = balance * (assumptions.interestRate / 100);
        const repayment = Math.min(assumptions.yearlyRepayment, balance);
        const endingBalance = balance - repayment;

        schedule.push({
            year: i + 1,
            beginningBalance: balance,
            interestExpense,
            repayment,
            endingBalance,
        });

        balance = endingBalance;
    }

    return schedule;
}

// Calculate Income Statement
export function calculateIncomeStatement(
    assumptions: Assumptions,
    revenues: number[],
    depreciationSchedule: DepreciationRow[],
    debtSchedule: DebtRow[]
): IncomeStatementRow[] {
    return revenues.map((revenue, i) => {
        const cogs = revenue * (assumptions.cogsPercent / 100);
        const grossProfit = revenue - cogs;
        const sga = revenue * (assumptions.sgaPercent / 100);
        const depreciation = depreciationSchedule[i].depreciation;
        const ebit = grossProfit - sga - depreciation;
        const interestExpense = debtSchedule[i].interestExpense;
        const ebt = ebit - interestExpense;
        const taxes = Math.max(0, ebt * (assumptions.taxRate / 100));
        const netIncome = ebt - taxes;

        return {
            year: i + 1,
            revenue,
            cogs,
            grossProfit,
            sga,
            depreciation,
            ebit,
            interestExpense,
            ebt,
            taxes,
            netIncome,
        };
    });
}

// Calculate Working Capital items
function calculateWorkingCapital(
    revenue: number,
    cogs: number,
    dso: number,
    dio: number,
    dpo: number
) {
    const ar = (revenue / 365) * dso;
    const inventory = (cogs / 365) * dio;
    const ap = (cogs / 365) * dpo;
    const nwc = ar + inventory - ap;

    return { ar, inventory, ap, nwc };
}

// Calculate Balance Sheet
export function calculateBalanceSheet(
    assumptions: Assumptions,
    incomeStatement: IncomeStatementRow[],
    depreciationSchedule: DepreciationRow[],
    debtSchedule: DebtRow[]
): BalanceSheetRow[] {
    let cumulativeRetainedEarnings = 0;

    return incomeStatement.map((is, i) => {
        const wc = calculateWorkingCapital(
            is.revenue,
            is.cogs,
            assumptions.daysReceivables,
            assumptions.daysInventory,
            assumptions.daysPayables
        );

        cumulativeRetainedEarnings += is.netIncome;

        const ppe = depreciationSchedule[i].endingPPE;
        const debtBalance = debtSchedule[i].endingBalance;

        // Calculate totals
        const totalCurrentAssets = wc.ar + wc.inventory;
        const totalAssets = totalCurrentAssets + ppe;
        const totalLiabilities = wc.ap + debtBalance;
        const totalEquity = cumulativeRetainedEarnings;

        // Cash plug to balance
        const cashPlug = totalLiabilities + totalEquity - totalAssets + wc.ar + wc.inventory + ppe;

        return {
            year: i + 1,
            accountsReceivable: wc.ar,
            inventory: wc.inventory,
            totalCurrentAssets: totalCurrentAssets + Math.max(0, cashPlug),
            ppe,
            totalAssets: totalAssets + Math.max(0, cashPlug),
            accountsPayable: wc.ap,
            debtBalance,
            totalLiabilities,
            retainedEarnings: cumulativeRetainedEarnings,
            totalEquity,
            cashPlug: Math.max(0, cashPlug),
        };
    });
}

// Calculate Cash Flow Statement
export function calculateCashFlow(
    assumptions: Assumptions,
    incomeStatement: IncomeStatementRow[],
    depreciationSchedule: DepreciationRow[]
): CashFlowRow[] {
    let prevNWC = 0;
    const baseWC = calculateWorkingCapital(
        assumptions.baseRevenue,
        assumptions.baseRevenue * (assumptions.cogsPercent / 100),
        assumptions.daysReceivables,
        assumptions.daysInventory,
        assumptions.daysPayables
    );
    prevNWC = baseWC.nwc;

    return incomeStatement.map((is, i) => {
        const currentWC = calculateWorkingCapital(
            is.revenue,
            is.cogs,
            assumptions.daysReceivables,
            assumptions.daysInventory,
            assumptions.daysPayables
        );

        const changeInNWC = currentWC.nwc - prevNWC;
        prevNWC = currentWC.nwc;

        const capex = depreciationSchedule[i].capex;

        // Unlevered FCF = EBIT(1-T) + D&A - ΔWC - CapEx
        // Or equivalently: Net Income + Interest(1-T) + D&A - ΔWC - CapEx
        const ebitAfterTax = is.ebit * (1 - assumptions.taxRate / 100);
        const unleveredFCF = ebitAfterTax + is.depreciation - changeInNWC - capex;

        return {
            year: i + 1,
            netIncome: is.netIncome,
            depreciation: is.depreciation,
            changeInNWC,
            capex,
            unleveredFCF,
        };
    });
}

// Calculate DCF Valuation
export function calculateValuation(
    cashFlows: CashFlowRow[],
    wacc: number,
    terminalGrowthRate: number,
    netDebt: number,
    sharesOutstanding: number
): ValuationResult {
    const waccDecimal = wacc / 100;
    const growthDecimal = terminalGrowthRate / 100;

    const ufcfStream = cashFlows.map(cf => cf.unleveredFCF);

    // Calculate PV factors
    const pvFactors = cashFlows.map((_, i) =>
        1 / Math.pow(1 + waccDecimal, i + 1)
    );

    // Calculate PV of each UFCF
    const pvUFCF = ufcfStream.map((fcf, i) => fcf * pvFactors[i]);

    // Sum of PV of FCFs
    const sumPvUFCF = pvUFCF.reduce((sum, pv) => sum + pv, 0);

    // Terminal Value using Gordon Growth Model
    const lastYearFCF = ufcfStream[ufcfStream.length - 1];
    const terminalValue = (lastYearFCF * (1 + growthDecimal)) / (waccDecimal - growthDecimal);

    // PV of Terminal Value
    const pvTerminalValue = terminalValue * pvFactors[pvFactors.length - 1];

    // Enterprise Value
    const enterpriseValue = sumPvUFCF + pvTerminalValue;

    // Equity Value
    const equityValue = enterpriseValue - netDebt;

    // Implied Share Price
    const impliedSharePrice = equityValue / sharesOutstanding;

    return {
        ufcfStream,
        pvFactors,
        pvUFCF,
        sumPvUFCF,
        terminalValue,
        pvTerminalValue,
        enterpriseValue,
        equityValue,
        impliedSharePrice,
    };
}

// Master calculation function
export function calculateAllSchedules(assumptions: Assumptions) {
    const revenues = calculateRevenues(
        assumptions.baseRevenue,
        assumptions.revenueGrowthRate,
        assumptions.projectionYears
    );

    const depreciationSchedule = calculateDepreciationSchedule(assumptions, revenues);
    const debtSchedule = calculateDebtSchedule(assumptions);
    const incomeStatement = calculateIncomeStatement(
        assumptions,
        revenues,
        depreciationSchedule,
        debtSchedule
    );
    const balanceSheet = calculateBalanceSheet(
        assumptions,
        incomeStatement,
        depreciationSchedule,
        debtSchedule
    );
    const cashFlow = calculateCashFlow(assumptions, incomeStatement, depreciationSchedule);
    const valuation = calculateValuation(
        cashFlow,
        assumptions.wacc,
        assumptions.terminalGrowthRate,
        assumptions.netDebt,
        assumptions.sharesOutstanding
    );

    return {
        revenues,
        incomeStatement,
        balanceSheet,
        cashFlow,
        depreciationSchedule,
        debtSchedule,
        valuation,
    };
}

// Utility: Format number as currency
export function formatCurrency(value: number, compact = true): string {
    if (compact) {
        const absValue = Math.abs(value);
        if (absValue >= 1e9) {
            return `$${(value / 1e9).toFixed(2)}B`;
        } else if (absValue >= 1e6) {
            return `$${(value / 1e6).toFixed(2)}M`;
        } else if (absValue >= 1e3) {
            return `$${(value / 1e3).toFixed(2)}K`;
        }
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

// Utility: Format number as percentage
export function formatPercent(value: number, decimals = 1): string {
    return `${value.toFixed(decimals)}%`;
}

// Utility: Format number with commas
export function formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
}
