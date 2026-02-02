// Alpha Vantage API Service
// Provides historical financial statements with 20+ years of data
// API Docs: https://www.alphavantage.co/documentation/

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// API key from environment
const ALPHA_VANTAGE_API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || '';

// Common interfaces for Alpha Vantage responses
export interface AVIncomeStatement {
  fiscalDateEnding: string;
  reportedCurrency: string;
  grossProfit: string;
  totalRevenue: string;
  costOfRevenue: string;
  costofGoodsAndServicesSold: string;
  operatingIncome: string;
  sellingGeneralAndAdministrative: string;
  researchAndDevelopment: string;
  operatingExpenses: string;
  investmentIncomeNet: string;
  netInterestIncome: string;
  interestIncome: string;
  interestExpense: string;
  nonInterestIncome: string;
  otherNonOperatingIncome: string;
  depreciation: string;
  depreciationAndAmortization: string;
  incomeBeforeTax: string;
  incomeTaxExpense: string;
  interestAndDebtExpense: string;
  netIncomeFromContinuingOperations: string;
  comprehensiveIncomeNetOfTax: string;
  ebit: string;
  ebitda: string;
  netIncome: string;
}

export interface AVBalanceSheet {
  fiscalDateEnding: string;
  reportedCurrency: string;
  totalAssets: string;
  totalCurrentAssets: string;
  cashAndCashEquivalentsAtCarryingValue: string;
  cashAndShortTermInvestments: string;
  inventory: string;
  currentNetReceivables: string;
  totalNonCurrentAssets: string;
  propertyPlantEquipment: string;
  accumulatedDepreciationAmortizationPPE: string;
  intangibleAssets: string;
  intangibleAssetsExcludingGoodwill: string;
  goodwill: string;
  investments: string;
  longTermInvestments: string;
  shortTermInvestments: string;
  otherCurrentAssets: string;
  otherNonCurrentAssets: string;
  totalLiabilities: string;
  totalCurrentLiabilities: string;
  currentAccountsPayable: string;
  deferredRevenue: string;
  currentDebt: string;
  shortTermDebt: string;
  totalNonCurrentLiabilities: string;
  capitalLeaseObligations: string;
  longTermDebt: string;
  currentLongTermDebt: string;
  longTermDebtNoncurrent: string;
  shortLongTermDebtTotal: string;
  otherCurrentLiabilities: string;
  otherNonCurrentLiabilities: string;
  totalShareholderEquity: string;
  treasuryStock: string;
  retainedEarnings: string;
  commonStock: string;
  commonStockSharesOutstanding: string;
}

export interface AVCashFlow {
  fiscalDateEnding: string;
  reportedCurrency: string;
  operatingCashflow: string;
  paymentsForOperatingActivities: string;
  proceedsFromOperatingActivities: string;
  changeInOperatingLiabilities: string;
  changeInOperatingAssets: string;
  depreciationDepletionAndAmortization: string;
  capitalExpenditures: string;
  changeInReceivables: string;
  changeInInventory: string;
  profitLoss: string;
  cashflowFromInvestment: string;
  cashflowFromFinancing: string;
  proceedsFromRepaymentsOfShortTermDebt: string;
  paymentsForRepurchaseOfCommonStock: string;
  paymentsForRepurchaseOfEquity: string;
  paymentsForRepurchaseOfPreferredStock: string;
  dividendPayout: string;
  dividendPayoutCommonStock: string;
  dividendPayoutPreferredStock: string;
  proceedsFromIssuanceOfCommonStock: string;
  proceedsFromIssuanceOfLongTermDebtAndCapitalSecuritiesNet: string;
  proceedsFromIssuanceOfPreferredStock: string;
  proceedsFromRepurchaseOfEquity: string;
  proceedsFromSaleOfTreasuryStock: string;
  changeInCashAndCashEquivalents: string;
  changeInExchangeRate: string;
  netIncome: string;
}

export interface AVEarnings {
  annualEarnings: Array<{
    fiscalDateEnding: string;
    reportedEPS: string;
  }>;
  quarterlyEarnings: Array<{
    fiscalDateEnding: string;
    reportedDate: string;
    reportedEPS: string;
    estimatedEPS: string;
    surprise: string;
    surprisePercentage: string;
  }>;
}

export interface AVOverview {
  Symbol: string;
  AssetType: string;
  Name: string;
  Description: string;
  CIK: string;
  Exchange: string;
  Currency: string;
  Country: string;
  Sector: string;
  Industry: string;
  Address: string;
  FiscalYearEnd: string;
  LatestQuarter: string;
  MarketCapitalization: string;
  EBITDA: string;
  PERatio: string;
  PEGRatio: string;
  BookValue: string;
  DividendPerShare: string;
  DividendYield: string;
  EPS: string;
  RevenuePerShareTTM: string;
  ProfitMargin: string;
  OperatingMarginTTM: string;
  ReturnOnAssetsTTM: string;
  ReturnOnEquityTTM: string;
  RevenueTTM: string;
  GrossProfitTTM: string;
  DilutedEPSTTM: string;
  QuarterlyEarningsGrowthYOY: string;
  QuarterlyRevenueGrowthYOY: string;
  AnalystTargetPrice: string;
  TrailingPE: string;
  ForwardPE: string;
  PriceToSalesRatioTTM: string;
  PriceToBookRatio: string;
  EVToRevenue: string;
  EVToEBITDA: string;
  Beta: string;
  '52WeekHigh': string;
  '52WeekLow': string;
  '50DayMovingAverage': string;
  '200DayMovingAverage': string;
  SharesOutstanding: string;
  DividendDate: string;
  ExDividendDate: string;
}

/**
 * Check if Alpha Vantage API is configured
 */
export function isAlphaVantageConfigured(): boolean {
  return Boolean(ALPHA_VANTAGE_API_KEY);
}

/**
 * Make request to Alpha Vantage API
 */
async function alphaVantageRequest<T>(
  functionName: string,
  params: Record<string, string> = {}
): Promise<T> {
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error('Alpha Vantage API key not configured. Set VITE_ALPHA_VANTAGE_API_KEY in .env');
  }

  const url = new URL(ALPHA_VANTAGE_BASE_URL);
  url.searchParams.set('function', functionName);
  url.searchParams.set('apikey', ALPHA_VANTAGE_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  console.log(`[AlphaVantage] Fetching: ${functionName}`);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json();

  // Check for API-level errors
  if (data['Error Message']) {
    throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
  }

  if (data['Note']) {
    // Rate limit hit
    console.warn('[AlphaVantage] Rate limit warning:', data['Note']);
    throw new Error('Alpha Vantage rate limit reached. Please wait and try again.');
  }

  if (data['Information']) {
    // API key limit or other info
    console.warn('[AlphaVantage] Info:', data['Information']);
  }

  return data as T;
}

/**
 * Get company overview with key metrics
 */
export async function getCompanyOverview(ticker: string): Promise<AVOverview> {
  return alphaVantageRequest<AVOverview>('OVERVIEW', {
    symbol: ticker.toUpperCase(),
  });
}

/**
 * Get annual and quarterly income statements
 */
export async function getIncomeStatement(ticker: string): Promise<{
  symbol: string;
  annualReports: AVIncomeStatement[];
  quarterlyReports: AVIncomeStatement[];
}> {
  return alphaVantageRequest('INCOME_STATEMENT', {
    symbol: ticker.toUpperCase(),
  });
}

/**
 * Get annual and quarterly balance sheets
 */
export async function getBalanceSheet(ticker: string): Promise<{
  symbol: string;
  annualReports: AVBalanceSheet[];
  quarterlyReports: AVBalanceSheet[];
}> {
  return alphaVantageRequest('BALANCE_SHEET', {
    symbol: ticker.toUpperCase(),
  });
}

/**
 * Get annual and quarterly cash flow statements
 */
export async function getCashFlowStatement(ticker: string): Promise<{
  symbol: string;
  annualReports: AVCashFlow[];
  quarterlyReports: AVCashFlow[];
}> {
  return alphaVantageRequest('CASH_FLOW', {
    symbol: ticker.toUpperCase(),
  });
}

/**
 * Get earnings history
 */
export async function getEarnings(ticker: string): Promise<AVEarnings> {
  return alphaVantageRequest<AVEarnings>('EARNINGS', {
    symbol: ticker.toUpperCase(),
  });
}

/**
 * Parse string value to number, handling 'None' and empty strings
 */
function parseValue(value: string | undefined): number | null {
  if (!value || value === 'None' || value === '') {
    return null;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Normalized financial period data
 */
export interface NormalizedFinancialPeriod {
  periodEndDate: string;
  fiscalYear: number;
  fiscalQuarter?: number;
  periodType: 'annual' | 'quarterly';

  // Income Statement
  revenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingExpenses: number | null;
  sgaExpense: number | null;
  rdExpense: number | null;
  depreciationAmortization: number | null;
  operatingIncome: number | null;
  interestExpense: number | null;
  incomeBeforeTax: number | null;
  incomeTaxExpense: number | null;
  netIncome: number | null;
  ebit: number | null;
  ebitda: number | null;

  // Balance Sheet
  totalAssets: number | null;
  totalCurrentAssets: number | null;
  cashAndEquivalents: number | null;
  accountsReceivable: number | null;
  inventory: number | null;
  propertyPlantEquipment: number | null;
  goodwill: number | null;
  intangibleAssets: number | null;
  totalLiabilities: number | null;
  totalCurrentLiabilities: number | null;
  accountsPayable: number | null;
  shortTermDebt: number | null;
  longTermDebt: number | null;
  totalDebt: number | null;
  totalEquity: number | null;
  retainedEarnings: number | null;
  sharesOutstanding: number | null;

  // Cash Flow
  operatingCashFlow: number | null;
  capitalExpenditures: number | null;
  freeCashFlow: number | null;
  dividendsPaid: number | null;
}

/**
 * Fetch and normalize all historical financials for a company
 */
export async function fetchAllAlphaVantageData(ticker: string): Promise<{
  ticker: string;
  companyName: string;
  overview: Partial<AVOverview>;
  annualPeriods: NormalizedFinancialPeriod[];
  quarterlyPeriods: NormalizedFinancialPeriod[];
  source: 'alpha_vantage';
  fetchedAt: Date;
}> {
  const normalizedTicker = ticker.toUpperCase();
  console.log(`[AlphaVantage] Fetching all data for ${normalizedTicker}`);

  // Fetch all data in parallel (note: be careful of rate limits)
  const [overview, incomeStmt, balanceSheet, cashFlow] = await Promise.all([
    getCompanyOverview(normalizedTicker).catch(e => {
      console.warn('[AlphaVantage] Overview fetch failed:', e);
      return null;
    }),
    getIncomeStatement(normalizedTicker).catch(e => {
      console.warn('[AlphaVantage] Income statement fetch failed:', e);
      return null;
    }),
    getBalanceSheet(normalizedTicker).catch(e => {
      console.warn('[AlphaVantage] Balance sheet fetch failed:', e);
      return null;
    }),
    getCashFlowStatement(normalizedTicker).catch(e => {
      console.warn('[AlphaVantage] Cash flow fetch failed:', e);
      return null;
    }),
  ]);

  // Build period map for annual reports
  const annualPeriodMap = new Map<string, Partial<NormalizedFinancialPeriod>>();
  const quarterlyPeriodMap = new Map<string, Partial<NormalizedFinancialPeriod>>();

  // Process income statements
  if (incomeStmt) {
    for (const report of incomeStmt.annualReports || []) {
      const period = annualPeriodMap.get(report.fiscalDateEnding) || {
        periodEndDate: report.fiscalDateEnding,
        fiscalYear: new Date(report.fiscalDateEnding).getFullYear(),
        periodType: 'annual' as const,
      };
      period.revenue = parseValue(report.totalRevenue);
      period.costOfRevenue = parseValue(report.costOfRevenue) || parseValue(report.costofGoodsAndServicesSold);
      period.grossProfit = parseValue(report.grossProfit);
      period.operatingExpenses = parseValue(report.operatingExpenses);
      period.sgaExpense = parseValue(report.sellingGeneralAndAdministrative);
      period.rdExpense = parseValue(report.researchAndDevelopment);
      period.depreciationAmortization = parseValue(report.depreciationAndAmortization) || parseValue(report.depreciation);
      period.operatingIncome = parseValue(report.operatingIncome);
      period.interestExpense = parseValue(report.interestExpense) || parseValue(report.interestAndDebtExpense);
      period.incomeBeforeTax = parseValue(report.incomeBeforeTax);
      period.incomeTaxExpense = parseValue(report.incomeTaxExpense);
      period.netIncome = parseValue(report.netIncome);
      period.ebit = parseValue(report.ebit);
      period.ebitda = parseValue(report.ebitda);
      annualPeriodMap.set(report.fiscalDateEnding, period);
    }

    for (const report of incomeStmt.quarterlyReports || []) {
      const date = new Date(report.fiscalDateEnding);
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      const period = quarterlyPeriodMap.get(report.fiscalDateEnding) || {
        periodEndDate: report.fiscalDateEnding,
        fiscalYear: date.getFullYear(),
        fiscalQuarter: quarter,
        periodType: 'quarterly' as const,
      };
      period.revenue = parseValue(report.totalRevenue);
      period.costOfRevenue = parseValue(report.costOfRevenue) || parseValue(report.costofGoodsAndServicesSold);
      period.grossProfit = parseValue(report.grossProfit);
      period.operatingExpenses = parseValue(report.operatingExpenses);
      period.operatingIncome = parseValue(report.operatingIncome);
      period.netIncome = parseValue(report.netIncome);
      quarterlyPeriodMap.set(report.fiscalDateEnding, period);
    }
  }

  // Process balance sheets
  if (balanceSheet) {
    for (const report of balanceSheet.annualReports || []) {
      const period = annualPeriodMap.get(report.fiscalDateEnding) || {
        periodEndDate: report.fiscalDateEnding,
        fiscalYear: new Date(report.fiscalDateEnding).getFullYear(),
        periodType: 'annual' as const,
      };
      period.totalAssets = parseValue(report.totalAssets);
      period.totalCurrentAssets = parseValue(report.totalCurrentAssets);
      period.cashAndEquivalents = parseValue(report.cashAndCashEquivalentsAtCarryingValue) || parseValue(report.cashAndShortTermInvestments);
      period.accountsReceivable = parseValue(report.currentNetReceivables);
      period.inventory = parseValue(report.inventory);
      period.propertyPlantEquipment = parseValue(report.propertyPlantEquipment);
      period.goodwill = parseValue(report.goodwill);
      period.intangibleAssets = parseValue(report.intangibleAssets);
      period.totalLiabilities = parseValue(report.totalLiabilities);
      period.totalCurrentLiabilities = parseValue(report.totalCurrentLiabilities);
      period.accountsPayable = parseValue(report.currentAccountsPayable);
      period.shortTermDebt = parseValue(report.shortTermDebt) || parseValue(report.currentDebt);
      period.longTermDebt = parseValue(report.longTermDebt) || parseValue(report.longTermDebtNoncurrent);
      period.totalDebt = parseValue(report.shortLongTermDebtTotal);
      period.totalEquity = parseValue(report.totalShareholderEquity);
      period.retainedEarnings = parseValue(report.retainedEarnings);
      period.sharesOutstanding = parseValue(report.commonStockSharesOutstanding);
      annualPeriodMap.set(report.fiscalDateEnding, period);
    }

    for (const report of balanceSheet.quarterlyReports || []) {
      const date = new Date(report.fiscalDateEnding);
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      const period = quarterlyPeriodMap.get(report.fiscalDateEnding) || {
        periodEndDate: report.fiscalDateEnding,
        fiscalYear: date.getFullYear(),
        fiscalQuarter: quarter,
        periodType: 'quarterly' as const,
      };
      period.totalAssets = parseValue(report.totalAssets);
      period.totalCurrentAssets = parseValue(report.totalCurrentAssets);
      period.cashAndEquivalents = parseValue(report.cashAndCashEquivalentsAtCarryingValue);
      period.totalLiabilities = parseValue(report.totalLiabilities);
      period.totalEquity = parseValue(report.totalShareholderEquity);
      period.sharesOutstanding = parseValue(report.commonStockSharesOutstanding);
      quarterlyPeriodMap.set(report.fiscalDateEnding, period);
    }
  }

  // Process cash flow statements
  if (cashFlow) {
    for (const report of cashFlow.annualReports || []) {
      const period = annualPeriodMap.get(report.fiscalDateEnding);
      if (period) {
        period.operatingCashFlow = parseValue(report.operatingCashflow);
        period.capitalExpenditures = parseValue(report.capitalExpenditures);
        const ocf = period.operatingCashFlow || 0;
        const capex = Math.abs(period.capitalExpenditures || 0);
        period.freeCashFlow = ocf - capex;
        period.dividendsPaid = parseValue(report.dividendPayout) || parseValue(report.dividendPayoutCommonStock);
      }
    }

    for (const report of cashFlow.quarterlyReports || []) {
      const period = quarterlyPeriodMap.get(report.fiscalDateEnding);
      if (period) {
        period.operatingCashFlow = parseValue(report.operatingCashflow);
        period.capitalExpenditures = parseValue(report.capitalExpenditures);
        const ocf = period.operatingCashFlow || 0;
        const capex = Math.abs(period.capitalExpenditures || 0);
        period.freeCashFlow = ocf - capex;
      }
    }
  }

  // Convert maps to arrays and sort by date (newest first)
  const annualPeriods = Array.from(annualPeriodMap.values())
    .sort((a, b) => b.periodEndDate!.localeCompare(a.periodEndDate!)) as NormalizedFinancialPeriod[];

  const quarterlyPeriods = Array.from(quarterlyPeriodMap.values())
    .sort((a, b) => b.periodEndDate!.localeCompare(a.periodEndDate!)) as NormalizedFinancialPeriod[];

  console.log(`[AlphaVantage] Normalized ${annualPeriods.length} annual and ${quarterlyPeriods.length} quarterly periods`);

  return {
    ticker: normalizedTicker,
    companyName: overview?.Name || normalizedTicker,
    overview: overview || {},
    annualPeriods,
    quarterlyPeriods,
    source: 'alpha_vantage',
    fetchedAt: new Date(),
  };
}

// Rate limit tracking (Alpha Vantage free tier: 25 calls/day, 5 calls/minute)
let dailyCallCount = 0;
let minuteCallCount = 0;
let dayStart = Date.now();
let minuteStart = Date.now();
const DAILY_LIMIT = 25;
const MINUTE_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/**
 * Check if we're within rate limits
 */
export function checkRateLimit(): { allowed: boolean; retryAfter?: number; limitType?: 'daily' | 'minute' } {
  const now = Date.now();

  // Reset daily counter
  if (now - dayStart > DAY_MS) {
    dailyCallCount = 0;
    dayStart = now;
  }

  // Reset minute counter
  if (now - minuteStart > MINUTE_MS) {
    minuteCallCount = 0;
    minuteStart = now;
  }

  // Check daily limit
  if (dailyCallCount >= DAILY_LIMIT) {
    const retryAfter = DAY_MS - (now - dayStart);
    return { allowed: false, retryAfter, limitType: 'daily' };
  }

  // Check minute limit
  if (minuteCallCount >= MINUTE_LIMIT) {
    const retryAfter = MINUTE_MS - (now - minuteStart);
    return { allowed: false, retryAfter, limitType: 'minute' };
  }

  dailyCallCount++;
  minuteCallCount++;
  return { allowed: true };
}

/**
 * Get remaining API calls
 */
export function getRemainingCalls(): { daily: number; minute: number } {
  return {
    daily: DAILY_LIMIT - dailyCallCount,
    minute: MINUTE_LIMIT - minuteCallCount,
  };
}
