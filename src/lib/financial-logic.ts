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
 * Clamps a value within a specified range.
 *
 * @param value - The value to clamp
 * @param min - The minimum allowed value
 * @param max - The maximum allowed value
 * @returns The clamped value, ensuring min <= result <= max
 */
function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Sanitizes assumptions to ensure valid calculations by clamping all values
 * within acceptable ranges defined by VALIDATION_LIMITS.
 *
 * This function prevents calculations from failing due to extreme or invalid
 * input values while preserving the user's intent as much as possible.
 *
 * @param assumptions - The raw assumptions to sanitize
 * @returns Sanitized assumptions with all values within valid ranges
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

/**
 * Calculates projected revenues for future years using a constant growth rate.
 *
 * Revenue for each year is calculated as: Revenue(t) = Revenue(t-1) * (1 + growth rate)
 *
 * @param baseRevenue - Starting revenue (most recent year actual)
 * @param growthRate - Annual growth rate as a percentage (e.g., 8 for 8%)
 * @param years - Number of years to project forward
 * @returns Array of projected revenues, one for each year
 *
 * @example
 * calculateRevenues(1000000000, 8, 5)
 * // Returns: [1080000000, 1166400000, 1259712000, 1360488960, 1469328076.8]
 */
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

/**
 * Calculates the Property, Plant & Equipment (PPE) and depreciation schedule.
 *
 * Uses straight-line depreciation method. Starting PPE is estimated as 2 years
 * of CapEx based on the base revenue. Each year adds new CapEx (as % of revenue)
 * and depreciates the total PPE base over the specified depreciation years.
 *
 * @param assumptions - DCF assumptions including capexPercent and depreciationYears
 * @param revenues - Projected revenues for each year
 * @returns Array of depreciation schedule rows with PPE movements
 */
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

/**
 * Calculates the debt repayment schedule with interest expense.
 *
 * Each year:
 * - Interest expense = Beginning balance * Interest rate
 * - Repayment = Min(yearly repayment, remaining balance)
 * - Ending balance = Beginning balance - Repayment
 *
 * @param assumptions - DCF assumptions including debtBalance, interestRate, and yearlyRepayment
 * @returns Array of debt schedule rows showing balance movements and interest
 */
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

/**
 * Calculates the projected Income Statement for all forecast years.
 *
 * Flow: Revenue → COGS → Gross Profit → SG&A → Depreciation → EBIT
 *       → Interest → EBT → Taxes → Net Income
 *
 * COGS and SG&A are calculated as percentages of revenue.
 * Depreciation comes from the depreciation schedule.
 * Interest expense comes from the debt schedule.
 * Taxes are only applied to positive EBT (no tax benefit for losses).
 *
 * @param assumptions - DCF assumptions including cost percentages and tax rate
 * @param revenues - Projected revenues for each year
 * @param depreciationSchedule - PPE depreciation schedule
 * @param debtSchedule - Debt repayment schedule with interest
 * @returns Array of income statement rows for each projection year
 */
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

/**
 * Calculates working capital components (AR, Inventory, AP) and Net Working Capital.
 *
 * Formulas:
 * - Accounts Receivable = (Revenue / 365) * Days Sales Outstanding
 * - Inventory = (COGS / 365) * Days Inventory Outstanding
 * - Accounts Payable = (COGS / 365) * Days Payables Outstanding
 * - Net Working Capital = AR + Inventory - AP
 *
 * @param revenue - Annual revenue
 * @param cogs - Cost of goods sold
 * @param dso - Days Sales Outstanding (receivables collection period)
 * @param dio - Days Inventory Outstanding (inventory turnover period)
 * @param dpo - Days Payables Outstanding (payables payment period)
 * @returns Object containing AR, inventory, AP, and net working capital
 */
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

/**
 * Calculates the projected Balance Sheet for all forecast years.
 *
 * Assets:
 * - Current Assets = AR + Inventory + Cash Plug
 * - Fixed Assets = PPE from depreciation schedule
 *
 * Liabilities:
 * - Current Liabilities = AP
 * - Long-term Debt = from debt schedule
 *
 * Equity:
 * - Retained Earnings = Cumulative Net Income
 *
 * Uses a "cash plug" to force the balance sheet to balance (Assets = Liabilities + Equity).
 * This represents excess cash generated or required.
 *
 * @param assumptions - DCF assumptions for working capital calculations
 * @param incomeStatement - Projected income statements
 * @param depreciationSchedule - PPE depreciation schedule
 * @param debtSchedule - Debt repayment schedule
 * @returns Array of balance sheet rows for each projection year
 */
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

/**
 * Calculates the projected Cash Flow Statement and Unlevered Free Cash Flow.
 *
 * Unlevered FCF Formula:
 * UFCF = EBIT × (1 - Tax Rate) + Depreciation - ΔNet Working Capital - CapEx
 *
 * This represents the cash generated by operations available to all stakeholders
 * (debt and equity holders) before considering capital structure.
 *
 * Change in NWC is calculated year-over-year, with Year 0 based on base revenue.
 *
 * @param assumptions - DCF assumptions for working capital and tax calculations
 * @param incomeStatement - Projected income statements with EBIT and depreciation
 * @param depreciationSchedule - PPE schedule containing CapEx amounts
 * @returns Array of cash flow rows showing UFCF calculation for each year
 */
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

/**
 * Calculates the Discounted Cash Flow (DCF) valuation and implied share price.
 *
 * DCF Methodology:
 * 1. Calculate Present Value of each year's Unlevered FCF using discount factors
 * 2. Calculate Terminal Value using Gordon Growth Model:
 *    TV = FCF(final) × (1 + g) / (WACC - g)
 * 3. Discount Terminal Value to present
 * 4. Enterprise Value = Sum(PV of UFCFs) + PV of Terminal Value
 * 5. Equity Value = Enterprise Value - Net Debt
 * 6. Implied Share Price = Equity Value / Shares Outstanding
 *
 * @param cashFlows - Projected cash flows containing Unlevered FCF for each year
 * @param wacc - Weighted Average Cost of Capital as percentage (e.g., 10 for 10%)
 * @param terminalGrowthRate - Perpetual growth rate as percentage (e.g., 2.5 for 2.5%)
 * @param netDebt - Net debt (Total Debt - Cash) to subtract from enterprise value
 * @param sharesOutstanding - Diluted shares outstanding
 * @returns Complete valuation result with all intermediate calculations
 *
 * @example
 * calculateValuation(cashFlows, 10, 2.5, 200000000, 100000000)
 * // Returns full valuation breakdown including implied share price
 */
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

/**
 * Master calculation function that orchestrates the entire DCF model.
 *
 * Executes all calculations in the correct order:
 * 1. Revenue projections
 * 2. Depreciation schedule (for Income Statement)
 * 3. Debt schedule (for Interest Expense)
 * 4. Income Statement
 * 5. Balance Sheet
 * 6. Cash Flow Statement with Unlevered FCF
 * 7. DCF Valuation with implied share price
 *
 * @param assumptions - Complete set of DCF model assumptions
 * @returns Object containing all financial statement projections and valuation
 */
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

/**
 * Formats a number as currency with optional compact notation.
 *
 * Compact mode uses suffixes for large numbers:
 * - Billions: $1.50B
 * - Millions: $42.15M
 * - Thousands: $500.00K
 *
 * Non-compact mode uses full USD formatting with no decimals.
 *
 * @param value - The numeric value to format
 * @param compact - Use compact notation (B/M/K) for large numbers (default: true)
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1500000000) // "$1.50B"
 * formatCurrency(42150000) // "$42.15M"
 * formatCurrency(1500, false) // "$1,500"
 */
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

/**
 * Formats a number as a percentage with specified decimal places.
 *
 * @param value - The numeric value to format (e.g., 10.5 for 10.5%)
 * @param decimals - Number of decimal places to show (default: 1)
 * @returns Formatted percentage string with % symbol
 *
 * @example
 * formatPercent(10.5) // "10.5%"
 * formatPercent(8.333, 2) // "8.33%"
 */
export function formatPercent(value: number, decimals = 1): string {
    return `${value.toFixed(decimals)}%`;
}

/**
 * Formats a number with comma separators for readability.
 *
 * Rounds to the nearest integer before formatting.
 *
 * @param value - The numeric value to format
 * @returns Formatted number string with comma separators
 *
 * @example
 * formatNumber(1000000) // "1,000,000"
 * formatNumber(42150.75) // "42,151"
 */
export function formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
}
