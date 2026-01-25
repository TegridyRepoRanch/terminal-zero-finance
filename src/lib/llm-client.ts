// OpenAI LLM Client for SEC Filing Extraction

import OpenAI from 'openai';
import type {
  ExtractedFinancials,
  ExtractionConfidence,
  ExtractionWarning,
  LLMExtractionResponse,
  FilingType,
} from './extraction-types';

const EXTRACTION_PROMPT = `You are a financial analyst AI. Extract key financial data from the following SEC 10-K or 10-Q filing.

Return a JSON object with the following structure. Use numbers only (no currency symbols or commas). Use null for any values you cannot find or are uncertain about. All monetary values should be in dollars (not thousands or millions - convert if needed).

{
  "financials": {
    "companyName": "string - Company legal name",
    "ticker": "string or null - Stock ticker symbol",
    "filingType": "10-K" | "10-Q" | "unknown",
    "fiscalYear": number,
    "fiscalPeriod": "string - e.g., FY2023 or Q3 2023",

    "revenue": number - Total revenue/net sales,
    "costOfRevenue": number - COGS/cost of sales,
    "grossProfit": number,
    "operatingExpenses": number - Total operating expenses,
    "sgaExpense": number or null - SG&A expense,
    "rdExpense": number or null - R&D expense,
    "depreciationAmortization": number - D&A (may be in cash flow statement),
    "operatingIncome": number - Operating income/EBIT,
    "interestExpense": number,
    "incomeBeforeTax": number,
    "incomeTaxExpense": number,
    "netIncome": number,

    "totalCurrentAssets": number,
    "accountsReceivable": number,
    "inventory": number,
    "totalAssets": number,
    "propertyPlantEquipment": number - PP&E net of depreciation,
    "totalCurrentLiabilities": number,
    "accountsPayable": number,
    "totalDebt": number - Total debt (short + long term),
    "shortTermDebt": number,
    "longTermDebt": number,
    "totalLiabilities": number,
    "totalEquity": number,
    "retainedEarnings": number,
    "cashAndEquivalents": number,

    "sharesOutstandingBasic": number,
    "sharesOutstandingDiluted": number,

    "priorYearRevenue": number or null - Previous year revenue for growth calc,

    "extractionNotes": ["array of strings - any important notes or assumptions made"]
  },
  "confidence": {
    "companyName": 0.0-1.0,
    "revenue": 0.0-1.0,
    "costOfRevenue": 0.0-1.0,
    "operatingExpenses": 0.0-1.0,
    "depreciationAmortization": 0.0-1.0,
    "interestExpense": 0.0-1.0,
    "incomeTaxExpense": 0.0-1.0,
    "accountsReceivable": 0.0-1.0,
    "inventory": 0.0-1.0,
    "accountsPayable": 0.0-1.0,
    "propertyPlantEquipment": 0.0-1.0,
    "totalDebt": 0.0-1.0,
    "sharesOutstanding": 0.0-1.0,
    "overall": 0.0-1.0 - Overall confidence in extraction accuracy
  },
  "warnings": [
    {
      "field": "string - field name",
      "message": "string - description of issue",
      "severity": "low" | "medium" | "high"
    }
  ]
}

Important notes:
- Convert all numbers reported in thousands or millions to actual values
- If D&A is combined in operating expenses, try to find it separately in the cash flow statement
- For shares outstanding, prefer diluted shares for valuation
- If you can't find specific SG&A breakdown, use total operating expenses minus D&A and R&D
- Flag any estimated or derived values in warnings
- Confidence scores: 1.0 = found exact value, 0.8 = calculated/derived, 0.5 = estimated, 0.0 = not found

SEC Filing Text:
`;

/**
 * Extract financial data from PDF text using GPT-4
 */
export async function extractFinancialsWithLLM(
  text: string,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<LLMExtractionResponse> {
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // Required for client-side usage
  });

  onProgress?.('Sending to GPT-4 for analysis...');

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content:
          'You are a financial analyst expert at extracting structured data from SEC filings. Always respond with valid JSON only, no markdown formatting.',
      },
      {
        role: 'user',
        content: EXTRACTION_PROMPT + text,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1, // Low temperature for consistent extraction
    max_tokens: 4096,
  });

  onProgress?.('Processing GPT-4 response...');

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response content from GPT-4');
  }

  try {
    const parsed = JSON.parse(content) as LLMExtractionResponse;
    validateExtractionResponse(parsed);
    return parsed;
  } catch (error) {
    throw new Error(
      `Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate the structure of the LLM response
 */
function validateExtractionResponse(response: unknown): asserts response is LLMExtractionResponse {
  if (typeof response !== 'object' || response === null) {
    throw new Error('Response is not an object');
  }

  const resp = response as Record<string, unknown>;

  if (!resp.financials || typeof resp.financials !== 'object') {
    throw new Error('Missing or invalid financials object');
  }

  if (!resp.confidence || typeof resp.confidence !== 'object') {
    throw new Error('Missing or invalid confidence object');
  }

  if (!Array.isArray(resp.warnings)) {
    throw new Error('Missing or invalid warnings array');
  }

  const financials = resp.financials as Record<string, unknown>;

  // Check required fields exist
  const requiredFields = [
    'companyName',
    'revenue',
    'costOfRevenue',
    'netIncome',
    'totalAssets',
    'totalLiabilities',
  ];

  for (const field of requiredFields) {
    if (financials[field] === undefined) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

/**
 * Detect filing type from text content
 */
export function detectFilingType(text: string): FilingType {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('form 10-k') || lowerText.includes('annual report')) {
    return '10-K';
  }

  if (lowerText.includes('form 10-q') || lowerText.includes('quarterly report')) {
    return '10-Q';
  }

  return 'unknown';
}

/**
 * Create default confidence scores when extraction fails partially
 */
export function createDefaultConfidence(): ExtractionConfidence {
  return {
    companyName: 0,
    revenue: 0,
    costOfRevenue: 0,
    operatingExpenses: 0,
    depreciationAmortization: 0,
    interestExpense: 0,
    incomeTaxExpense: 0,
    accountsReceivable: 0,
    inventory: 0,
    accountsPayable: 0,
    propertyPlantEquipment: 0,
    totalDebt: 0,
    sharesOutstanding: 0,
    overall: 0,
  };
}

/**
 * Create default extracted financials for fallback
 */
export function createDefaultFinancials(): ExtractedFinancials {
  return {
    companyName: 'Unknown Company',
    ticker: null,
    filingType: 'unknown',
    fiscalYear: new Date().getFullYear(),
    fiscalPeriod: 'Unknown',

    revenue: 0,
    costOfRevenue: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    sgaExpense: null,
    rdExpense: null,
    depreciationAmortization: 0,
    operatingIncome: 0,
    interestExpense: 0,
    incomeBeforeTax: 0,
    incomeTaxExpense: 0,
    netIncome: 0,

    totalCurrentAssets: 0,
    accountsReceivable: 0,
    inventory: 0,
    totalAssets: 0,
    propertyPlantEquipment: 0,
    totalCurrentLiabilities: 0,
    accountsPayable: 0,
    totalDebt: 0,
    shortTermDebt: 0,
    longTermDebt: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    retainedEarnings: 0,
    cashAndEquivalents: 0,

    sharesOutstandingBasic: 0,
    sharesOutstandingDiluted: 0,

    priorYearRevenue: null,

    extractionNotes: [],
  };
}

/**
 * Create a warning for missing or low-confidence data
 */
export function createWarning(
  field: string,
  message: string,
  severity: 'low' | 'medium' | 'high'
): ExtractionWarning {
  return { field, message, severity };
}
