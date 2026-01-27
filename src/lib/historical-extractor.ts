// Historical Data Extractor
// Extracts and processes multi-year financial data from SEC filings

import type { SECFiling } from './sec-edgar-client';
import type {
  ExtractedFinancials,
  HistoricalDataPoint,
  HistoricalFinancials,
  HistoricalStats,
  ExtractionSource,
  FilingType,
} from './extraction-types';
import { tryExtractFromXBRL } from './xbrl-extractor';
import { detectIXBRL } from './xbrl-parser';
import { extractFinancialsWithGemini } from './gemini-client';
import { getGeminiApiKey, hasGeminiKey } from './api-config';

interface FilingDocument {
  text: string;
  rawHtml: string;
  url: string;
  metadata: SECFiling;
}

/**
 * Extract financial data from a single filing
 */
async function extractSingleFiling(
  doc: FilingDocument,
  onProgress?: (message: string) => void
): Promise<{ data: ExtractedFinancials; source: ExtractionSource; confidence: number } | null> {
  try {
    const filingType = doc.metadata.form as FilingType;

    // Try XBRL extraction first
    if (detectIXBRL(doc.rawHtml)) {
      onProgress?.(`Parsing XBRL data from ${doc.metadata.filingDate} filing...`);
      const xbrlResult = tryExtractFromXBRL(doc.rawHtml, filingType === '10-K' ? '10-K' : '10-Q');

      if (xbrlResult && xbrlResult.financials) {
        // If XBRL coverage is good, use it
        const coverage = xbrlResult.xbrlFieldsUsed?.length || 0;
        if (coverage >= 15) {
          return {
            data: xbrlResult.financials,
            source: xbrlResult.source || 'xbrl',
            confidence: xbrlResult.confidence?.overall || 0.9,
          };
        }
      }
    }

    // Fall back to AI extraction if API key available
    if (!hasGeminiKey()) {
      console.warn('[Historical] No Gemini API key available for AI extraction');
      return null;
    }

    onProgress?.(`Extracting data from ${doc.metadata.filingDate} filing with AI...`);
    const apiKey = getGeminiApiKey();
    const aiResult = await extractFinancialsWithGemini(doc.text, apiKey, onProgress, true); // Use Flash for speed

    if (aiResult.financials) {
      return {
        data: aiResult.financials,
        source: 'ai',
        confidence: aiResult.confidence?.overall || 0.7,
      };
    }

    return null;
  } catch (error) {
    console.error(`[Historical] Failed to extract from ${doc.metadata.filingDate}:`, error);
    return null;
  }
}

/**
 * Convert extracted financials to a historical data point
 */
function toHistoricalDataPoint(
  extracted: ExtractedFinancials,
  filing: SECFiling,
  source: ExtractionSource,
  confidence: number,
  priorRevenue: number | null
): HistoricalDataPoint {
  const revenue = extracted.revenue;
  const grossProfit = extracted.grossProfit;
  const operatingIncome = extracted.operatingIncome;
  const netIncome = extracted.netIncome;

  // Calculate margins
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const operatingMargin = revenue > 0 ? (operatingIncome / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;

  // Calculate YoY growth if prior revenue available
  const revenueGrowth = priorRevenue && priorRevenue > 0
    ? ((revenue - priorRevenue) / priorRevenue) * 100
    : null;

  // Calculate basic EPS
  const sharesBasic = extracted.sharesOutstandingBasic || 1;
  const eps = netIncome / sharesBasic;

  return {
    fiscalYear: extracted.fiscalYear,
    fiscalPeriod: extracted.fiscalPeriod,
    filingDate: filing.filingDate,
    accessionNumber: filing.accessionNumber,

    // Income Statement
    revenue,
    costOfRevenue: extracted.costOfRevenue,
    grossProfit,
    operatingExpenses: extracted.operatingExpenses,
    operatingIncome,
    netIncome,

    // Margins
    grossMargin,
    operatingMargin,
    netMargin,
    revenueGrowth,

    // Balance Sheet
    totalAssets: extracted.totalAssets,
    totalLiabilities: extracted.totalLiabilities,
    totalEquity: extracted.totalEquity,
    totalDebt: extracted.totalDebt,
    cashAndEquivalents: extracted.cashAndEquivalents,

    // Cash Flow
    capitalExpenditures: extracted.capitalExpenditures,

    // Shares
    sharesOutstandingBasic: extracted.sharesOutstandingBasic,
    sharesOutstandingDiluted: extracted.sharesOutstandingDiluted,

    // Per-share
    eps,

    // Quality
    extractionSource: source,
    confidence,
  };
}

/**
 * Extract historical financials from multiple SEC filings
 */
export async function extractHistoricalFinancials(
  documents: FilingDocument[],
  onProgress?: (message: string, current: number, total: number) => void
): Promise<HistoricalFinancials> {
  if (documents.length === 0) {
    throw new Error('No documents provided for historical extraction');
  }

  const ticker = documents[0].metadata.ticker;
  const companyName = documents[0].metadata.companyName;
  const total = documents.length;

  console.log(`[Historical] Extracting data from ${total} filings for ${ticker}...`);

  const dataPoints: HistoricalDataPoint[] = [];
  const extractedRevenues: Map<number, number> = new Map();

  // Process each filing (newest to oldest)
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    onProgress?.(`Processing ${doc.metadata.filingDate} 10-K...`, i + 1, total);

    const result = await extractSingleFiling(doc, (msg) =>
      onProgress?.(msg, i + 1, total)
    );

    if (result) {
      // Get prior year revenue for growth calculation
      const fiscalYear = result.data.fiscalYear;
      const priorRevenue = extractedRevenues.get(fiscalYear - 1) || null;

      const dataPoint = toHistoricalDataPoint(
        result.data,
        doc.metadata,
        result.source,
        result.confidence,
        priorRevenue
      );

      dataPoints.push(dataPoint);
      extractedRevenues.set(fiscalYear, result.data.revenue);

      console.log(
        `[Historical] Extracted FY${fiscalYear}: Revenue $${(result.data.revenue / 1e9).toFixed(2)}B`
      );
    }
  }

  // Sort by fiscal year (oldest to newest for charting)
  dataPoints.sort((a, b) => a.fiscalYear - b.fiscalYear);

  // Recalculate growth rates now that we have all data in order
  for (let i = 1; i < dataPoints.length; i++) {
    const current = dataPoints[i];
    const prior = dataPoints[i - 1];
    if (prior.revenue > 0) {
      current.revenueGrowth = ((current.revenue - prior.revenue) / prior.revenue) * 100;
    }
  }

  return {
    ticker,
    companyName,
    data: dataPoints,
    lastUpdated: new Date(),
    yearsAvailable: dataPoints.length,
  };
}

/**
 * Calculate summary statistics from historical data
 */
export function calculateHistoricalStats(historicalData: HistoricalFinancials): HistoricalStats {
  const data = historicalData.data;

  if (data.length < 2) {
    return {
      revenueCAGR: 0,
      averageGrossMargin: data[0]?.grossMargin || 0,
      averageOperatingMargin: data[0]?.operatingMargin || 0,
      averageNetMargin: data[0]?.netMargin || 0,
      marginTrend: 'stable',
      revenueVolatility: 0,
    };
  }

  // Calculate CAGR
  const firstRevenue = data[0].revenue;
  const lastRevenue = data[data.length - 1].revenue;
  const years = data.length - 1;
  const revenueCAGR = (Math.pow(lastRevenue / firstRevenue, 1 / years) - 1) * 100;

  // Calculate average margins
  const averageGrossMargin = data.reduce((sum, d) => sum + d.grossMargin, 0) / data.length;
  const averageOperatingMargin = data.reduce((sum, d) => sum + d.operatingMargin, 0) / data.length;
  const averageNetMargin = data.reduce((sum, d) => sum + d.netMargin, 0) / data.length;

  // Determine margin trend (compare recent 2 years to earlier 2 years)
  let marginTrend: 'expanding' | 'contracting' | 'stable' = 'stable';
  if (data.length >= 4) {
    const recentAvg = (data[data.length - 1].operatingMargin + data[data.length - 2].operatingMargin) / 2;
    const earlierAvg = (data[0].operatingMargin + data[1].operatingMargin) / 2;
    const diff = recentAvg - earlierAvg;
    if (diff > 2) {
      marginTrend = 'expanding';
    } else if (diff < -2) {
      marginTrend = 'contracting';
    }
  }

  // Calculate revenue growth volatility (std dev of growth rates)
  const growthRates = data
    .filter((d) => d.revenueGrowth !== null)
    .map((d) => d.revenueGrowth as number);

  let revenueVolatility = 0;
  if (growthRates.length > 1) {
    const meanGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    const variance =
      growthRates.reduce((sum, g) => sum + Math.pow(g - meanGrowth, 2), 0) / growthRates.length;
    revenueVolatility = Math.sqrt(variance);
  }

  return {
    revenueCAGR,
    averageGrossMargin,
    averageOperatingMargin,
    averageNetMargin,
    marginTrend,
    revenueVolatility,
  };
}
