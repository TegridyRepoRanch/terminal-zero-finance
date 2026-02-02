// Unified Data Service
// Orchestrates data collection from multiple sources with incremental updates
// Priority: XBRL > API sources > AI extraction

import { supabase, isSupabaseConfigured } from './supabase';
import { fetchAllFinnhubData, isFinnhubConfigured } from './finnhub-api';
import { fetchAllAlphaVantageData, isAlphaVantageConfigured } from './alpha-vantage-api';
import { type XBRLExtractionResult } from './xbrl-extractor';
import { chunkSecFiling, getKeyFinancialSections, type FilingChunk } from './filing-chunker';
import type { ExtractedFinancials } from './extraction-types';

// Data source priority (higher = preferred)
export const DATA_SOURCE_PRIORITY = {
  sec_xbrl: 100,           // Most reliable - structured regulatory data
  alpha_vantage: 80,       // 20+ years historical, audited
  finnhub: 70,             // Good real-time data, decent fundamentals
  sec_ai_extraction: 50,   // AI-extracted from filing text
  yahoo_finance: 30,       // Less reliable, use for real-time prices only
  manual_entry: 90,        // User corrections are highly trusted
  calculated: 60,          // Derived values
} as const;

export type DataSourceType = keyof typeof DATA_SOURCE_PRIORITY;

// Metric categories for organization
export const METRIC_CATEGORIES = {
  // Income Statement
  revenue: 'income_statement',
  costOfRevenue: 'income_statement',
  grossProfit: 'income_statement',
  operatingExpenses: 'income_statement',
  sgaExpense: 'income_statement',
  rdExpense: 'income_statement',
  depreciationAmortization: 'income_statement',
  operatingIncome: 'income_statement',
  interestExpense: 'income_statement',
  incomeBeforeTax: 'income_statement',
  incomeTaxExpense: 'income_statement',
  netIncome: 'income_statement',
  ebit: 'income_statement',
  ebitda: 'income_statement',

  // Balance Sheet
  totalAssets: 'balance_sheet',
  totalCurrentAssets: 'balance_sheet',
  cashAndEquivalents: 'balance_sheet',
  accountsReceivable: 'balance_sheet',
  inventory: 'balance_sheet',
  propertyPlantEquipment: 'balance_sheet',
  goodwill: 'balance_sheet',
  intangibleAssets: 'balance_sheet',
  totalLiabilities: 'balance_sheet',
  totalCurrentLiabilities: 'balance_sheet',
  accountsPayable: 'balance_sheet',
  shortTermDebt: 'balance_sheet',
  longTermDebt: 'balance_sheet',
  totalDebt: 'balance_sheet',
  totalEquity: 'balance_sheet',
  retainedEarnings: 'balance_sheet',
  sharesOutstanding: 'balance_sheet',

  // Cash Flow
  operatingCashFlow: 'cash_flow',
  capitalExpenditures: 'cash_flow',
  freeCashFlow: 'cash_flow',
  dividendsPaid: 'cash_flow',

  // Ratios
  peRatio: 'ratio',
  pbRatio: 'ratio',
  psRatio: 'ratio',
  epsAnnual: 'ratio',
  epsTTM: 'ratio',
  grossMargin: 'ratio',
  operatingMargin: 'ratio',
  netProfitMargin: 'ratio',
  roe: 'ratio',
  roa: 'ratio',
  currentRatio: 'ratio',
  quickRatio: 'ratio',
  debtToEquity: 'ratio',

  // Market data
  currentPrice: 'market',
  marketCap: 'market',
  beta: 'market',
  dividendYield: 'market',
  week52High: 'market',
  week52Low: 'market',
} as const;

// Required metrics for DCF modeling
export const REQUIRED_DCF_METRICS = [
  'revenue',
  'grossProfit',
  'operatingIncome',
  'netIncome',
  'totalAssets',
  'totalLiabilities',
  'totalEquity',
  'operatingCashFlow',
  'capitalExpenditures',
  'freeCashFlow',
  'sharesOutstanding',
];

export interface CompanyDataStatus {
  ticker: string;
  companyId: string | null;
  companyName: string | null;
  dataCompleteness: number;
  missingMetrics: string[];
  availableSources: DataSourceType[];
  lastUpdated: Date | null;
  incomeStatementComplete: boolean;
  balanceSheetComplete: boolean;
  cashFlowComplete: boolean;
}

export interface DataFetchResult {
  success: boolean;
  ticker: string;
  metricsUpdated: number;
  metricsUnchanged: number;
  metricsFailed: number;
  sources: DataSourceType[];
  errors: string[];
  processingTimeMs: number;
}

export interface SmartExtractionOptions {
  useXBRL: boolean;
  useAPIs: boolean;
  useAIExtraction: boolean;
  onlyMissingFields: boolean;      // Only extract fields not already in DB
  maxAIChunks: number;             // Limit AI extraction to N most relevant chunks
  skipSections?: string[];         // Skip these sections in AI extraction
  targetSections?: string[];       // Only extract from these sections
}

const DEFAULT_OPTIONS: SmartExtractionOptions = {
  useXBRL: true,
  useAPIs: true,
  useAIExtraction: true,
  onlyMissingFields: true,
  maxAIChunks: 10,
  targetSections: ['Item 7', 'Item 8', 'Item 1A'],  // MD&A, Financials, Risk Factors
};

/**
 * Get or create company record in database
 */
export async function getOrCreateCompany(
  ticker: string,
  name?: string,
  cik?: string
): Promise<{ id: string; isNew: boolean }> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('[UnifiedData] Supabase not configured, returning mock company');
    return { id: `local-${ticker}`, isNew: true };
  }

  const normalizedTicker = ticker.toUpperCase();

  // Try to find existing company
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('ticker', normalizedTicker)
    .single();

  if (existing) {
    return { id: existing.id, isNew: false };
  }

  // Create new company
  const { data: newCompany, error } = await supabase
    .from('companies')
    .insert({
      ticker: normalizedTicker,
      name: name || normalizedTicker,
      cik: cik,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[UnifiedData] Failed to create company:', error);
    throw new Error(`Failed to create company: ${error.message}`);
  }

  return { id: newCompany.id, isNew: true };
}

/**
 * Check what data we already have for a company
 */
export async function getCompanyDataStatus(ticker: string): Promise<CompanyDataStatus> {
  const normalizedTicker = ticker.toUpperCase();

  const defaultStatus: CompanyDataStatus = {
    ticker: normalizedTicker,
    companyId: null,
    companyName: null,
    dataCompleteness: 0,
    missingMetrics: [...REQUIRED_DCF_METRICS],
    availableSources: [],
    lastUpdated: null,
    incomeStatementComplete: false,
    balanceSheetComplete: false,
    cashFlowComplete: false,
  };

  if (!isSupabaseConfigured || !supabase) {
    return defaultStatus;
  }

  // Get company
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('ticker', normalizedTicker)
    .single();

  if (!company) {
    return defaultStatus;
  }

  // Get existing metrics
  const { data: metrics } = await supabase
    .from('financial_metrics')
    .select('metric_name, source, updated_at')
    .eq('company_id', company.id);

  const foundMetrics = new Set(metrics?.map(m => m.metric_name) || []);
  const sources = new Set(metrics?.map(m => m.source as DataSourceType) || []);
  const latestUpdate = metrics?.reduce((latest, m) => {
    const updated = new Date(m.updated_at);
    return updated > latest ? updated : latest;
  }, new Date(0));

  const missingMetrics = REQUIRED_DCF_METRICS.filter(m => !foundMetrics.has(m));

  // Check category completeness
  const incomeMetrics = ['revenue', 'grossProfit', 'operatingIncome', 'netIncome'];
  const balanceMetrics = ['totalAssets', 'totalLiabilities', 'totalEquity'];
  const cashFlowMetrics = ['operatingCashFlow', 'capitalExpenditures', 'freeCashFlow'];

  return {
    ticker: normalizedTicker,
    companyId: company.id,
    companyName: company.name,
    dataCompleteness: Math.round((foundMetrics.size / REQUIRED_DCF_METRICS.length) * 100),
    missingMetrics,
    availableSources: Array.from(sources),
    lastUpdated: latestUpdate && latestUpdate.getTime() > 0 ? latestUpdate : null,
    incomeStatementComplete: incomeMetrics.every(m => foundMetrics.has(m)),
    balanceSheetComplete: balanceMetrics.every(m => foundMetrics.has(m)),
    cashFlowComplete: cashFlowMetrics.every(m => foundMetrics.has(m)),
  };
}

/**
 * Store a single financial metric to the database
 */
async function storeMetric(
  companyId: string,
  metricName: string,
  value: number | null,
  periodEndDate: string,
  fiscalYear: number,
  fiscalQuarter: number | null,
  periodType: 'annual' | 'quarterly' | 'ttm' | 'point_in_time',
  source: DataSourceType,
  confidenceScore: number = 100,
  sourceFilingAccession?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || value === null || value === undefined) {
    return false;
  }

  const category = METRIC_CATEGORIES[metricName as keyof typeof METRIC_CATEGORIES] || 'other';

  try {
    const { error } = await supabase.rpc('upsert_financial_metric', {
      p_company_id: companyId,
      p_metric_name: metricName,
      p_metric_category: category,
      p_metric_value: value,
      p_period_type: periodType,
      p_period_end_date: periodEndDate,
      p_fiscal_year: fiscalYear,
      p_fiscal_quarter: fiscalQuarter,
      p_source: source,
      p_confidence_score: confidenceScore,
      p_source_filing_accession: sourceFilingAccession || null,
    });

    if (error) {
      console.error(`[UnifiedData] Failed to store metric ${metricName}:`, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[UnifiedData] Error storing metric ${metricName}:`, e);
    return false;
  }
}

/**
 * Fetch and store data from Finnhub
 */
export async function fetchFromFinnhub(
  ticker: string,
  companyId: string
): Promise<{ metricsStored: number; errors: string[] }> {
  if (!isFinnhubConfigured()) {
    return { metricsStored: 0, errors: ['Finnhub API not configured'] };
  }

  const errors: string[] = [];
  let metricsStored = 0;

  try {
    console.log(`[UnifiedData] Fetching Finnhub data for ${ticker}`);
    const data = await fetchAllFinnhubData(ticker);

    // Store ratio/market metrics (TTM or current)
    const today = new Date().toISOString().split('T')[0];
    const thisYear = new Date().getFullYear();

    const metricsToStore: Array<{ name: string; value: number | undefined; periodType: 'ttm' | 'point_in_time' }> = [
      { name: 'peRatio', value: data.peRatio, periodType: 'ttm' },
      { name: 'pbRatio', value: data.pbRatio, periodType: 'ttm' },
      { name: 'psRatio', value: data.psRatio, periodType: 'ttm' },
      { name: 'epsAnnual', value: data.epsAnnual, periodType: 'ttm' },
      { name: 'epsTTM', value: data.epsTTM, periodType: 'ttm' },
      { name: 'grossMargin', value: data.grossMargin, periodType: 'ttm' },
      { name: 'operatingMargin', value: data.operatingMargin, periodType: 'ttm' },
      { name: 'netProfitMargin', value: data.netProfitMargin, periodType: 'ttm' },
      { name: 'roe', value: data.roe, periodType: 'ttm' },
      { name: 'roa', value: data.roa, periodType: 'ttm' },
      { name: 'currentRatio', value: data.currentRatio, periodType: 'point_in_time' },
      { name: 'quickRatio', value: data.quickRatio, periodType: 'point_in_time' },
      { name: 'debtToEquity', value: data.debtToEquity, periodType: 'point_in_time' },
      { name: 'currentPrice', value: data.currentPrice, periodType: 'point_in_time' },
      { name: 'marketCap', value: data.marketCap, periodType: 'point_in_time' },
      { name: 'beta', value: data.beta, periodType: 'point_in_time' },
      { name: 'dividendYield', value: data.dividendYield, periodType: 'ttm' },
      { name: 'week52High', value: data.week52High, periodType: 'point_in_time' },
      { name: 'week52Low', value: data.week52Low, periodType: 'point_in_time' },
      { name: 'sharesOutstanding', value: data.sharesOutstanding, periodType: 'point_in_time' },
    ];

    for (const metric of metricsToStore) {
      if (metric.value !== undefined && metric.value !== null) {
        const stored = await storeMetric(
          companyId,
          metric.name,
          metric.value,
          today,
          thisYear,
          null,
          metric.periodType,
          'finnhub',
          85  // Good confidence for API data
        );
        if (stored) metricsStored++;
      }
    }

    // Update company profile
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('companies')
        .update({
          name: data.companyName,
          industry: data.industry,
          exchange: data.exchange,
          finnhub_last_sync: new Date().toISOString(),
        })
        .eq('id', companyId);
    }

    console.log(`[UnifiedData] Stored ${metricsStored} metrics from Finnhub`);
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    errors.push(`Finnhub: ${errorMsg}`);
    console.error('[UnifiedData] Finnhub fetch error:', e);
  }

  return { metricsStored, errors };
}

/**
 * Fetch and store data from Alpha Vantage
 */
export async function fetchFromAlphaVantage(
  ticker: string,
  companyId: string
): Promise<{ metricsStored: number; errors: string[] }> {
  if (!isAlphaVantageConfigured()) {
    return { metricsStored: 0, errors: ['Alpha Vantage API not configured'] };
  }

  const errors: string[] = [];
  let metricsStored = 0;

  try {
    console.log(`[UnifiedData] Fetching Alpha Vantage data for ${ticker}`);
    const data = await fetchAllAlphaVantageData(ticker);

    // Store annual periods
    for (const period of data.annualPeriods) {
      const metricPairs: Array<[string, number | null]> = [
        ['revenue', period.revenue],
        ['costOfRevenue', period.costOfRevenue],
        ['grossProfit', period.grossProfit],
        ['operatingExpenses', period.operatingExpenses],
        ['sgaExpense', period.sgaExpense],
        ['rdExpense', period.rdExpense],
        ['depreciationAmortization', period.depreciationAmortization],
        ['operatingIncome', period.operatingIncome],
        ['interestExpense', period.interestExpense],
        ['incomeBeforeTax', period.incomeBeforeTax],
        ['incomeTaxExpense', period.incomeTaxExpense],
        ['netIncome', period.netIncome],
        ['ebit', period.ebit],
        ['ebitda', period.ebitda],
        ['totalAssets', period.totalAssets],
        ['totalCurrentAssets', period.totalCurrentAssets],
        ['cashAndEquivalents', period.cashAndEquivalents],
        ['accountsReceivable', period.accountsReceivable],
        ['inventory', period.inventory],
        ['propertyPlantEquipment', period.propertyPlantEquipment],
        ['goodwill', period.goodwill],
        ['intangibleAssets', period.intangibleAssets],
        ['totalLiabilities', period.totalLiabilities],
        ['totalCurrentLiabilities', period.totalCurrentLiabilities],
        ['accountsPayable', period.accountsPayable],
        ['shortTermDebt', period.shortTermDebt],
        ['longTermDebt', period.longTermDebt],
        ['totalDebt', period.totalDebt],
        ['totalEquity', period.totalEquity],
        ['retainedEarnings', period.retainedEarnings],
        ['sharesOutstanding', period.sharesOutstanding],
        ['operatingCashFlow', period.operatingCashFlow],
        ['capitalExpenditures', period.capitalExpenditures],
        ['freeCashFlow', period.freeCashFlow],
        ['dividendsPaid', period.dividendsPaid],
      ];

      for (const [metricName, value] of metricPairs) {
        if (value !== null && value !== undefined) {
          const stored = await storeMetric(
            companyId,
            metricName,
            value,
            period.periodEndDate,
            period.fiscalYear,
            null,
            'annual',
            'alpha_vantage',
            90  // High confidence for audited data
          );
          if (stored) metricsStored++;
        }
      }
    }

    // Update company info
    if (isSupabaseConfigured && supabase && data.overview.Name) {
      await supabase
        .from('companies')
        .update({
          name: data.overview.Name,
          sector: data.overview.Sector,
          industry: data.overview.Industry,
          cik: data.overview.CIK,
          alpha_vantage_last_sync: new Date().toISOString(),
        })
        .eq('id', companyId);
    }

    console.log(`[UnifiedData] Stored ${metricsStored} metrics from Alpha Vantage`);
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    errors.push(`Alpha Vantage: ${errorMsg}`);
    console.error('[UnifiedData] Alpha Vantage fetch error:', e);
  }

  return { metricsStored, errors };
}

/**
 * Store metrics from XBRL extraction
 */
export async function storeXBRLMetrics(
  companyId: string,
  extraction: XBRLExtractionResult,
  filingAccession: string,
  filingDate: string
): Promise<{ metricsStored: number; errors: string[] }> {
  const errors: string[] = [];
  let metricsStored = 0;

  const financials = extraction.financials;
  const fiscalYear = financials.fiscalYear || new Date(filingDate).getFullYear();
  const periodType = financials.filingType === '10-Q' ? 'quarterly' : 'annual';
  const fiscalQuarter = periodType === 'quarterly' ? getFiscalQuarter(filingDate) : null;

  // Map of our field names to metric names
  const metricMappings: Array<[keyof ExtractedFinancials, string]> = [
    ['revenue', 'revenue'],
    ['costOfRevenue', 'costOfRevenue'],
    ['grossProfit', 'grossProfit'],
    ['operatingExpenses', 'operatingExpenses'],
    ['sgaExpense', 'sgaExpense'],
    ['rdExpense', 'rdExpense'],
    ['depreciationAmortization', 'depreciationAmortization'],
    ['operatingIncome', 'operatingIncome'],
    ['interestExpense', 'interestExpense'],
    ['incomeBeforeTax', 'incomeBeforeTax'],
    ['incomeTaxExpense', 'incomeTaxExpense'],
    ['netIncome', 'netIncome'],
    ['totalAssets', 'totalAssets'],
    ['totalCurrentAssets', 'totalCurrentAssets'],
    ['cashAndEquivalents', 'cashAndEquivalents'],
    ['accountsReceivable', 'accountsReceivable'],
    ['inventory', 'inventory'],
    ['propertyPlantEquipment', 'propertyPlantEquipment'],
    ['totalLiabilities', 'totalLiabilities'],
    ['totalCurrentLiabilities', 'totalCurrentLiabilities'],
    ['accountsPayable', 'accountsPayable'],
    ['shortTermDebt', 'shortTermDebt'],
    ['longTermDebt', 'longTermDebt'],
    ['totalDebt', 'totalDebt'],
    ['totalEquity', 'totalEquity'],
    ['retainedEarnings', 'retainedEarnings'],
    ['sharesOutstandingBasic', 'sharesOutstanding'],
    ['operatingCashFlow', 'operatingCashFlow'],
    ['capitalExpenditures', 'capitalExpenditures'],
    ['freeCashFlow', 'freeCashFlow'],
  ];

  // Source type determined per-field based on XBRL vs AI extraction
  for (const [fieldName, metricName] of metricMappings) {
    const value = financials[fieldName];
    if (typeof value === 'number' && !isNaN(value)) {
      // Adjust confidence based on whether field was from XBRL or AI
      const fromXBRL = extraction.xbrlFieldsUsed.includes(fieldName as string);
      const confidence = fromXBRL ? 95 : 75;

      const stored = await storeMetric(
        companyId,
        metricName,
        value,
        filingDate,
        fiscalYear,
        fiscalQuarter,
        periodType === 'quarterly' ? 'quarterly' : 'annual',
        fromXBRL ? 'sec_xbrl' : 'sec_ai_extraction',
        confidence,
        filingAccession
      );
      if (stored) metricsStored++;
    }
  }

  console.log(`[UnifiedData] Stored ${metricsStored} metrics from XBRL extraction`);
  return { metricsStored, errors };
}

/**
 * Determine fiscal quarter from date
 */
function getFiscalQuarter(dateStr: string): number {
  const month = new Date(dateStr).getMonth() + 1;
  return Math.ceil(month / 3);
}

/**
 * Smart extraction: Use chunking to minimize AI calls
 * Only sends relevant sections to AI
 */
export async function smartExtractFromFiling(
  rawHtml: string,
  filingType: '10-K' | '10-Q',
  _missingFields: string[], // Reserved for targeted extraction
  options: Partial<SmartExtractionOptions> = {}
): Promise<{
  chunks: FilingChunk[];
  relevantChunks: FilingChunk[];
  extractedText: string;
  estimatedTokens: number;
}> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Chunk the filing
  const chunked = chunkSecFiling(rawHtml, filingType);
  console.log(`[SmartExtract] Created ${chunked.chunks.length} chunks from filing`);

  // Get key sections for financial analysis
  let relevantChunks = getKeyFinancialSections(chunked);

  // Filter to target sections if specified
  if (opts.targetSections && opts.targetSections.length > 0) {
    relevantChunks = relevantChunks.filter(chunk =>
      opts.targetSections!.some(section =>
        chunk.sectionName.toLowerCase().includes(section.toLowerCase()) ||
        chunk.sectionTitle.toLowerCase().includes(section.toLowerCase())
      )
    );
  }

  // Skip certain sections
  if (opts.skipSections && opts.skipSections.length > 0) {
    relevantChunks = relevantChunks.filter(chunk =>
      !opts.skipSections!.some(section =>
        chunk.sectionName.toLowerCase().includes(section.toLowerCase())
      )
    );
  }

  // Limit chunks if specified
  if (opts.maxAIChunks && relevantChunks.length > opts.maxAIChunks) {
    // Prioritize Item 8 (Financial Statements) and Item 7 (MD&A)
    relevantChunks.sort((a, b) => {
      const priorityOrder = ['Item 8', 'Item 7', 'Item 1A'];
      const aIdx = priorityOrder.findIndex(p => a.sectionName.includes(p));
      const bIdx = priorityOrder.findIndex(p => b.sectionName.includes(p));
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
    relevantChunks = relevantChunks.slice(0, opts.maxAIChunks);
  }

  // Combine relevant chunks into text
  const extractedText = relevantChunks.map(c => c.content).join('\n\n---\n\n');
  const estimatedTokens = Math.ceil(extractedText.length / 4);

  console.log(`[SmartExtract] Selected ${relevantChunks.length} chunks (~${estimatedTokens} tokens)`);

  return {
    chunks: chunked.chunks,
    relevantChunks,
    extractedText,
    estimatedTokens,
  };
}

/**
 * Main entry point: Fetch all available data for a company
 * Uses multiple sources with priority-based merging
 */
export async function fetchCompanyData(
  ticker: string,
  options: Partial<SmartExtractionOptions> = {},
  onProgress?: (message: string) => void
): Promise<DataFetchResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];
  const sources: DataSourceType[] = [];
  let metricsUpdated = 0;
  let metricsUnchanged = 0;
  let metricsFailed = 0;

  try {
    onProgress?.(`Starting data fetch for ${ticker}...`);

    // Step 1: Get or create company record
    const { id: companyId, isNew } = await getOrCreateCompany(ticker);
    onProgress?.(isNew ? `Created new company record for ${ticker}` : `Found existing data for ${ticker}`);

    // Step 2: Check what data we already have
    const status = await getCompanyDataStatus(ticker);
    console.log(`[UnifiedData] Current data completeness: ${status.dataCompleteness}%`);
    console.log(`[UnifiedData] Missing metrics: ${status.missingMetrics.join(', ')}`);

    // Step 3: Fetch from APIs if enabled
    if (opts.useAPIs) {
      // Finnhub for real-time data and ratios
      if (isFinnhubConfigured()) {
        onProgress?.('Fetching from Finnhub...');
        const finnhubResult = await fetchFromFinnhub(ticker, companyId);
        metricsUpdated += finnhubResult.metricsStored;
        errors.push(...finnhubResult.errors);
        if (finnhubResult.metricsStored > 0) sources.push('finnhub');
      }

      // Alpha Vantage for historical financials (rate limit aware)
      if (isAlphaVantageConfigured()) {
        onProgress?.('Fetching from Alpha Vantage...');
        const avResult = await fetchFromAlphaVantage(ticker, companyId);
        metricsUpdated += avResult.metricsStored;
        errors.push(...avResult.errors);
        if (avResult.metricsStored > 0) sources.push('alpha_vantage');
      }
    }

    const processingTimeMs = Date.now() - startTime;
    onProgress?.(`Data fetch complete in ${processingTimeMs}ms`);

    return {
      success: true,
      ticker: ticker.toUpperCase(),
      metricsUpdated,
      metricsUnchanged,
      metricsFailed,
      sources,
      errors,
      processingTimeMs,
    };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    errors.push(errorMsg);

    return {
      success: false,
      ticker: ticker.toUpperCase(),
      metricsUpdated,
      metricsUnchanged,
      metricsFailed,
      sources,
      errors,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Record processing history for debugging and optimization
 */
export async function recordProcessingHistory(
  companyId: string,
  sourceType: DataSourceType,
  sourceIdentifier: string,
  status: 'started' | 'completed' | 'failed' | 'partial',
  metrics: {
    extracted: number;
    updated: number;
    unchanged: number;
    failed: number;
  },
  fieldsExtracted: string[],
  fieldsMissing: string[],
  processingTimeMs: number,
  aiTokensUsed: number = 0
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    await supabase.from('processing_history').insert({
      company_id: companyId,
      source_type: sourceType,
      source_identifier: sourceIdentifier,
      processing_status: status,
      metrics_extracted: metrics.extracted,
      metrics_updated: metrics.updated,
      metrics_unchanged: metrics.unchanged,
      metrics_failed: metrics.failed,
      fields_extracted: fieldsExtracted,
      fields_missing: fieldsMissing,
      processing_time_ms: processingTimeMs,
      ai_tokens_used: aiTokensUsed,
      completed_at: status !== 'started' ? new Date().toISOString() : null,
    });
  } catch (e) {
    console.error('[UnifiedData] Failed to record processing history:', e);
  }
}
