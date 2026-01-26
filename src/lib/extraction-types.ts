// Types for SEC Filing Extraction

export type FilingType = '10-K' | '10-Q' | 'unknown';

// Source citation for verifying AI extraction accuracy
export interface SourceCitation {
  fieldName: string;
  extractedValue: number | string;
  sourceText: string; // The text snippet from the filing
  sourceLocation?: string; // e.g., "Page 45, Item 8"
  confidence: number; // 0-1
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

  // Notes & warnings
  extractionNotes: string[];
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
}

// LLM Response structure (what we expect from GPT-4)
export interface LLMExtractionResponse {
  financials: ExtractedFinancials;
  confidence: ExtractionConfidence;
  warnings: ExtractionWarning[];
  sourceCitations?: SourceCitations; // Optional source citations for verification
}
