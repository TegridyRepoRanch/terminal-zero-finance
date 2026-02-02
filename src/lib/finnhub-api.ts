// Finnhub API Service
// Provides real-time stock data, fundamentals, and financial metrics
// API Docs: https://finnhub.io/docs/api

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// API key from environment or fallback
const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY || '';

export interface FinnhubCompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

export interface FinnhubQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

export interface FinnhubBasicFinancials {
  symbol: string;
  metric: {
    '10DayAverageTradingVolume': number;
    '52WeekHigh': number;
    '52WeekLow': number;
    '52WeekLowDate': string;
    '52WeekHighDate': string;
    beta: number;
    bookValuePerShareAnnual: number;
    bookValuePerShareQuarterly: number;
    currentRatioAnnual: number;
    currentRatioQuarterly: number;
    dividendYieldIndicatedAnnual: number;
    epsAnnual: number;
    epsBasicExclExtraItemsAnnual: number;
    epsBasicExclExtraItemsQuarterly: number;
    epsGrowth3Y: number;
    epsGrowth5Y: number;
    epsGrowthQuarterlyYoy: number;
    epsGrowthTTMYoy: number;
    epsInclExtraItemsAnnual: number;
    epsInclExtraItemsQuarterly: number;
    epsTTM: number;
    grossMarginAnnual: number;
    grossMarginTTM: number;
    marketCapitalization: number;
    netIncomeEmployeeAnnual: number;
    netProfitMarginAnnual: number;
    netProfitMarginTTM: number;
    operatingMarginAnnual: number;
    operatingMarginTTM: number;
    payoutRatioAnnual: number;
    pbAnnual: number;
    peAnnual: number;
    peBasicExclExtraTTM: number;
    peExclExtraAnnual: number;
    peExclExtraTTM: number;
    peInclExtraTTM: number;
    peNormalizedAnnual: number;
    peTTM: number;
    pfcfShareAnnual: number;
    pfcfShareTTM: number;
    priceRelativeToSP50013Week: number;
    priceRelativeToSP50026Week: number;
    priceRelativeToSP5004Week: number;
    priceRelativeToSP50052Week: number;
    priceRelativeToSP500Ytd: number;
    psAnnual: number;
    psTTM: number;
    ptbvAnnual: number;
    ptbvQuarterly: number;
    quickRatioAnnual: number;
    quickRatioQuarterly: number;
    revenueEmployeeAnnual: number;
    revenueGrowth3Y: number;
    revenueGrowth5Y: number;
    revenueGrowthQuarterlyYoy: number;
    revenueGrowthTTMYoy: number;
    revenuePerShareAnnual: number;
    revenuePerShareTTM: number;
    roaRfy: number;
    roaTTM: number;
    roeRfy: number;
    roeTTM: number;
    roiAnnual: number;
    roiTTM: number;
    tangibleBookValuePerShareAnnual: number;
    tangibleBookValuePerShareQuarterly: number;
    totalDebtTotalEquityAnnual: number;
    totalDebtTotalEquityQuarterly: number;
  };
  series: {
    annual: {
      currentRatio: Array<{ period: string; v: number }>;
      eps: Array<{ period: string; v: number }>;
      salesPerShare: Array<{ period: string; v: number }>;
      netMargin: Array<{ period: string; v: number }>;
      operatingMargin: Array<{ period: string; v: number }>;
      grossMargin: Array<{ period: string; v: number }>;
      roeTTM: Array<{ period: string; v: number }>;
      roaTTM: Array<{ period: string; v: number }>;
      fcfMargin: Array<{ period: string; v: number }>;
      fcfPerShareTTM: Array<{ period: string; v: number }>;
    };
    quarterly: {
      currentRatio: Array<{ period: string; v: number }>;
      eps: Array<{ period: string; v: number }>;
      salesPerShare: Array<{ period: string; v: number }>;
    };
  };
}

export interface FinnhubFinancialStatement {
  symbol: string;
  financials: Array<{
    period: string;
    year: number;
    quarter?: number;
    // Income Statement
    revenue?: number;
    costOfGoodsSold?: number;
    grossProfit?: number;
    operatingExpenses?: number;
    operatingIncome?: number;
    ebit?: number;
    ebitda?: number;
    interestExpense?: number;
    pretaxIncome?: number;
    incomeTax?: number;
    netIncome?: number;
    netIncomeCommon?: number;
    // Balance Sheet
    totalAssets?: number;
    totalCurrentAssets?: number;
    cashAndCashEquivalents?: number;
    shortTermInvestments?: number;
    accountsReceivable?: number;
    inventory?: number;
    propertyPlantEquipment?: number;
    goodwill?: number;
    intangibleAssets?: number;
    totalLiabilities?: number;
    totalCurrentLiabilities?: number;
    accountsPayable?: number;
    shortTermDebt?: number;
    longTermDebt?: number;
    totalEquity?: number;
    retainedEarnings?: number;
    // Cash Flow
    operatingCashFlow?: number;
    capex?: number;
    freeCashFlow?: number;
    // Shares
    sharesBasic?: number;
    sharesDiluted?: number;
    // Other metrics
    eps?: number;
    epsDiluted?: number;
    dps?: number;
  }>;
}

/**
 * Check if Finnhub API is configured
 */
export function isFinnhubConfigured(): boolean {
  return Boolean(FINNHUB_API_KEY);
}

/**
 * Make authenticated request to Finnhub API
 */
async function finnhubRequest<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  if (!FINNHUB_API_KEY) {
    throw new Error('Finnhub API key not configured. Set VITE_FINNHUB_API_KEY in .env');
  }

  const url = new URL(`${FINNHUB_BASE_URL}${endpoint}`);
  url.searchParams.set('token', FINNHUB_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  console.log(`[Finnhub] Fetching: ${endpoint}`);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.text();
    console.error('[Finnhub] API error:', response.status, error);
    throw new Error(`Finnhub API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Check for API-level errors
  if (data.error) {
    throw new Error(`Finnhub API error: ${data.error}`);
  }

  return data as T;
}

/**
 * Get company profile and basic info
 */
export async function getCompanyProfile(ticker: string): Promise<FinnhubCompanyProfile> {
  return finnhubRequest<FinnhubCompanyProfile>('/stock/profile2', {
    symbol: ticker.toUpperCase(),
  });
}

/**
 * Get real-time stock quote
 */
export async function getQuote(ticker: string): Promise<FinnhubQuote> {
  return finnhubRequest<FinnhubQuote>('/quote', {
    symbol: ticker.toUpperCase(),
  });
}

/**
 * Get basic financial metrics and ratios
 */
export async function getBasicFinancials(ticker: string): Promise<FinnhubBasicFinancials> {
  return finnhubRequest<FinnhubBasicFinancials>('/stock/metric', {
    symbol: ticker.toUpperCase(),
    metric: 'all',
  });
}

/**
 * Get income statement data
 */
export async function getIncomeStatement(
  ticker: string,
  frequency: 'annual' | 'quarterly' = 'annual'
): Promise<FinnhubFinancialStatement> {
  return finnhubRequest<FinnhubFinancialStatement>('/stock/financials-reported', {
    symbol: ticker.toUpperCase(),
    freq: frequency,
  });
}

/**
 * Get balance sheet data
 */
export async function getBalanceSheet(
  ticker: string,
  frequency: 'annual' | 'quarterly' = 'annual'
): Promise<FinnhubFinancialStatement> {
  // Finnhub uses the same endpoint, financial type is in response
  return finnhubRequest<FinnhubFinancialStatement>('/stock/financials-reported', {
    symbol: ticker.toUpperCase(),
    freq: frequency,
  });
}

/**
 * Get cash flow statement data
 */
export async function getCashFlowStatement(
  ticker: string,
  frequency: 'annual' | 'quarterly' = 'annual'
): Promise<FinnhubFinancialStatement> {
  return finnhubRequest<FinnhubFinancialStatement>('/stock/financials-reported', {
    symbol: ticker.toUpperCase(),
    freq: frequency,
  });
}

/**
 * Normalize Finnhub data to our standard financial metrics format
 */
export interface NormalizedFinancials {
  ticker: string;
  companyName: string;
  source: 'finnhub';
  fetchedAt: Date;

  // Profile
  sector?: string;
  industry?: string;
  exchange?: string;
  marketCap?: number;
  sharesOutstanding?: number;

  // Quote
  currentPrice?: number;
  previousClose?: number;
  dayHigh?: number;
  dayLow?: number;

  // Metrics and Ratios
  peRatio?: number;
  pbRatio?: number;
  psRatio?: number;
  epsAnnual?: number;
  epsTTM?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netProfitMargin?: number;
  roe?: number;
  roa?: number;
  currentRatio?: number;
  quickRatio?: number;
  debtToEquity?: number;
  revenueGrowth3Y?: number;
  revenueGrowth5Y?: number;
  epsGrowth3Y?: number;
  epsGrowth5Y?: number;
  beta?: number;
  dividendYield?: number;
  week52High?: number;
  week52Low?: number;

  // Historical series (for charting)
  historicalEPS?: Array<{ period: string; value: number }>;
  historicalGrossMargin?: Array<{ period: string; value: number }>;
  historicalNetMargin?: Array<{ period: string; value: number }>;
}

/**
 * Fetch and normalize all available Finnhub data for a company
 */
export async function fetchAllFinnhubData(ticker: string): Promise<NormalizedFinancials> {
  const normalizedTicker = ticker.toUpperCase();
  console.log(`[Finnhub] Fetching all data for ${normalizedTicker}`);

  // Fetch all data in parallel
  const [profile, quote, metrics] = await Promise.all([
    getCompanyProfile(normalizedTicker).catch(e => {
      console.warn('[Finnhub] Profile fetch failed:', e);
      return null;
    }),
    getQuote(normalizedTicker).catch(e => {
      console.warn('[Finnhub] Quote fetch failed:', e);
      return null;
    }),
    getBasicFinancials(normalizedTicker).catch(e => {
      console.warn('[Finnhub] Metrics fetch failed:', e);
      return null;
    }),
  ]);

  const result: NormalizedFinancials = {
    ticker: normalizedTicker,
    companyName: profile?.name || normalizedTicker,
    source: 'finnhub',
    fetchedAt: new Date(),

    // Profile data
    sector: undefined, // Finnhub doesn't provide sector in profile2
    industry: profile?.finnhubIndustry,
    exchange: profile?.exchange,
    marketCap: profile?.marketCapitalization ? profile.marketCapitalization * 1_000_000 : undefined,
    sharesOutstanding: profile?.shareOutstanding ? profile.shareOutstanding * 1_000_000 : undefined,

    // Quote data
    currentPrice: quote?.c,
    previousClose: quote?.pc,
    dayHigh: quote?.h,
    dayLow: quote?.l,

    // Metrics
    peRatio: metrics?.metric?.peAnnual,
    pbRatio: metrics?.metric?.pbAnnual,
    psRatio: metrics?.metric?.psAnnual,
    epsAnnual: metrics?.metric?.epsAnnual,
    epsTTM: metrics?.metric?.epsTTM,
    grossMargin: metrics?.metric?.grossMarginAnnual,
    operatingMargin: metrics?.metric?.operatingMarginAnnual,
    netProfitMargin: metrics?.metric?.netProfitMarginAnnual,
    roe: metrics?.metric?.roeRfy,
    roa: metrics?.metric?.roaRfy,
    currentRatio: metrics?.metric?.currentRatioAnnual,
    quickRatio: metrics?.metric?.quickRatioAnnual,
    debtToEquity: metrics?.metric?.totalDebtTotalEquityAnnual,
    revenueGrowth3Y: metrics?.metric?.revenueGrowth3Y,
    revenueGrowth5Y: metrics?.metric?.revenueGrowth5Y,
    epsGrowth3Y: metrics?.metric?.epsGrowth3Y,
    epsGrowth5Y: metrics?.metric?.epsGrowth5Y,
    beta: metrics?.metric?.beta,
    dividendYield: metrics?.metric?.dividendYieldIndicatedAnnual,
    week52High: metrics?.metric?.['52WeekHigh'],
    week52Low: metrics?.metric?.['52WeekLow'],

    // Historical series
    historicalEPS: metrics?.series?.annual?.eps?.map(d => ({
      period: d.period,
      value: d.v,
    })),
    historicalGrossMargin: metrics?.series?.annual?.grossMargin?.map(d => ({
      period: d.period,
      value: d.v,
    })),
    historicalNetMargin: metrics?.series?.annual?.netMargin?.map(d => ({
      period: d.period,
      value: d.v,
    })),
  };

  console.log('[Finnhub] Data normalized successfully');
  return result;
}

// Rate limit tracking (Finnhub free tier: 60 calls/minute)
let callCount = 0;
let windowStart = Date.now();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

/**
 * Check if we're within rate limits
 */
export function checkRateLimit(): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();

  // Reset window if expired
  if (now - windowStart > RATE_WINDOW_MS) {
    callCount = 0;
    windowStart = now;
  }

  if (callCount >= RATE_LIMIT) {
    const retryAfter = RATE_WINDOW_MS - (now - windowStart);
    return { allowed: false, retryAfter };
  }

  callCount++;
  return { allowed: true };
}
