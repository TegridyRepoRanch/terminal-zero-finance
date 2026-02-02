// Financial Modeling Prep API Service
// Premium financial data: statements, ratios, DCF, transcripts, and more
// API Docs: https://site.financialmodelingprep.com/developer/docs

const FMP_BASE_URL = 'https://financialmodelingprep.com/api';
const FMP_API_KEY = import.meta.env.VITE_FMP_API_KEY || '';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FMPIncomeStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossProfitRatio: number;
  researchAndDevelopmentExpenses: number;
  generalAndAdministrativeExpenses: number;
  sellingAndMarketingExpenses: number;
  sellingGeneralAndAdministrativeExpenses: number;
  otherExpenses: number;
  operatingExpenses: number;
  costAndExpenses: number;
  interestIncome: number;
  interestExpense: number;
  depreciationAndAmortization: number;
  ebitda: number;
  ebitdaratio: number;
  operatingIncome: number;
  operatingIncomeRatio: number;
  totalOtherIncomeExpensesNet: number;
  incomeBeforeTax: number;
  incomeBeforeTaxRatio: number;
  incomeTaxExpense: number;
  netIncome: number;
  netIncomeRatio: number;
  eps: number;
  epsdiluted: number;
  weightedAverageShsOut: number;
  weightedAverageShsOutDil: number;
  link: string;
  finalLink: string;
}

export interface FMPBalanceSheet {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;
  cashAndCashEquivalents: number;
  shortTermInvestments: number;
  cashAndShortTermInvestments: number;
  netReceivables: number;
  inventory: number;
  otherCurrentAssets: number;
  totalCurrentAssets: number;
  propertyPlantEquipmentNet: number;
  goodwill: number;
  intangibleAssets: number;
  goodwillAndIntangibleAssets: number;
  longTermInvestments: number;
  taxAssets: number;
  otherNonCurrentAssets: number;
  totalNonCurrentAssets: number;
  otherAssets: number;
  totalAssets: number;
  accountPayables: number;
  shortTermDebt: number;
  taxPayables: number;
  deferredRevenue: number;
  otherCurrentLiabilities: number;
  totalCurrentLiabilities: number;
  longTermDebt: number;
  deferredRevenueNonCurrent: number;
  deferredTaxLiabilitiesNonCurrent: number;
  otherNonCurrentLiabilities: number;
  totalNonCurrentLiabilities: number;
  otherLiabilities: number;
  capitalLeaseObligations: number;
  totalLiabilities: number;
  preferredStock: number;
  commonStock: number;
  retainedEarnings: number;
  accumulatedOtherComprehensiveIncomeLoss: number;
  othertotalStockholdersEquity: number;
  totalStockholdersEquity: number;
  totalEquity: number;
  totalLiabilitiesAndStockholdersEquity: number;
  minorityInterest: number;
  totalLiabilitiesAndTotalEquity: number;
  totalInvestments: number;
  totalDebt: number;
  netDebt: number;
  link: string;
  finalLink: string;
}

export interface FMPCashFlowStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;
  netIncome: number;
  depreciationAndAmortization: number;
  deferredIncomeTax: number;
  stockBasedCompensation: number;
  changeInWorkingCapital: number;
  accountsReceivables: number;
  inventory: number;
  accountsPayables: number;
  otherWorkingCapital: number;
  otherNonCashItems: number;
  netCashProvidedByOperatingActivities: number;
  investmentsInPropertyPlantAndEquipment: number;
  acquisitionsNet: number;
  purchasesOfInvestments: number;
  salesMaturitiesOfInvestments: number;
  otherInvestingActivites: number;
  netCashUsedForInvestingActivites: number;
  debtRepayment: number;
  commonStockIssued: number;
  commonStockRepurchased: number;
  dividendsPaid: number;
  otherFinancingActivites: number;
  netCashUsedProvidedByFinancingActivities: number;
  effectOfForexChangesOnCash: number;
  netChangeInCash: number;
  cashAtEndOfPeriod: number;
  cashAtBeginningOfPeriod: number;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
  link: string;
  finalLink: string;
}

export interface FMPKeyMetrics {
  symbol: string;
  date: string;
  calendarYear: string;
  period: string;
  revenuePerShare: number;
  netIncomePerShare: number;
  operatingCashFlowPerShare: number;
  freeCashFlowPerShare: number;
  cashPerShare: number;
  bookValuePerShare: number;
  tangibleBookValuePerShare: number;
  shareholdersEquityPerShare: number;
  interestDebtPerShare: number;
  marketCap: number;
  enterpriseValue: number;
  peRatio: number;
  priceToSalesRatio: number;
  pocfratio: number;
  pfcfRatio: number;
  pbRatio: number;
  ptbRatio: number;
  evToSales: number;
  enterpriseValueOverEBITDA: number;
  evToOperatingCashFlow: number;
  evToFreeCashFlow: number;
  earningsYield: number;
  freeCashFlowYield: number;
  debtToEquity: number;
  debtToAssets: number;
  netDebtToEBITDA: number;
  currentRatio: number;
  interestCoverage: number;
  incomeQuality: number;
  dividendYield: number;
  payoutRatio: number;
  salesGeneralAndAdministrativeToRevenue: number;
  researchAndDevelopementToRevenue: number;
  intangiblesToTotalAssets: number;
  capexToOperatingCashFlow: number;
  capexToRevenue: number;
  capexToDepreciation: number;
  stockBasedCompensationToRevenue: number;
  grahamNumber: number;
  roic: number;
  returnOnTangibleAssets: number;
  grahamNetNet: number;
  workingCapital: number;
  tangibleAssetValue: number;
  netCurrentAssetValue: number;
  investedCapital: number;
  averageReceivables: number;
  averagePayables: number;
  averageInventory: number;
  daysSalesOutstanding: number;
  daysPayablesOutstanding: number;
  daysOfInventoryOnHand: number;
  receivablesTurnover: number;
  payablesTurnover: number;
  inventoryTurnover: number;
  roe: number;
  capexPerShare: number;
}

export interface FMPRatios {
  symbol: string;
  date: string;
  calendarYear: string;
  period: string;
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  daysOfSalesOutstanding: number;
  daysOfInventoryOutstanding: number;
  operatingCycle: number;
  daysOfPayablesOutstanding: number;
  cashConversionCycle: number;
  grossProfitMargin: number;
  operatingProfitMargin: number;
  pretaxProfitMargin: number;
  netProfitMargin: number;
  effectiveTaxRate: number;
  returnOnAssets: number;
  returnOnEquity: number;
  returnOnCapitalEmployed: number;
  netIncomePerEBT: number;
  ebtPerEbit: number;
  ebitPerRevenue: number;
  debtRatio: number;
  debtEquityRatio: number;
  longTermDebtToCapitalization: number;
  totalDebtToCapitalization: number;
  interestCoverage: number;
  cashFlowToDebtRatio: number;
  companyEquityMultiplier: number;
  receivablesTurnover: number;
  payablesTurnover: number;
  inventoryTurnover: number;
  fixedAssetTurnover: number;
  assetTurnover: number;
  operatingCashFlowPerShare: number;
  freeCashFlowPerShare: number;
  cashPerShare: number;
  payoutRatio: number;
  operatingCashFlowSalesRatio: number;
  freeCashFlowOperatingCashFlowRatio: number;
  cashFlowCoverageRatios: number;
  shortTermCoverageRatios: number;
  capitalExpenditureCoverageRatio: number;
  dividendPaidAndCapexCoverageRatio: number;
  dividendPayoutRatio: number;
  priceBookValueRatio: number;
  priceToBookRatio: number;
  priceToSalesRatio: number;
  priceEarningsRatio: number;
  priceToFreeCashFlowsRatio: number;
  priceToOperatingCashFlowsRatio: number;
  priceCashFlowRatio: number;
  priceEarningsToGrowthRatio: number;
  priceSalesRatio: number;
  dividendYield: number;
  enterpriseValueMultiple: number;
  priceFairValue: number;
}

export interface FMPDCFValue {
  symbol: string;
  date: string;
  dcf: number;
  'Stock Price': number;
}

export interface FMPCompanyProfile {
  symbol: string;
  price: number;
  beta: number;
  volAvg: number;
  mktCap: number;
  lastDiv: number;
  range: string;
  changes: number;
  companyName: string;
  currency: string;
  cik: string;
  isin: string;
  cusip: string;
  exchange: string;
  exchangeShortName: string;
  industry: string;
  website: string;
  description: string;
  ceo: string;
  sector: string;
  country: string;
  fullTimeEmployees: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dcfDiff: number;
  dcf: number;
  image: string;
  ipoDate: string;
  defaultImage: boolean;
  isEtf: boolean;
  isActivelyTrading: boolean;
  isAdr: boolean;
  isFund: boolean;
  // Shares data (may not always be present in profile endpoint)
  sharesOutstanding?: number;
}

export interface FMPEarningsTranscript {
  symbol: string;
  quarter: number;
  year: number;
  date: string;
  content: string;
}

export interface FMPAnalystEstimates {
  symbol: string;
  date: string;
  estimatedRevenueLow: number;
  estimatedRevenueHigh: number;
  estimatedRevenueAvg: number;
  estimatedEbitdaLow: number;
  estimatedEbitdaHigh: number;
  estimatedEbitdaAvg: number;
  estimatedEpsLow: number;
  estimatedEpsHigh: number;
  estimatedEpsAvg: number;
  estimatedNetIncomeLow: number;
  estimatedNetIncomeHigh: number;
  estimatedNetIncomeAvg: number;
  estimatedSgaExpenseLow: number;
  estimatedSgaExpenseHigh: number;
  estimatedSgaExpenseAvg: number;
  numberAnalystEstimatedRevenue: number;
  numberAnalystsEstimatedEps: number;
}

export interface FMPInsiderTrading {
  symbol: string;
  filingDate: string;
  transactionDate: string;
  reportingCik: string;
  transactionType: string;
  securitiesOwned: number;
  companyCik: string;
  reportingName: string;
  typeOfOwner: string;
  acquistionOrDisposition: string;
  formType: string;
  securitiesTransacted: number;
  price: number;
  securityName: string;
  link: string;
}

export interface FMPInstitutionalHolder {
  holder: string;
  shares: number;
  dateReported: string;
  change: number;
  changePercentage: number;
}

export interface FMPPriceTarget {
  symbol: string;
  publishedDate: string;
  newsURL: string;
  newsTitle: string;
  analystName: string;
  priceTarget: number;
  adjPriceTarget: number;
  priceWhenPosted: number;
  newsPublisher: string;
  newsBaseURL: string;
  analystCompany: string;
}

export interface FMPSECFiling {
  symbol: string;
  cik: string;
  type: string;
  link: string;
  finalLink: string;
  acceptedDate: string;
  fillingDate: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

export function isFMPConfigured(): boolean {
  return Boolean(FMP_API_KEY);
}

async function fmpRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  if (!FMP_API_KEY) {
    throw new Error('FMP API key not configured. Set VITE_FMP_API_KEY in .env');
  }

  const url = new URL(`${FMP_BASE_URL}${endpoint}`);
  url.searchParams.set('apikey', FMP_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  console.log(`[FMP] Fetching: ${endpoint}`);
  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`FMP API error: ${response.status}`);
  }

  const data = await response.json();

  // Check for error messages
  if (data['Error Message']) {
    throw new Error(`FMP error: ${data['Error Message']}`);
  }

  return data as T;
}

// ============================================================================
// FINANCIAL STATEMENTS
// ============================================================================

export async function getIncomeStatements(
  ticker: string,
  period: 'annual' | 'quarter' = 'annual',
  limit: number = 10
): Promise<FMPIncomeStatement[]> {
  return fmpRequest<FMPIncomeStatement[]>(`/v3/income-statement/${ticker.toUpperCase()}`, {
    period,
    limit: String(limit),
  });
}

export async function getBalanceSheets(
  ticker: string,
  period: 'annual' | 'quarter' = 'annual',
  limit: number = 10
): Promise<FMPBalanceSheet[]> {
  return fmpRequest<FMPBalanceSheet[]>(`/v3/balance-sheet-statement/${ticker.toUpperCase()}`, {
    period,
    limit: String(limit),
  });
}

export async function getCashFlowStatements(
  ticker: string,
  period: 'annual' | 'quarter' = 'annual',
  limit: number = 10
): Promise<FMPCashFlowStatement[]> {
  return fmpRequest<FMPCashFlowStatement[]>(`/v3/cash-flow-statement/${ticker.toUpperCase()}`, {
    period,
    limit: String(limit),
  });
}

// ============================================================================
// METRICS AND RATIOS
// ============================================================================

export async function getKeyMetrics(
  ticker: string,
  period: 'annual' | 'quarter' = 'annual',
  limit: number = 10
): Promise<FMPKeyMetrics[]> {
  return fmpRequest<FMPKeyMetrics[]>(`/v3/key-metrics/${ticker.toUpperCase()}`, {
    period,
    limit: String(limit),
  });
}

export async function getRatios(
  ticker: string,
  period: 'annual' | 'quarter' = 'annual',
  limit: number = 10
): Promise<FMPRatios[]> {
  return fmpRequest<FMPRatios[]>(`/v3/ratios/${ticker.toUpperCase()}`, {
    period,
    limit: String(limit),
  });
}

export async function getKeyMetricsTTM(ticker: string): Promise<FMPKeyMetrics[]> {
  return fmpRequest<FMPKeyMetrics[]>(`/v3/key-metrics-ttm/${ticker.toUpperCase()}`);
}

export async function getRatiosTTM(ticker: string): Promise<FMPRatios[]> {
  return fmpRequest<FMPRatios[]>(`/v3/ratios-ttm/${ticker.toUpperCase()}`);
}

// ============================================================================
// VALUATION
// ============================================================================

export async function getDCFValue(ticker: string): Promise<FMPDCFValue[]> {
  return fmpRequest<FMPDCFValue[]>(`/v3/discounted-cash-flow/${ticker.toUpperCase()}`);
}

export async function getHistoricalDCF(
  ticker: string,
  period: 'annual' | 'quarter' = 'annual',
  limit: number = 10
): Promise<Array<{ symbol: string; date: string; dcf: number; price: number }>> {
  return fmpRequest(`/v3/historical-discounted-cash-flow-statement/${ticker.toUpperCase()}`, {
    period,
    limit: String(limit),
  });
}

export async function getEnterpriseValue(
  ticker: string,
  period: 'annual' | 'quarter' = 'annual',
  limit: number = 10
): Promise<Array<{
  symbol: string;
  date: string;
  stockPrice: number;
  numberOfShares: number;
  marketCapitalization: number;
  minusCashAndCashEquivalents: number;
  addTotalDebt: number;
  enterpriseValue: number;
}>> {
  return fmpRequest(`/v3/enterprise-values/${ticker.toUpperCase()}`, {
    period,
    limit: String(limit),
  });
}

// ============================================================================
// QUOTES & PRICES
// ============================================================================

export interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  exchange: string;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  sharesOutstanding: number;
  timestamp: number;
}

export async function getQuote(ticker: string): Promise<FMPQuote[]> {
  return fmpRequest<FMPQuote[]>(`/v3/quote/${ticker.toUpperCase()}`);
}

export async function getQuotes(tickers: string[]): Promise<FMPQuote[]> {
  const symbols = tickers.map(t => t.toUpperCase()).join(',');
  return fmpRequest<FMPQuote[]>(`/v3/quote/${symbols}`);
}

// ============================================================================
// COMPANY INFO
// ============================================================================

export async function getCompanyProfile(ticker: string): Promise<FMPCompanyProfile[]> {
  return fmpRequest<FMPCompanyProfile[]>(`/v3/profile/${ticker.toUpperCase()}`);
}

export async function getCompanyPeers(ticker: string): Promise<string[]> {
  const result = await fmpRequest<Array<{ peersList: string[] }>>(`/v4/stock_peers?symbol=${ticker.toUpperCase()}`);
  return result[0]?.peersList || [];
}

// ============================================================================
// EARNINGS & TRANSCRIPTS
// ============================================================================

export async function getEarningsTranscript(
  ticker: string,
  year: number,
  quarter: number
): Promise<FMPEarningsTranscript[]> {
  return fmpRequest<FMPEarningsTranscript[]>(`/v3/earning_call_transcript/${ticker.toUpperCase()}`, {
    year: String(year),
    quarter: String(quarter),
  });
}

export async function getAllEarningsTranscripts(
  ticker: string,
  limit: number = 8
): Promise<FMPEarningsTranscript[]> {
  // Get last N transcripts
  const transcripts: FMPEarningsTranscript[] = [];
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  let year = currentYear;
  let quarter = currentQuarter;
  let attempts = 0;
  const maxAttempts = 20;

  while (transcripts.length < limit && attempts < maxAttempts) {
    try {
      const result = await getEarningsTranscript(ticker, year, quarter);
      if (result.length > 0) {
        transcripts.push(...result);
      }
    } catch (e) {
      // Transcript not available, continue
    }

    // Move to previous quarter
    quarter--;
    if (quarter < 1) {
      quarter = 4;
      year--;
    }
    attempts++;
  }

  return transcripts.slice(0, limit);
}

export async function getAnalystEstimates(
  ticker: string,
  period: 'annual' | 'quarter' = 'annual',
  limit: number = 10
): Promise<FMPAnalystEstimates[]> {
  return fmpRequest<FMPAnalystEstimates[]>(`/v3/analyst-estimates/${ticker.toUpperCase()}`, {
    period,
    limit: String(limit),
  });
}

// ============================================================================
// INSIDER & INSTITUTIONAL
// ============================================================================

export async function getInsiderTrading(
  ticker: string,
  limit: number = 100
): Promise<FMPInsiderTrading[]> {
  return fmpRequest<FMPInsiderTrading[]>(`/v4/insider-trading?symbol=${ticker.toUpperCase()}&limit=${limit}`);
}

export async function getInstitutionalHolders(ticker: string): Promise<FMPInstitutionalHolder[]> {
  return fmpRequest<FMPInstitutionalHolder[]>(`/v3/institutional-holder/${ticker.toUpperCase()}`);
}

export async function getPriceTargets(
  ticker: string,
  _limit: number = 20 // Reserved for pagination
): Promise<FMPPriceTarget[]> {
  return fmpRequest<FMPPriceTarget[]>(`/v4/price-target?symbol=${ticker.toUpperCase()}`);
}

// ============================================================================
// SEC FILINGS
// ============================================================================

export async function getSECFilings(
  ticker: string,
  type?: string,
  limit: number = 50
): Promise<FMPSECFiling[]> {
  const params: Record<string, string> = { limit: String(limit) };
  if (type) params.type = type;
  return fmpRequest<FMPSECFiling[]>(`/v3/sec_filings/${ticker.toUpperCase()}`, params);
}

// ============================================================================
// COMPREHENSIVE DATA FETCH
// ============================================================================

export interface FMPComprehensiveData {
  ticker: string;
  profile: FMPCompanyProfile | null;
  peers: string[];
  incomeStatements: {
    annual: FMPIncomeStatement[];
    quarterly: FMPIncomeStatement[];
  };
  balanceSheets: {
    annual: FMPBalanceSheet[];
    quarterly: FMPBalanceSheet[];
  };
  cashFlows: {
    annual: FMPCashFlowStatement[];
    quarterly: FMPCashFlowStatement[];
  };
  keyMetrics: {
    annual: FMPKeyMetrics[];
    ttm: FMPKeyMetrics | null;
  };
  ratios: {
    annual: FMPRatios[];
    ttm: FMPRatios | null;
  };
  dcf: FMPDCFValue | null;
  analystEstimates: FMPAnalystEstimates[];
  priceTargets: FMPPriceTarget[];
  insiderTrading: FMPInsiderTrading[];
  recentFilings: FMPSECFiling[];
  fetchedAt: Date;
}

/**
 * Fetch comprehensive financial data for a company
 * This is the main entry point for getting all FMP data
 */
export async function fetchComprehensiveFMPData(
  ticker: string,
  options: {
    includeQuarterly?: boolean;
    yearsOfHistory?: number;
    includeInsiders?: boolean;
    includeTranscripts?: boolean;
  } = {}
): Promise<FMPComprehensiveData> {
  const {
    includeQuarterly = true,
    yearsOfHistory = 5,
    includeInsiders = true,
  } = options;

  const normalizedTicker = ticker.toUpperCase();
  console.log(`[FMP] Fetching comprehensive data for ${normalizedTicker}`);

  const limit = yearsOfHistory;
  const quarterlyLimit = yearsOfHistory * 4;

  // Fetch all data in parallel for speed
  const [
    profileResult,
    peersResult,
    incomeAnnual,
    incomeQuarterly,
    balanceAnnual,
    balanceQuarterly,
    cashFlowAnnual,
    cashFlowQuarterly,
    metricsAnnual,
    metricsTTM,
    ratiosAnnual,
    ratiosTTM,
    dcfResult,
    estimatesResult,
    priceTargetsResult,
    insiderResult,
    filingsResult,
  ] = await Promise.all([
    getCompanyProfile(normalizedTicker).catch(() => []),
    getCompanyPeers(normalizedTicker).catch(() => []),
    getIncomeStatements(normalizedTicker, 'annual', limit).catch(() => []),
    includeQuarterly ? getIncomeStatements(normalizedTicker, 'quarter', quarterlyLimit).catch(() => []) : Promise.resolve([]),
    getBalanceSheets(normalizedTicker, 'annual', limit).catch(() => []),
    includeQuarterly ? getBalanceSheets(normalizedTicker, 'quarter', quarterlyLimit).catch(() => []) : Promise.resolve([]),
    getCashFlowStatements(normalizedTicker, 'annual', limit).catch(() => []),
    includeQuarterly ? getCashFlowStatements(normalizedTicker, 'quarter', quarterlyLimit).catch(() => []) : Promise.resolve([]),
    getKeyMetrics(normalizedTicker, 'annual', limit).catch(() => []),
    getKeyMetricsTTM(normalizedTicker).catch(() => []),
    getRatios(normalizedTicker, 'annual', limit).catch(() => []),
    getRatiosTTM(normalizedTicker).catch(() => []),
    getDCFValue(normalizedTicker).catch(() => []),
    getAnalystEstimates(normalizedTicker, 'annual', 3).catch(() => []),
    getPriceTargets(normalizedTicker, 10).catch(() => []),
    includeInsiders ? getInsiderTrading(normalizedTicker, 50).catch(() => []) : Promise.resolve([]),
    getSECFilings(normalizedTicker, undefined, 20).catch(() => []),
  ]);

  return {
    ticker: normalizedTicker,
    profile: profileResult[0] || null,
    peers: peersResult,
    incomeStatements: {
      annual: incomeAnnual,
      quarterly: incomeQuarterly,
    },
    balanceSheets: {
      annual: balanceAnnual,
      quarterly: balanceQuarterly,
    },
    cashFlows: {
      annual: cashFlowAnnual,
      quarterly: cashFlowQuarterly,
    },
    keyMetrics: {
      annual: metricsAnnual,
      ttm: metricsTTM[0] || null,
    },
    ratios: {
      annual: ratiosAnnual,
      ttm: ratiosTTM[0] || null,
    },
    dcf: dcfResult[0] || null,
    analystEstimates: estimatesResult,
    priceTargets: priceTargetsResult,
    insiderTrading: insiderResult,
    recentFilings: filingsResult,
    fetchedAt: new Date(),
  };
}

// ============================================================================
// RATE LIMITING
// ============================================================================

// FMP rate limits vary by plan:
// Free: 250 calls/day
// Starter: 300 calls/min
// Higher tiers: More generous

let callCount = 0;
let dayStart = Date.now();
const FREE_DAILY_LIMIT = 250;
const DAY_MS = 24 * 60 * 60 * 1000;

export function checkRateLimit(): { allowed: boolean; remaining: number; resetsAt: Date } {
  const now = Date.now();

  if (now - dayStart > DAY_MS) {
    callCount = 0;
    dayStart = now;
  }

  return {
    allowed: callCount < FREE_DAILY_LIMIT,
    remaining: Math.max(0, FREE_DAILY_LIMIT - callCount),
    resetsAt: new Date(dayStart + DAY_MS),
  };
}

export function incrementCallCount(): void {
  callCount++;
}
