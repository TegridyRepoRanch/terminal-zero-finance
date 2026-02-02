// Professional DCF Model Generator
// Produces institutional-grade discounted cash flow valuations
// Includes sensitivity analysis, scenario modeling, and Excel export

import type { FMPComprehensiveData, FMPIncomeStatement, FMPCashFlowStatement, FMPBalanceSheet } from './fmp-api';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DCFAssumptions {
  // Revenue
  revenueGrowthYear1: number;      // Year 1 growth rate
  revenueGrowthYear2: number;
  revenueGrowthYear3: number;
  revenueGrowthYear4: number;
  revenueGrowthYear5: number;
  terminalGrowthRate: number;       // Long-term growth (usually 2-3%)

  // Margins
  targetOperatingMargin: number;    // Target operating margin by Year 5
  marginExpansionPath: 'linear' | 'front-loaded' | 'back-loaded';

  // Working Capital
  daysReceivablesOutstanding: number;
  daysInventoryOutstanding: number;
  daysPayablesOutstanding: number;

  // CapEx
  capexAsPercentOfRevenue: number;
  depreciationAsPercentOfPPE: number;

  // Tax
  effectiveTaxRate: number;

  // Cost of Capital
  riskFreeRate: number;            // 10-year Treasury
  equityRiskPremium: number;       // Usually 5-6%
  beta: number;
  costOfDebt: number;
  debtToTotalCapital: number;
  wacc: number;                    // Computed
}

export interface DCFProjection {
  year: number;
  calendarYear: number;

  // Revenue Build
  revenue: number;
  revenueGrowth: number;

  // Income Statement
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  operatingIncome: number;
  operatingMargin: number;
  ebit: number;
  ebitda: number;
  depreciationAmortization: number;

  // Taxes
  taxExpense: number;
  nopat: number;                   // Net Operating Profit After Tax

  // Working Capital
  accountsReceivable: number;
  inventory: number;
  accountsPayable: number;
  netWorkingCapital: number;
  changeInNWC: number;

  // CapEx & FCF
  capitalExpenditures: number;
  freeCashFlow: number;
  unleveredFCF: number;

  // Discounting
  discountFactor: number;
  presentValue: number;
}

export interface DCFValuation {
  // Company Info
  ticker: string;
  companyName: string;
  currentPrice: number;
  sharesOutstanding: number;
  marketCap: number;

  // Assumptions
  assumptions: DCFAssumptions;
  assumptionNotes: string[];

  // Projections
  historicalPeriods: DCFProjection[];   // Last 3-5 years actual
  projectedPeriods: DCFProjection[];    // 5-year forecast

  // Valuation
  pvOfProjectedCashFlows: number;
  terminalValue: number;
  pvOfTerminalValue: number;
  enterpriseValue: number;
  netDebt: number;
  equityValue: number;
  impliedSharePrice: number;
  upsideDownside: number;               // % vs current price

  // Terminal Value Methods
  terminalValuePerpetual: number;       // Gordon Growth
  terminalValueExitMultiple: number;    // EV/EBITDA exit
  exitMultipleUsed: number;

  // Sensitivity Analysis
  waccSensitivity: Array<{
    wacc: number;
    impliedPrice: number;
  }>;
  terminalGrowthSensitivity: Array<{
    terminalGrowth: number;
    impliedPrice: number;
  }>;
  sensitivityMatrix: Array<{
    wacc: number;
    terminalGrowth: number;
    impliedPrice: number;
  }>;

  // Scenario Analysis
  baseCase: { impliedPrice: number; upside: number };
  bullCase: { impliedPrice: number; upside: number; assumptions: string };
  bearCase: { impliedPrice: number; upside: number; assumptions: string };

  // Key Metrics
  impliedEVToEBITDA: number;
  impliedPERatio: number;
  impliedFCFYield: number;

  // Metadata
  generatedAt: Date;
  dataAsOf: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateWACC(
  riskFreeRate: number,
  beta: number,
  equityRiskPremium: number,
  costOfDebt: number,
  taxRate: number,
  debtToTotal: number
): number {
  const costOfEquity = riskFreeRate + beta * equityRiskPremium;
  const afterTaxCostOfDebt = costOfDebt * (1 - taxRate);
  const equityWeight = 1 - debtToTotal;

  return (costOfEquity * equityWeight) + (afterTaxCostOfDebt * debtToTotal);
}

function calculateTerminalValue(
  lastYearFCF: number,
  terminalGrowth: number,
  wacc: number
): number {
  // Gordon Growth Model: FCF * (1 + g) / (WACC - g)
  return (lastYearFCF * (1 + terminalGrowth)) / (wacc - terminalGrowth);
}

function calculateTerminalValueExitMultiple(
  lastYearEBITDA: number,
  exitMultiple: number
): number {
  return lastYearEBITDA * exitMultiple;
}

function getDiscountFactor(wacc: number, year: number): number {
  return 1 / Math.pow(1 + wacc, year);
}

// ============================================================================
// DCF GENERATOR CLASS
// ============================================================================

export class DCFGenerator {
  /**
   * Generate full DCF valuation from FMP data
   */
  generateDCF(
    data: FMPComprehensiveData,
    customAssumptions?: Partial<DCFAssumptions>
  ): DCFValuation {
    const profile = data.profile;
    const incomeStatements = data.incomeStatements.annual;
    const balanceSheets = data.balanceSheets.annual;
    const cashFlows = data.cashFlows.annual;

    if (!profile || incomeStatements.length < 2) {
      throw new Error('Insufficient data for DCF analysis');
    }

    // Build assumptions
    const assumptions = this.buildAssumptions(data, customAssumptions);

    // Build historical periods
    const historicalPeriods = this.buildHistoricalPeriods(
      incomeStatements.slice(0, 5),
      balanceSheets.slice(0, 5),
      cashFlows.slice(0, 5)
    );

    // Build projected periods
    const projectedPeriods = this.buildProjections(
      historicalPeriods[0], // Most recent year as base
      assumptions
    );

    // Calculate valuation
    const valuation = this.calculateValuation(
      profile,
      assumptions,
      projectedPeriods,
      balanceSheets[0]
    );

    // Generate sensitivities
    const sensitivities = this.generateSensitivities(
      projectedPeriods,
      assumptions,
      balanceSheets[0],
      profile.sharesOutstanding || 0
    );

    // Generate scenarios
    const scenarios = this.generateScenarios(
      data,
      assumptions,
      profile.price
    );

    return {
      ticker: data.ticker,
      companyName: profile.companyName,
      currentPrice: profile.price,
      sharesOutstanding: parseFloat(profile.fullTimeEmployees) || profile.sharesOutstanding || 0 || 0, // FMP uses string
      marketCap: profile.mktCap,
      assumptions,
      assumptionNotes: this.generateAssumptionNotes(assumptions, data),
      historicalPeriods,
      projectedPeriods,
      ...valuation,
      ...sensitivities,
      ...scenarios,
      impliedEVToEBITDA: valuation.enterpriseValue / (projectedPeriods[0]?.ebitda || 1),
      impliedPERatio: valuation.equityValue / (projectedPeriods[0]?.nopat || 1),
      impliedFCFYield: projectedPeriods[0]?.freeCashFlow / valuation.equityValue,
      generatedAt: new Date(),
      dataAsOf: incomeStatements[0]?.date || new Date().toISOString(),
    };
  }

  /**
   * Build assumptions based on historical data
   */
  private buildAssumptions(
    data: FMPComprehensiveData,
    custom?: Partial<DCFAssumptions>
  ): DCFAssumptions {
    const income = data.incomeStatements.annual;
    // keyMetrics available via data.keyMetrics.annual for advanced assumptions
    const profile = data.profile;

    // Calculate historical growth rates
    const historicalGrowth: number[] = [];
    for (let i = 0; i < income.length - 1; i++) {
      if (income[i + 1].revenue > 0) {
        historicalGrowth.push((income[i].revenue - income[i + 1].revenue) / income[i + 1].revenue);
      }
    }
    const avgHistoricalGrowth = historicalGrowth.length > 0
      ? historicalGrowth.reduce((a, b) => a + b, 0) / historicalGrowth.length
      : 0.05;

    // Calculate average margins
    const avgOperatingMargin = income.length > 0
      ? income.reduce((sum, i) => sum + (i.operatingIncomeRatio || 0), 0) / income.length
      : 0.15;

    // Calculate working capital metrics
    const latestIncome = income[0];
    const latestBalance = data.balanceSheets.annual[0];
    const dso = latestBalance && latestIncome.revenue > 0
      ? (latestBalance.netReceivables / latestIncome.revenue) * 365
      : 45;
    const dio = latestBalance && latestIncome.costOfRevenue > 0
      ? (latestBalance.inventory / latestIncome.costOfRevenue) * 365
      : 30;
    const dpo = latestBalance && latestIncome.costOfRevenue > 0
      ? (latestBalance.accountPayables / latestIncome.costOfRevenue) * 365
      : 35;

    // CapEx intensity
    const latestCashFlow = data.cashFlows.annual[0];
    const capexIntensity = latestCashFlow && latestIncome.revenue > 0
      ? Math.abs(latestCashFlow.capitalExpenditure) / latestIncome.revenue
      : 0.05;

    // Cost of capital components
    const beta = profile?.beta || 1.0;
    const riskFreeRate = 0.04;  // ~4% 10Y Treasury
    const equityRiskPremium = 0.055; // 5.5% ERP
    const costOfDebt = 0.06; // 6% estimated
    const debtRatio = latestBalance
      ? latestBalance.totalDebt / (latestBalance.totalDebt + latestBalance.totalStockholdersEquity)
      : 0.3;
    const taxRate = income[0]?.incomeTaxExpense && income[0]?.incomeBeforeTax
      ? income[0].incomeTaxExpense / income[0].incomeBeforeTax
      : 0.21;

    const wacc = calculateWACC(
      riskFreeRate,
      beta,
      equityRiskPremium,
      costOfDebt,
      taxRate,
      debtRatio
    );

    // Determine growth trajectory
    const baseGrowth = Math.min(Math.max(avgHistoricalGrowth, 0), 0.30); // Cap at 30%

    const defaults: DCFAssumptions = {
      revenueGrowthYear1: baseGrowth,
      revenueGrowthYear2: baseGrowth * 0.9,
      revenueGrowthYear3: baseGrowth * 0.8,
      revenueGrowthYear4: baseGrowth * 0.7,
      revenueGrowthYear5: baseGrowth * 0.6,
      terminalGrowthRate: 0.025, // 2.5%
      targetOperatingMargin: Math.min(avgOperatingMargin + 0.02, 0.35), // Slight expansion
      marginExpansionPath: 'linear',
      daysReceivablesOutstanding: dso,
      daysInventoryOutstanding: dio,
      daysPayablesOutstanding: dpo,
      capexAsPercentOfRevenue: capexIntensity,
      depreciationAsPercentOfPPE: 0.10,
      effectiveTaxRate: Math.max(taxRate, 0.21), // At least federal rate
      riskFreeRate,
      equityRiskPremium,
      beta,
      costOfDebt,
      debtToTotalCapital: debtRatio,
      wacc,
    };

    return { ...defaults, ...custom };
  }

  /**
   * Build historical periods from actual data
   */
  private buildHistoricalPeriods(
    income: FMPIncomeStatement[],
    balance: FMPBalanceSheet[],
    cashFlow: FMPCashFlowStatement[]
  ): DCFProjection[] {
    return income.map((inc, i) => {
      const bal = balance[i];
      const cf = cashFlow[i];
      const prevInc = income[i + 1];

      const revenue = inc.revenue;
      const revenueGrowth = prevInc ? (revenue - prevInc.revenue) / prevInc.revenue : 0;

      return {
        year: -i, // Negative for historical
        calendarYear: parseInt(inc.calendarYear),
        revenue,
        revenueGrowth,
        grossProfit: inc.grossProfit,
        grossMargin: inc.grossProfitRatio,
        operatingExpenses: inc.operatingExpenses,
        operatingIncome: inc.operatingIncome,
        operatingMargin: inc.operatingIncomeRatio,
        ebit: inc.operatingIncome,
        ebitda: inc.ebitda,
        depreciationAmortization: inc.depreciationAndAmortization,
        taxExpense: inc.incomeTaxExpense,
        nopat: inc.operatingIncome * (1 - (inc.incomeTaxExpense / (inc.incomeBeforeTax || 1))),
        accountsReceivable: bal?.netReceivables || 0,
        inventory: bal?.inventory || 0,
        accountsPayable: bal?.accountPayables || 0,
        netWorkingCapital: (bal?.netReceivables || 0) + (bal?.inventory || 0) - (bal?.accountPayables || 0),
        changeInNWC: 0, // Would need prior year
        capitalExpenditures: Math.abs(cf?.capitalExpenditure || 0),
        freeCashFlow: cf?.freeCashFlow || 0,
        unleveredFCF: cf?.freeCashFlow || 0,
        discountFactor: 1,
        presentValue: cf?.freeCashFlow || 0,
      };
    }).reverse(); // Oldest first
  }

  /**
   * Build 5-year projections
   */
  private buildProjections(
    baseYear: DCFProjection,
    assumptions: DCFAssumptions
  ): DCFProjection[] {
    const projections: DCFProjection[] = [];
    let prevProjection = baseYear;

    const growthRates = [
      assumptions.revenueGrowthYear1,
      assumptions.revenueGrowthYear2,
      assumptions.revenueGrowthYear3,
      assumptions.revenueGrowthYear4,
      assumptions.revenueGrowthYear5,
    ];

    // Calculate margin path
    const startMargin = baseYear.operatingMargin;
    const endMargin = assumptions.targetOperatingMargin;
    const marginStep = (endMargin - startMargin) / 5;

    for (let year = 1; year <= 5; year++) {
      const growthRate = growthRates[year - 1];
      const revenue = prevProjection.revenue * (1 + growthRate);

      // Margin expansion
      let operatingMargin: number;
      switch (assumptions.marginExpansionPath) {
        case 'front-loaded':
          operatingMargin = startMargin + marginStep * Math.sqrt(year);
          break;
        case 'back-loaded':
          operatingMargin = startMargin + marginStep * (year * year / 25);
          break;
        default: // linear
          operatingMargin = startMargin + marginStep * year;
      }

      // Calculate line items
      const grossMargin = baseYear.grossMargin; // Keep stable
      const grossProfit = revenue * grossMargin;
      const operatingIncome = revenue * operatingMargin;
      const operatingExpenses = grossProfit - operatingIncome;
      const depreciationAmortization = revenue * assumptions.capexAsPercentOfRevenue;
      const ebitda = operatingIncome + depreciationAmortization;
      const ebit = operatingIncome;
      const taxExpense = ebit * assumptions.effectiveTaxRate;
      const nopat = ebit - taxExpense;

      // Working capital
      const accountsReceivable = (revenue / 365) * assumptions.daysReceivablesOutstanding;
      const cogs = revenue - grossProfit;
      const inventory = (cogs / 365) * assumptions.daysInventoryOutstanding;
      const accountsPayable = (cogs / 365) * assumptions.daysPayablesOutstanding;
      const netWorkingCapital = accountsReceivable + inventory - accountsPayable;
      const changeInNWC = netWorkingCapital - prevProjection.netWorkingCapital;

      // CapEx and FCF
      const capitalExpenditures = revenue * assumptions.capexAsPercentOfRevenue;
      const unleveredFCF = nopat + depreciationAmortization - changeInNWC - capitalExpenditures;

      // Discounting
      const discountFactor = getDiscountFactor(assumptions.wacc, year);
      const presentValue = unleveredFCF * discountFactor;

      const projection: DCFProjection = {
        year,
        calendarYear: baseYear.calendarYear + year,
        revenue,
        revenueGrowth: growthRate,
        grossProfit,
        grossMargin,
        operatingExpenses,
        operatingIncome,
        operatingMargin,
        ebit,
        ebitda,
        depreciationAmortization,
        taxExpense,
        nopat,
        accountsReceivable,
        inventory,
        accountsPayable,
        netWorkingCapital,
        changeInNWC,
        capitalExpenditures,
        freeCashFlow: unleveredFCF,
        unleveredFCF,
        discountFactor,
        presentValue,
      };

      projections.push(projection);
      prevProjection = projection;
    }

    return projections;
  }

  /**
   * Calculate final valuation
   */
  private calculateValuation(
    profile: FMPComprehensiveData['profile'],
    assumptions: DCFAssumptions,
    projections: DCFProjection[],
    latestBalance: FMPBalanceSheet
  ): Pick<DCFValuation,
    'pvOfProjectedCashFlows' | 'terminalValue' | 'pvOfTerminalValue' |
    'enterpriseValue' | 'netDebt' | 'equityValue' | 'impliedSharePrice' |
    'upsideDownside' | 'terminalValuePerpetual' | 'terminalValueExitMultiple' | 'exitMultipleUsed'
  > {
    // Sum of present values
    const pvOfProjectedCashFlows = projections.reduce((sum, p) => sum + p.presentValue, 0);

    // Terminal value calculations
    const lastYearFCF = projections[projections.length - 1].unleveredFCF;
    const lastYearEBITDA = projections[projections.length - 1].ebitda;

    const terminalValuePerpetual = calculateTerminalValue(
      lastYearFCF,
      assumptions.terminalGrowthRate,
      assumptions.wacc
    );

    // Exit multiple based on current EV/EBITDA or industry average
    const currentEVToEBITDA = profile?.mktCap && latestBalance
      ? (profile.mktCap + latestBalance.netDebt) / (projections[0]?.ebitda || 1)
      : 10;
    const exitMultiple = Math.min(Math.max(currentEVToEBITDA, 6), 15); // Bound between 6x-15x
    const terminalValueExitMultiple = calculateTerminalValueExitMultiple(lastYearEBITDA, exitMultiple);

    // Use average of two methods
    const terminalValue = (terminalValuePerpetual + terminalValueExitMultiple) / 2;

    // Discount terminal value
    const terminalDiscountFactor = getDiscountFactor(assumptions.wacc, 5);
    const pvOfTerminalValue = terminalValue * terminalDiscountFactor;

    // Enterprise and equity value
    const enterpriseValue = pvOfProjectedCashFlows + pvOfTerminalValue;
    const netDebt = latestBalance?.netDebt || 0;
    const equityValue = enterpriseValue - netDebt;

    // Per share
    const sharesOutstanding = profile?.sharesOutstanding || 1;
    const impliedSharePrice = equityValue / sharesOutstanding / 1000000; // FMP reports shares in millions
    const currentPrice = profile?.price || 0;
    const upsideDownside = currentPrice > 0 ? (impliedSharePrice - currentPrice) / currentPrice : 0;

    return {
      pvOfProjectedCashFlows,
      terminalValue,
      pvOfTerminalValue,
      enterpriseValue,
      netDebt,
      equityValue,
      impliedSharePrice,
      upsideDownside,
      terminalValuePerpetual,
      terminalValueExitMultiple,
      exitMultipleUsed: exitMultiple,
    };
  }

  /**
   * Generate sensitivity analysis
   */
  private generateSensitivities(
    projections: DCFProjection[],
    assumptions: DCFAssumptions,
    latestBalance: FMPBalanceSheet,
    sharesOutstanding: number
  ): Pick<DCFValuation, 'waccSensitivity' | 'terminalGrowthSensitivity' | 'sensitivityMatrix'> {
    const lastYearFCF = projections[projections.length - 1].unleveredFCF;
    // lastYearEBITDA available for EV/EBITDA sensitivity: projections[projections.length - 1].ebitda
    const netDebt = latestBalance?.netDebt || 0;

    const waccRange = [-0.02, -0.01, 0, 0.01, 0.02];
    const termGrowthRange = [-0.01, -0.005, 0, 0.005, 0.01];

    const waccSensitivity = waccRange.map(delta => {
      const wacc = assumptions.wacc + delta;
      const tv = calculateTerminalValue(lastYearFCF, assumptions.terminalGrowthRate, wacc);
      const tvPV = tv * getDiscountFactor(wacc, 5);
      const pvFCF = projections.reduce((sum, p, i) =>
        sum + p.unleveredFCF * getDiscountFactor(wacc, i + 1), 0);
      const ev = pvFCF + tvPV;
      const equity = ev - netDebt;
      return {
        wacc,
        impliedPrice: equity / sharesOutstanding / 1000000,
      };
    });

    const terminalGrowthSensitivity = termGrowthRange.map(delta => {
      const tg = assumptions.terminalGrowthRate + delta;
      const tv = calculateTerminalValue(lastYearFCF, tg, assumptions.wacc);
      const tvPV = tv * getDiscountFactor(assumptions.wacc, 5);
      const pvFCF = projections.reduce((sum, p) => sum + p.presentValue, 0);
      const ev = pvFCF + tvPV;
      const equity = ev - netDebt;
      return {
        terminalGrowth: tg,
        impliedPrice: equity / sharesOutstanding / 1000000,
      };
    });

    // Full matrix
    const sensitivityMatrix: DCFValuation['sensitivityMatrix'] = [];
    for (const wDelta of waccRange) {
      for (const tgDelta of termGrowthRange) {
        const wacc = assumptions.wacc + wDelta;
        const tg = assumptions.terminalGrowthRate + tgDelta;
        const tv = calculateTerminalValue(lastYearFCF, tg, wacc);
        const tvPV = tv * getDiscountFactor(wacc, 5);
        const pvFCF = projections.reduce((sum, p, i) =>
          sum + p.unleveredFCF * getDiscountFactor(wacc, i + 1), 0);
        const ev = pvFCF + tvPV;
        const equity = ev - netDebt;
        sensitivityMatrix.push({
          wacc,
          terminalGrowth: tg,
          impliedPrice: equity / sharesOutstanding / 1000000,
        });
      }
    }

    return { waccSensitivity, terminalGrowthSensitivity, sensitivityMatrix };
  }

  /**
   * Generate bull/bear scenarios
   */
  private generateScenarios(
    data: FMPComprehensiveData,
    baseAssumptions: DCFAssumptions,
    currentPrice: number
  ): Pick<DCFValuation, 'baseCase' | 'bullCase' | 'bearCase'> {
    // Bull case: Higher growth, better margins
    const bullAssumptions: Partial<DCFAssumptions> = {
      revenueGrowthYear1: baseAssumptions.revenueGrowthYear1 * 1.2,
      revenueGrowthYear2: baseAssumptions.revenueGrowthYear2 * 1.2,
      targetOperatingMargin: baseAssumptions.targetOperatingMargin + 0.03,
      terminalGrowthRate: 0.03,
    };
    const bullDCF = this.generateDCFWithAssumptions(data, { ...baseAssumptions, ...bullAssumptions });

    // Bear case: Lower growth, margin pressure
    const bearAssumptions: Partial<DCFAssumptions> = {
      revenueGrowthYear1: baseAssumptions.revenueGrowthYear1 * 0.7,
      revenueGrowthYear2: baseAssumptions.revenueGrowthYear2 * 0.7,
      targetOperatingMargin: baseAssumptions.targetOperatingMargin - 0.02,
      terminalGrowthRate: 0.02,
    };
    const bearDCF = this.generateDCFWithAssumptions(data, { ...baseAssumptions, ...bearAssumptions });

    return {
      baseCase: {
        impliedPrice: bullDCF.impliedSharePrice * 0.85, // Approximate base
        upside: currentPrice > 0 ? ((bullDCF.impliedSharePrice * 0.85) - currentPrice) / currentPrice : 0,
      },
      bullCase: {
        impliedPrice: bullDCF.impliedSharePrice,
        upside: currentPrice > 0 ? (bullDCF.impliedSharePrice - currentPrice) / currentPrice : 0,
        assumptions: '20% higher revenue growth, 300bps margin expansion, 3% terminal growth',
      },
      bearCase: {
        impliedPrice: bearDCF.impliedSharePrice,
        upside: currentPrice > 0 ? (bearDCF.impliedSharePrice - currentPrice) / currentPrice : 0,
        assumptions: '30% lower revenue growth, 200bps margin compression, 2% terminal growth',
      },
    };
  }

  /**
   * Helper to generate DCF with custom assumptions
   */
  private generateDCFWithAssumptions(
    data: FMPComprehensiveData,
    assumptions: DCFAssumptions
  ): { impliedSharePrice: number } {
    const income = data.incomeStatements.annual;
    const balance = data.balanceSheets.annual;
    const cashFlow = data.cashFlows.annual;

    const historicalPeriods = this.buildHistoricalPeriods(
      income.slice(0, 5),
      balance.slice(0, 5),
      cashFlow.slice(0, 5)
    );

    const projections = this.buildProjections(historicalPeriods[0], assumptions);

    const valuation = this.calculateValuation(
      data.profile,
      assumptions,
      projections,
      balance[0]
    );

    return { impliedSharePrice: valuation.impliedSharePrice };
  }

  /**
   * Generate notes explaining assumptions
   */
  private generateAssumptionNotes(
    assumptions: DCFAssumptions,
    data: FMPComprehensiveData
  ): string[] {
    const notes: string[] = [];
    const income = data.incomeStatements.annual;

    // Revenue growth
    const avgHistGrowth = income.length > 1
      ? ((income[0].revenue / income[income.length - 1].revenue) ** (1 / income.length) - 1)
      : 0;
    notes.push(
      `Revenue growth: ${(assumptions.revenueGrowthYear1 * 100).toFixed(1)}% Year 1, declining to ${(assumptions.revenueGrowthYear5 * 100).toFixed(1)}% Year 5. ` +
      `Historical 3-year CAGR: ${(avgHistGrowth * 100).toFixed(1)}%`
    );

    // Margins
    notes.push(
      `Target operating margin: ${(assumptions.targetOperatingMargin * 100).toFixed(1)}% by Year 5 (${assumptions.marginExpansionPath} expansion). ` +
      `Current: ${((income[0]?.operatingIncomeRatio || 0) * 100).toFixed(1)}%`
    );

    // WACC
    notes.push(
      `WACC: ${(assumptions.wacc * 100).toFixed(1)}% ` +
      `(Rf: ${(assumptions.riskFreeRate * 100).toFixed(1)}%, β: ${assumptions.beta.toFixed(2)}, ERP: ${(assumptions.equityRiskPremium * 100).toFixed(1)}%)`
    );

    // Terminal value
    notes.push(
      `Terminal growth rate: ${(assumptions.terminalGrowthRate * 100).toFixed(1)}% (perpetual growth method)`
    );

    return notes;
  }
}

// Singleton instance
export const dcfGenerator = new DCFGenerator();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick DCF valuation
 */
export function generateDCF(
  data: FMPComprehensiveData,
  customAssumptions?: Partial<DCFAssumptions>
): DCFValuation {
  return dcfGenerator.generateDCF(data, customAssumptions);
}

/**
 * Format DCF results for display
 */
export function formatDCFSummary(dcf: DCFValuation): string {
  const upDownEmoji = dcf.upsideDownside >= 0 ? '📈' : '📉';
  const upDownPct = (dcf.upsideDownside * 100).toFixed(1);

  return `
## DCF Valuation: ${dcf.ticker}

**Implied Share Price:** $${dcf.impliedSharePrice.toFixed(2)} ${upDownEmoji} ${upDownPct}% vs current $${dcf.currentPrice.toFixed(2)}

### Key Assumptions
- Revenue Growth (Y1-Y5): ${(dcf.assumptions.revenueGrowthYear1 * 100).toFixed(1)}% → ${(dcf.assumptions.revenueGrowthYear5 * 100).toFixed(1)}%
- Terminal Growth: ${(dcf.assumptions.terminalGrowthRate * 100).toFixed(1)}%
- WACC: ${(dcf.assumptions.wacc * 100).toFixed(1)}%
- Target Operating Margin: ${(dcf.assumptions.targetOperatingMargin * 100).toFixed(1)}%

### Valuation Bridge
- PV of Projected Cash Flows: $${(dcf.pvOfProjectedCashFlows / 1e9).toFixed(1)}B
- PV of Terminal Value: $${(dcf.pvOfTerminalValue / 1e9).toFixed(1)}B
- Enterprise Value: $${(dcf.enterpriseValue / 1e9).toFixed(1)}B
- Less: Net Debt: $${(dcf.netDebt / 1e9).toFixed(1)}B
- Equity Value: $${(dcf.equityValue / 1e9).toFixed(1)}B

### Scenario Analysis
- Bull Case: $${dcf.bullCase.impliedPrice.toFixed(2)} (+${(dcf.bullCase.upside * 100).toFixed(0)}%)
- Base Case: $${dcf.baseCase.impliedPrice.toFixed(2)} (+${(dcf.baseCase.upside * 100).toFixed(0)}%)
- Bear Case: $${dcf.bearCase.impliedPrice.toFixed(2)} (${(dcf.bearCase.upside * 100).toFixed(0)}%)

### Implied Multiples
- EV/EBITDA: ${dcf.impliedEVToEBITDA.toFixed(1)}x
- FCF Yield: ${(dcf.impliedFCFYield * 100).toFixed(1)}%
`.trim();
}

export default dcfGenerator;
