// Polygon.io API Integration
// Real-time and historical market data for professional trading
// Documentation: https://polygon.io/docs

// ============================================================================
// CONFIGURATION
// ============================================================================

const POLYGON_API_KEY = import.meta.env.VITE_POLYGON_API_KEY || '';
const POLYGON_BASE_URL = 'https://api.polygon.io';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PolygonTicker {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange: string;
  type: string;
  active: boolean;
  currency_name: string;
  cik?: string;
  composite_figi?: string;
  share_class_figi?: string;
  market_cap?: number;
  phone_number?: string;
  address?: {
    address1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  description?: string;
  sic_code?: string;
  sic_description?: string;
  ticker_root?: string;
  homepage_url?: string;
  total_employees?: number;
  list_date?: string;
  branding?: {
    logo_url?: string;
    icon_url?: string;
  };
  share_class_shares_outstanding?: number;
  weighted_shares_outstanding?: number;
}

export interface PolygonAggregateBar {
  v: number;    // Volume
  vw: number;   // VWAP
  o: number;    // Open
  c: number;    // Close
  h: number;    // High
  l: number;    // Low
  t: number;    // Unix timestamp (ms)
  n: number;    // Number of transactions
}

export interface PolygonQuote {
  ticker: string;
  tks: number;       // Ticker size
  p: number;         // Bid price
  s: number;         // Bid size
  P: number;         // Ask price
  S: number;         // Ask size
  t: number;         // Timestamp
  y: number;         // SIP timestamp
  q: number;         // Sequence
}

export interface PolygonTrade {
  conditions: number[];
  exchange: number;
  price: number;
  size: number;
  timestamp: number;
  tradeId: string;
}

export interface PolygonSnapshot {
  ticker: string;
  todaysChange: number;
  todaysChangePerc: number;
  updated: number;
  day: {
    o: number;    // Open
    h: number;    // High
    l: number;    // Low
    c: number;    // Close
    v: number;    // Volume
    vw: number;   // VWAP
  };
  lastTrade: {
    p: number;    // Price
    s: number;    // Size
    t: number;    // Timestamp
    c: number[];  // Conditions
  };
  lastQuote: {
    P: number;    // Ask price
    S: number;    // Ask size
    p: number;    // Bid price
    s: number;    // Bid size
    t: number;    // Timestamp
  };
  min: {
    av: number;   // Accumulated volume
    o: number;    // Open
    h: number;    // High
    l: number;    // Low
    c: number;    // Close
    v: number;    // Volume
    vw: number;   // VWAP
  };
  prevDay: {
    o: number;    // Open
    h: number;    // High
    l: number;    // Low
    c: number;    // Close
    v: number;    // Volume
    vw: number;   // VWAP
  };
}

export interface PolygonNewsArticle {
  id: string;
  publisher: {
    name: string;
    homepage_url: string;
    logo_url?: string;
    favicon_url?: string;
  };
  title: string;
  author: string;
  published_utc: string;
  article_url: string;
  tickers: string[];
  amp_url?: string;
  image_url?: string;
  description?: string;
  keywords?: string[];
  insights?: {
    ticker: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    sentiment_reasoning: string;
  }[];
}

export interface PolygonFinancials {
  cik: string;
  company_name: string;
  start_date: string;
  end_date: string;
  filing_date: string;
  fiscal_period: string;
  fiscal_year: string;
  source_filing_url: string;
  source_filing_file_url: string;
  financials: {
    balance_sheet?: Record<string, PolygonFinancialMetric>;
    cash_flow_statement?: Record<string, PolygonFinancialMetric>;
    comprehensive_income?: Record<string, PolygonFinancialMetric>;
    income_statement?: Record<string, PolygonFinancialMetric>;
  };
}

export interface PolygonFinancialMetric {
  label: string;
  order: number;
  unit: string;
  value: number;
  xpath?: string;
}

export interface PolygonDividend {
  cash_amount: number;
  currency: string;
  declaration_date: string;
  dividend_type: 'CD' | 'SC' | 'LT' | 'ST';
  ex_dividend_date: string;
  frequency: number;
  pay_date: string;
  record_date: string;
  ticker: string;
}

export interface PolygonSplit {
  execution_date: string;
  split_from: number;
  split_to: number;
  ticker: string;
}

export interface PolygonInsiderTransaction {
  id: string;
  filing_date: string;
  transaction_date: string;
  ticker: string;
  issuer_name: string;
  issuer_cik: string;
  reporting_owner: {
    name: string;
    cik: string;
    is_director: boolean;
    is_officer: boolean;
    is_ten_percent_owner: boolean;
    is_other: boolean;
    officer_title?: string;
  };
  security_type: string;
  transaction_type: string;
  shares: number;
  shares_owned_following_transaction: number;
  price_per_share?: number;
  total_value?: number;
  acquisition_or_disposition: 'A' | 'D';
  direct_or_indirect: 'D' | 'I';
}

export interface PolygonMarketStatus {
  afterHours: boolean;
  currencies: {
    fx: string;
    crypto: string;
  };
  earlyHours: boolean;
  exchanges: {
    nyse: string;
    nasdaq: string;
    otc: string;
  };
  market: string;
  serverTime: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function polygonFetch<T>(endpoint: string, params: Record<string, string | number | boolean> = {}): Promise<T | null> {
  if (!POLYGON_API_KEY) {
    console.warn('[Polygon] No API key configured');
    return null;
  }

  const searchParams = new URLSearchParams({
    ...Object.entries(params).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {}),
    apiKey: POLYGON_API_KEY,
  });

  const url = `${POLYGON_BASE_URL}${endpoint}?${searchParams}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('[Polygon] Rate limited');
      }
      throw new Error(`Polygon API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Polygon] API error:', error);
    return null;
  }
}

// ============================================================================
// TICKER DETAILS
// ============================================================================

/**
 * Get detailed information about a ticker
 */
export async function getTickerDetails(ticker: string): Promise<PolygonTicker | null> {
  const data = await polygonFetch<{ results: PolygonTicker }>(`/v3/reference/tickers/${ticker.toUpperCase()}`);
  return data?.results || null;
}

/**
 * Search for tickers by name or symbol
 */
export async function searchTickers(
  query: string,
  options?: {
    type?: 'CS' | 'ETF' | 'FUND';
    market?: 'stocks' | 'crypto' | 'fx';
    active?: boolean;
    limit?: number;
  }
): Promise<PolygonTicker[]> {
  const params: Record<string, string | number | boolean> = {
    search: query,
    limit: options?.limit || 20,
  };

  if (options?.type) params.type = options.type;
  if (options?.market) params.market = options.market;
  if (options?.active !== undefined) params.active = options.active;

  const data = await polygonFetch<{ results: PolygonTicker[] }>('/v3/reference/tickers', params);
  return data?.results || [];
}

// ============================================================================
// MARKET DATA - AGGREGATES (OHLCV)
// ============================================================================

/**
 * Get aggregate bars (candlesticks) for a ticker
 */
export async function getAggregates(
  ticker: string,
  multiplier: number,
  timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year',
  from: string, // YYYY-MM-DD
  to: string,   // YYYY-MM-DD
  options?: {
    adjusted?: boolean;
    sort?: 'asc' | 'desc';
    limit?: number;
  }
): Promise<PolygonAggregateBar[]> {
  const params: Record<string, string | number | boolean> = {
    adjusted: options?.adjusted ?? true,
    sort: options?.sort || 'asc',
    limit: options?.limit || 5000,
  };

  const data = await polygonFetch<{ results: PolygonAggregateBar[] }>(
    `/v2/aggs/ticker/${ticker.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}`,
    params
  );

  return data?.results || [];
}

/**
 * Get daily bars for the last N days
 */
export async function getDailyBars(ticker: string, days: number = 365): Promise<PolygonAggregateBar[]> {
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return getAggregates(ticker, 1, 'day', from, to);
}

/**
 * Get intraday bars (minute-level)
 */
export async function getIntradayBars(
  ticker: string,
  date: string, // YYYY-MM-DD
  multiplier: number = 1
): Promise<PolygonAggregateBar[]> {
  return getAggregates(ticker, multiplier, 'minute', date, date, { limit: 5000 });
}

/**
 * Get previous day's OHLCV
 */
export async function getPreviousClose(ticker: string): Promise<PolygonAggregateBar | null> {
  const data = await polygonFetch<{ results: PolygonAggregateBar[] }>(
    `/v2/aggs/ticker/${ticker.toUpperCase()}/prev`
  );
  return data?.results?.[0] || null;
}

// ============================================================================
// REAL-TIME DATA
// ============================================================================

/**
 * Get snapshot for a single ticker
 */
export async function getSnapshot(ticker: string): Promise<PolygonSnapshot | null> {
  const data = await polygonFetch<{ ticker: PolygonSnapshot }>(
    `/v2/snapshot/locale/us/markets/stocks/tickers/${ticker.toUpperCase()}`
  );
  return data?.ticker || null;
}

/**
 * Get snapshots for multiple tickers
 */
export async function getSnapshots(tickers: string[]): Promise<PolygonSnapshot[]> {
  const tickerStr = tickers.map(t => t.toUpperCase()).join(',');
  const data = await polygonFetch<{ tickers: PolygonSnapshot[] }>(
    `/v2/snapshot/locale/us/markets/stocks/tickers`,
    { tickers: tickerStr }
  );
  return data?.tickers || [];
}

/**
 * Get all gainers
 */
export async function getGainers(): Promise<PolygonSnapshot[]> {
  const data = await polygonFetch<{ tickers: PolygonSnapshot[] }>(
    '/v2/snapshot/locale/us/markets/stocks/gainers'
  );
  return data?.tickers || [];
}

/**
 * Get all losers
 */
export async function getLosers(): Promise<PolygonSnapshot[]> {
  const data = await polygonFetch<{ tickers: PolygonSnapshot[] }>(
    '/v2/snapshot/locale/us/markets/stocks/losers'
  );
  return data?.tickers || [];
}

// ============================================================================
// NEWS
// ============================================================================

/**
 * Get news articles for a ticker
 */
export async function getNews(
  ticker?: string,
  options?: {
    published_utc_gte?: string;
    published_utc_lte?: string;
    limit?: number;
    sort?: 'published_utc';
    order?: 'asc' | 'desc';
  }
): Promise<PolygonNewsArticle[]> {
  const params: Record<string, string | number | boolean> = {
    limit: options?.limit || 50,
    order: options?.order || 'desc',
  };

  if (ticker) params.ticker = ticker.toUpperCase();
  if (options?.published_utc_gte) params['published_utc.gte'] = options.published_utc_gte;
  if (options?.published_utc_lte) params['published_utc.lte'] = options.published_utc_lte;

  const data = await polygonFetch<{ results: PolygonNewsArticle[] }>('/v2/reference/news', params);
  return data?.results || [];
}

/**
 * Get news with sentiment analysis for a ticker
 */
export async function getNewsWithSentiment(ticker: string, limit: number = 20): Promise<{
  articles: PolygonNewsArticle[];
  sentimentSummary: {
    positive: number;
    negative: number;
    neutral: number;
    avgSentiment: number;
  };
}> {
  const articles = await getNews(ticker, { limit });

  let positive = 0, negative = 0, neutral = 0;

  for (const article of articles) {
    const tickerInsight = article.insights?.find(i => i.ticker === ticker.toUpperCase());
    if (tickerInsight) {
      if (tickerInsight.sentiment === 'positive') positive++;
      else if (tickerInsight.sentiment === 'negative') negative++;
      else neutral++;
    }
  }

  const total = positive + negative + neutral;
  const avgSentiment = total > 0 ? (positive - negative) / total : 0;

  return {
    articles,
    sentimentSummary: { positive, negative, neutral, avgSentiment },
  };
}

// ============================================================================
// FINANCIALS
// ============================================================================

/**
 * Get financial statements
 */
export async function getFinancials(
  ticker: string,
  options?: {
    type?: 'Y' | 'Q' | 'YA' | 'QA' | 'T' | 'TTM';
    filing_date_gte?: string;
    filing_date_lte?: string;
    period_of_report_date_gte?: string;
    period_of_report_date_lte?: string;
    limit?: number;
    sort?: 'filing_date' | 'period_of_report_date';
    order?: 'asc' | 'desc';
  }
): Promise<PolygonFinancials[]> {
  const params: Record<string, string | number | boolean> = {
    limit: options?.limit || 20,
    order: options?.order || 'desc',
  };

  if (options?.type) params.timeframe = options.type;
  if (options?.filing_date_gte) params['filing_date.gte'] = options.filing_date_gte;
  if (options?.filing_date_lte) params['filing_date.lte'] = options.filing_date_lte;

  const data = await polygonFetch<{ results: PolygonFinancials[] }>(
    `/vX/reference/financials`,
    { ticker: ticker.toUpperCase(), ...params }
  );

  return data?.results || [];
}

// ============================================================================
// DIVIDENDS & SPLITS
// ============================================================================

/**
 * Get dividend history
 */
export async function getDividends(
  ticker: string,
  options?: {
    ex_dividend_date_gte?: string;
    ex_dividend_date_lte?: string;
    limit?: number;
  }
): Promise<PolygonDividend[]> {
  const params: Record<string, string | number | boolean> = {
    ticker: ticker.toUpperCase(),
    limit: options?.limit || 50,
  };

  if (options?.ex_dividend_date_gte) params['ex_dividend_date.gte'] = options.ex_dividend_date_gte;
  if (options?.ex_dividend_date_lte) params['ex_dividend_date.lte'] = options.ex_dividend_date_lte;

  const data = await polygonFetch<{ results: PolygonDividend[] }>('/v3/reference/dividends', params);
  return data?.results || [];
}

/**
 * Get stock split history
 */
export async function getSplits(
  ticker: string,
  options?: {
    execution_date_gte?: string;
    execution_date_lte?: string;
    limit?: number;
  }
): Promise<PolygonSplit[]> {
  const params: Record<string, string | number | boolean> = {
    ticker: ticker.toUpperCase(),
    limit: options?.limit || 50,
  };

  if (options?.execution_date_gte) params['execution_date.gte'] = options.execution_date_gte;
  if (options?.execution_date_lte) params['execution_date.lte'] = options.execution_date_lte;

  const data = await polygonFetch<{ results: PolygonSplit[] }>('/v3/reference/splits', params);
  return data?.results || [];
}

// ============================================================================
// INSIDER TRANSACTIONS
// ============================================================================

/**
 * Get insider transactions
 */
export async function getInsiderTransactions(
  ticker: string,
  options?: {
    filing_date_gte?: string;
    filing_date_lte?: string;
    limit?: number;
  }
): Promise<PolygonInsiderTransaction[]> {
  const params: Record<string, string | number | boolean> = {
    ticker: ticker.toUpperCase(),
    limit: options?.limit || 100,
  };

  if (options?.filing_date_gte) params['filing_date.gte'] = options.filing_date_gte;
  if (options?.filing_date_lte) params['filing_date.lte'] = options.filing_date_lte;

  const data = await polygonFetch<{ results: PolygonInsiderTransaction[] }>(
    '/v3/reference/insider-transactions',
    params
  );

  return data?.results || [];
}

/**
 * Get insider transaction summary (net buying/selling)
 */
export async function getInsiderSummary(ticker: string, days: number = 90): Promise<{
  totalBuys: number;
  totalSells: number;
  netShares: number;
  netValue: number;
  buyCount: number;
  sellCount: number;
  recentTransactions: PolygonInsiderTransaction[];
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const transactions = await getInsiderTransactions(ticker, { filing_date_gte: since });

  let totalBuys = 0, totalSells = 0, netValue = 0, buyCount = 0, sellCount = 0;

  for (const tx of transactions) {
    if (tx.acquisition_or_disposition === 'A') {
      totalBuys += tx.shares;
      netValue += tx.total_value || 0;
      buyCount++;
    } else {
      totalSells += tx.shares;
      netValue -= tx.total_value || 0;
      sellCount++;
    }
  }

  return {
    totalBuys,
    totalSells,
    netShares: totalBuys - totalSells,
    netValue,
    buyCount,
    sellCount,
    recentTransactions: transactions.slice(0, 10),
  };
}

// ============================================================================
// MARKET STATUS
// ============================================================================

/**
 * Get current market status
 */
export async function getMarketStatus(): Promise<PolygonMarketStatus | null> {
  return polygonFetch<PolygonMarketStatus>('/v1/marketstatus/now');
}

// ============================================================================
// TECHNICAL INDICATORS
// ============================================================================

export interface TechnicalIndicator {
  timestamp: number;
  value: number;
}

/**
 * Calculate SMA (Simple Moving Average)
 */
export async function getSMA(
  ticker: string,
  window: number = 20,
  timespan: 'day' | 'week' | 'month' = 'day',
  seriesType: 'close' | 'open' | 'high' | 'low' = 'close'
): Promise<TechnicalIndicator[]> {
  const data = await polygonFetch<{ results: { values: TechnicalIndicator[] } }>(
    `/v1/indicators/sma/${ticker.toUpperCase()}`,
    { timespan, 'window': window, series_type: seriesType }
  );

  return data?.results?.values || [];
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
export async function getEMA(
  ticker: string,
  window: number = 20,
  timespan: 'day' | 'week' | 'month' = 'day',
  seriesType: 'close' | 'open' | 'high' | 'low' = 'close'
): Promise<TechnicalIndicator[]> {
  const data = await polygonFetch<{ results: { values: TechnicalIndicator[] } }>(
    `/v1/indicators/ema/${ticker.toUpperCase()}`,
    { timespan, 'window': window, series_type: seriesType }
  );

  return data?.results?.values || [];
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export async function getRSI(
  ticker: string,
  window: number = 14,
  timespan: 'day' | 'week' | 'month' = 'day'
): Promise<TechnicalIndicator[]> {
  const data = await polygonFetch<{ results: { values: TechnicalIndicator[] } }>(
    `/v1/indicators/rsi/${ticker.toUpperCase()}`,
    { timespan, 'window': window }
  );

  return data?.results?.values || [];
}

/**
 * Calculate MACD
 */
export async function getMACD(
  ticker: string,
  timespan: 'day' | 'week' | 'month' = 'day',
  shortWindow: number = 12,
  longWindow: number = 26,
  signalWindow: number = 9
): Promise<{
  timestamp: number;
  value: number;
  signal: number;
  histogram: number;
}[]> {
  const data = await polygonFetch<{
    results: {
      values: { timestamp: number; value: number; signal: number; histogram: number }[];
    };
  }>(
    `/v1/indicators/macd/${ticker.toUpperCase()}`,
    { timespan, short_window: shortWindow, long_window: longWindow, signal_window: signalWindow }
  );

  return data?.results?.values || [];
}

// ============================================================================
// COMPREHENSIVE DATA FETCH
// ============================================================================

export interface ComprehensivePolygonData {
  ticker: string;
  details: PolygonTicker | null;
  snapshot: PolygonSnapshot | null;
  dailyBars: PolygonAggregateBar[];
  news: PolygonNewsArticle[];
  dividends: PolygonDividend[];
  splits: PolygonSplit[];
  insiderSummary: Awaited<ReturnType<typeof getInsiderSummary>> | null;
  technicals: {
    sma20: TechnicalIndicator[];
    sma50: TechnicalIndicator[];
    sma200: TechnicalIndicator[];
    rsi: TechnicalIndicator[];
    macd: Awaited<ReturnType<typeof getMACD>>;
  } | null;
}

/**
 * Fetch comprehensive data for a ticker from Polygon
 */
export async function fetchComprehensivePolygonData(
  ticker: string,
  options?: {
    includeTechnicals?: boolean;
    newsLimit?: number;
    barDays?: number;
  }
): Promise<ComprehensivePolygonData> {
  const upperTicker = ticker.toUpperCase();

  // Fetch all data in parallel
  const [
    details,
    snapshot,
    dailyBars,
    news,
    dividends,
    splits,
    insiderSummary,
  ] = await Promise.all([
    getTickerDetails(upperTicker),
    getSnapshot(upperTicker),
    getDailyBars(upperTicker, options?.barDays || 365),
    getNews(upperTicker, { limit: options?.newsLimit || 20 }),
    getDividends(upperTicker, { limit: 10 }),
    getSplits(upperTicker, { limit: 10 }),
    getInsiderSummary(upperTicker, 90),
  ]);

  // Optionally fetch technicals (more API calls)
  let technicals: ComprehensivePolygonData['technicals'] = null;

  if (options?.includeTechnicals) {
    const [sma20, sma50, sma200, rsi, macd] = await Promise.all([
      getSMA(upperTicker, 20),
      getSMA(upperTicker, 50),
      getSMA(upperTicker, 200),
      getRSI(upperTicker, 14),
      getMACD(upperTicker),
    ]);

    technicals = { sma20, sma50, sma200, rsi, macd };
  }

  return {
    ticker: upperTicker,
    details,
    snapshot,
    dailyBars,
    news,
    dividends,
    splits,
    insiderSummary,
    technicals,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if Polygon API is configured
 */
export function isPolygonConfigured(): boolean {
  return !!POLYGON_API_KEY;
}

/**
 * Get API status
 */
export async function checkPolygonStatus(): Promise<{
  configured: boolean;
  working: boolean;
  marketOpen: boolean;
}> {
  const configured = isPolygonConfigured();
  if (!configured) {
    return { configured: false, working: false, marketOpen: false };
  }

  const status = await getMarketStatus();
  return {
    configured: true,
    working: !!status,
    marketOpen: status?.market === 'open',
  };
}

export default {
  getTickerDetails,
  searchTickers,
  getAggregates,
  getDailyBars,
  getIntradayBars,
  getPreviousClose,
  getSnapshot,
  getSnapshots,
  getGainers,
  getLosers,
  getNews,
  getNewsWithSentiment,
  getFinancials,
  getDividends,
  getSplits,
  getInsiderTransactions,
  getInsiderSummary,
  getMarketStatus,
  getSMA,
  getEMA,
  getRSI,
  getMACD,
  fetchComprehensivePolygonData,
  isPolygonConfigured,
  checkPolygonStatus,
};
