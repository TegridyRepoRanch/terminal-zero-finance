// Types for SEC Filing Extraction

export type FilingType = '10-K' | '10-Q' | 'unknown';

// Source of extraction data
export type ExtractionSource = 'xbrl' | 'ai' | 'hybrid';

// Source citation for verifying AI extraction accuracy
export interface SourceCitation {
  fieldName: string;
  extractedValue: number | string;
  sourceText: string; // The exact text snippet from the filing (verbatim)
  sourceLocation?: string; // e.g., "Consolidated Statements of Operations", "Balance Sheet"
  confidence: number; // 0-1
  scaleNote?: string; // Scale conversion applied, e.g., "in thousands - multiplied by 1000"
}

// Collection of source citations for all extracted fields
export interface SourceCitations {
  [fieldName: string]: SourceCitation;
}

export type ExtractionStatus =
  | 'idle'
  | 'uploading'
  | 'parsing'
  | 'extracting'
  | 'mapping'
  | 'complete'
  | 'error';

// Raw extracted data from LLM
export interface ExtractedFinancials {
  // Company Info
  companyName: string;
  ticker: string | null;
  filingType: FilingType;
  fiscalYear: number;
  fiscalPeriod: string; // e.g., "FY2023", "Q3 2023"

  // Income Statement (most recent period)
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingExpenses: number;
  sgaExpense: number | null;
  rdExpense: number | null;
  depreciationAmortization: number;
  operatingIncome: number;
  interestExpense: number;
  incomeBeforeTax: number;
  incomeTaxExpense: number;
  netIncome: number;

  // Balance Sheet
  totalCurrentAssets: number;
  accountsReceivable: number;
  inventory: number;
  totalAssets: number;
  propertyPlantEquipment: number;

  // Cash Flow Statement
  operatingCashFlow: number | null;
  capitalExpenditures: number | null;
  freeCashFlow: number | null; // OCF - CapEx

  // Current Liabilities
  totalCurrentLiabilities: number;
  accountsPayable: number;
  totalDebt: number;
  shortTermDebt: number;
  longTermDebt: number;
  totalLiabilities: number;
  totalEquity: number;
  retainedEarnings: number;
  cashAndEquivalents: number;

  // Shares
  sharesOutstandingBasic: number;
  sharesOutstandingDiluted: number;

  // Historical for growth calculation (prior year)
  priorYearRevenue: number | null;

  // One-time/unusual items that may distort normalized earnings
  unusualItems?: UnusualItem[];

  // Notes & warnings
  extractionNotes: string[];
}

// One-time or unusual items that should be flagged for review
export interface UnusualItem {
  description: string;
  amount: number;
  category: 'restructuring' | 'impairment' | 'legal' | 'acquisition' | 'gain_loss_sale' | 'tax_benefit' | 'other';
  impact: 'positive' | 'negative'; // Impact on net income
  sourceLocation?: string;
}

// Confidence scores for each field
export interface ExtractionConfidence {
  companyName: number;
  revenue: number;
  costOfRevenue: number;
  operatingExpenses: number;
  depreciationAmortization: number;
  interestExpense: number;
  incomeTaxExpense: number;
  accountsReceivable: number;
  inventory: number;
  accountsPayable: number;
  propertyPlantEquipment: number;
  totalDebt: number;
  sharesOutstanding: number;
  overall: number;
}

// Full extraction result
export interface ExtractionResult {
  success: boolean;
  data: ExtractedFinancials | null;
  confidence: ExtractionConfidence | null;
  warnings: ExtractionWarning[];
  error: string | null;
}

export interface ExtractionWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

// Derived metrics calculated from extracted data
export interface DerivedMetrics {
  // Margins
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;

  // Rates
  effectiveTaxRate: number;
  revenueGrowthRate: number | null;

  // Working Capital Days
  daysReceivables: number;
  daysInventory: number;
  daysPayables: number;

  // Other
  cogsPercent: number;
  sgaPercent: number;
  capexPercent: number | null;
  depreciationRate: number;
  interestRate: number;
}

// Metadata about the extraction
export interface ExtractionMetadata {
  fileName: string;
  fileSize: number;
  filingType: FilingType;
  companyName: string;
  fiscalPeriod: string;
  extractedAt: Date;
  confidence: number;
  pageCount: number;
  processingTimeMs: number;
  sourceCitations?: SourceCitations; // Source citations for verification
  rawSourceText?: string; // Original filing text (truncated)
  sourceUrl?: string; // URL to original SEC filing for verification
  extractionSource?: ExtractionSource; // Where data came from (xbrl, ai, hybrid)
  xbrlFieldCount?: number; // Number of fields from XBRL
  aiFieldCount?: number; // Number of fields from AI
  xbrlFieldsUsed?: string[]; // List of field names extracted from XBRL
  aiFieldsUsed?: string[]; // List of field names extracted from AI
}

// LLM Response structure (what we expect from GPT-4)
export interface LLMExtractionResponse {
  financials: ExtractedFinancials;
  confidence: ExtractionConfidence;
  warnings: ExtractionWarning[];
  sourceCitations?: SourceCitations; // Optional source citations for verification
}

// Historical data point for multi-year analysis
export interface HistoricalDataPoint {
  fiscalYear: number;
  fiscalPeriod: string; // e.g., "FY2023", "Q3 2023"
  filingDate: string;
  accessionNumber: string;

  // Income Statement
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingIncome: number;
  netIncome: number;

  // Calculated margins (percentages)
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  revenueGrowth: number | null; // YoY growth

  // Balance Sheet (snapshot)
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalDebt: number;
  cashAndEquivalents: number;

  // Cash Flow
  capitalExpenditures: number | null;

  // Shares
  sharesOutstandingBasic: number;
  sharesOutstandingDiluted: number;

  // Per-share metrics
  eps: number; // Basic EPS

  // Data quality
  extractionSource: ExtractionSource;
  confidence: number;
}

// Full historical dataset for a company
export interface HistoricalFinancials {
  ticker: string;
  companyName: string;
  data: HistoricalDataPoint[];
  lastUpdated: Date;
  yearsAvailable: number;
}

// Summary statistics calculated from historical data
export interface HistoricalStats {
  revenueCAGR: number; // Compound annual growth rate
  averageGrossMargin: number;
  averageOperatingMargin: number;
  averageNetMargin: number;
  marginTrend: 'expanding' | 'contracting' | 'stable';
  revenueVolatility: number; // Standard deviation of growth rates
}

// Business segment data
export interface BusinessSegment {
  name: string;
  revenue: number;
  operatingIncome: number | null;
  assets: number | null;
  revenuePercent: number; // Percentage of total revenue
  growthRate: number | null; // YoY growth rate
  geography: string | null; // e.g., "Americas", "International"
  description: string | null;
}

// Geographic revenue breakdown
export interface GeographicBreakdown {
  region: string;
  revenue: number;
  revenuePercent: number;
}

// Full segment analysis result
export interface SegmentAnalysis {
  segments: BusinessSegment[];
  totalRevenue: number;
  geographicBreakdown: GeographicBreakdown[];
  segmentCount: number;
  hasOperatingData: boolean; // Whether segment-level operating income is available
  concentration: {
    topSegmentPercent: number; // Largest segment as % of total
    herfindahlIndex: number; // Measure of concentration (0-1, higher = more concentrated)
    isConcentrated: boolean; // True if top segment > 50%
  };
  notes: string[];
}

// Segment extraction response from LLM
export interface SegmentExtractionResponse {
  segments: BusinessSegment[];
  totalRevenue: number;
  revenueByGeography: Record<string, number>;
  notes: string[];
}
