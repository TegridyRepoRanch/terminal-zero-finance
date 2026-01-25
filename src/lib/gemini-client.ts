// Gemini 2.5 Pro Client for Advanced SEC Filing Analysis
// Used for: Complex segments, MD&A analysis, tricky tables, validation

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  ExtractedFinancials,
  ExtractionConfidence,
  LLMExtractionResponse,
} from './extraction-types';

// Segment breakdown extraction prompt
const SEGMENT_EXTRACTION_PROMPT = `You are an expert financial analyst. Extract detailed segment/business unit breakdowns from this SEC filing.

Return a JSON object with:
{
  "segments": [
    {
      "name": "Segment name",
      "revenue": number,
      "operatingIncome": number,
      "assets": number,
      "revenuePercent": number (% of total),
      "growthRate": number or null (YoY %),
      "geography": "string or null",
      "description": "Brief description of segment"
    }
  ],
  "totalRevenue": number,
  "revenueByGeography": {
    "region": number
  },
  "notes": ["Any important observations about segment reporting"]
}

Be thorough - SEC filings often have segment data in multiple places (Item 1, Item 7, notes to financials).

Filing text:
`;

// MD&A qualitative analysis prompt
const MDA_ANALYSIS_PROMPT = `You are an expert financial analyst. Perform qualitative analysis of the Management Discussion & Analysis (MD&A) section.

Return a JSON object with:
{
  "keyThemes": [
    {
      "theme": "string",
      "sentiment": "positive" | "negative" | "neutral",
      "significance": "high" | "medium" | "low",
      "quote": "Relevant quote from filing"
    }
  ],
  "risks": [
    {
      "risk": "Description",
      "category": "operational" | "financial" | "regulatory" | "market" | "other",
      "severity": "high" | "medium" | "low",
      "newOrEscalated": boolean
    }
  ],
  "guidance": {
    "hasGuidance": boolean,
    "revenueGuidance": "string or null",
    "marginGuidance": "string or null",
    "capitalAllocation": "string or null",
    "otherGuidance": ["strings"]
  },
  "competitivePosition": {
    "strengths": ["strings"],
    "weaknesses": ["strings"],
    "marketTrends": ["strings"]
  },
  "managementTone": "optimistic" | "cautious" | "concerned" | "neutral",
  "summary": "2-3 sentence executive summary"
}

Filing text:
`;

// Complex table extraction prompt
const TABLE_EXTRACTION_PROMPT = `You are an expert at extracting financial data from complex tables in SEC filings.

The following text may contain poorly formatted tables. Extract ALL numerical financial data accurately.

Pay special attention to:
- Multi-year comparative data
- Footnotes that modify reported numbers
- Pro-forma vs GAAP figures (prefer GAAP)
- Numbers in thousands vs millions (convert all to actual dollars)
- Negative numbers shown in parentheses

Return a JSON object with:
{
  "financials": {
    // Same structure as main extraction - fill in what you can find
    "revenue": number,
    "costOfRevenue": number,
    "grossProfit": number,
    "operatingExpenses": number,
    "sgaExpense": number or null,
    "rdExpense": number or null,
    "depreciationAmortization": number,
    "operatingIncome": number,
    "interestExpense": number,
    "incomeBeforeTax": number,
    "incomeTaxExpense": number,
    "netIncome": number,
    "totalCurrentAssets": number,
    "accountsReceivable": number,
    "inventory": number,
    "totalAssets": number,
    "propertyPlantEquipment": number,
    "totalCurrentLiabilities": number,
    "accountsPayable": number,
    "totalDebt": number,
    "shortTermDebt": number,
    "longTermDebt": number,
    "totalLiabilities": number,
    "totalEquity": number,
    "cashAndEquivalents": number,
    "sharesOutstandingBasic": number,
    "sharesOutstandingDiluted": number
  },
  "tableNotes": ["Any footnotes or adjustments found"],
  "dataQuality": {
    "confidence": 0.0-1.0,
    "issues": ["Any data quality issues encountered"]
  }
}

Filing text:
`;

// Validation prompt - compares two extractions
const VALIDATION_PROMPT = `You are a senior financial analyst performing a final validation of extracted SEC filing data.

Compare the two extractions below and identify any discrepancies. For each discrepancy, determine which value is more likely correct based on typical financial reporting patterns.

Extraction 1 (GPT-4):
{extraction1}

Extraction 2 (Gemini):
{extraction2}

Return a JSON object with:
{
  "validated": {
    // Final validated values - use the most accurate from either extraction
    // Same structure as ExtractedFinancials
  },
  "discrepancies": [
    {
      "field": "field name",
      "gptValue": number,
      "geminiValue": number,
      "selectedValue": number,
      "reason": "Why this value was selected"
    }
  ],
  "confidence": {
    // Confidence scores for each field
  },
  "validationNotes": ["Any important observations from validation"],
  "overallConfidence": 0.0-1.0
}
`;

export interface SegmentData {
  name: string;
  revenue: number;
  operatingIncome: number;
  assets: number;
  revenuePercent: number;
  growthRate: number | null;
  geography: string | null;
  description: string;
}

export interface SegmentAnalysis {
  segments: SegmentData[];
  totalRevenue: number;
  revenueByGeography: Record<string, number>;
  notes: string[];
}

export interface MDATheme {
  theme: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  significance: 'high' | 'medium' | 'low';
  quote: string;
}

export interface MDAanalysis {
  keyThemes: MDATheme[];
  risks: Array<{
    risk: string;
    category: 'operational' | 'financial' | 'regulatory' | 'market' | 'other';
    severity: 'high' | 'medium' | 'low';
    newOrEscalated: boolean;
  }>;
  guidance: {
    hasGuidance: boolean;
    revenueGuidance: string | null;
    marginGuidance: string | null;
    capitalAllocation: string | null;
    otherGuidance: string[];
  };
  competitivePosition: {
    strengths: string[];
    weaknesses: string[];
    marketTrends: string[];
  };
  managementTone: 'optimistic' | 'cautious' | 'concerned' | 'neutral';
  summary: string;
}

export interface ValidationResult {
  validated: ExtractedFinancials;
  discrepancies: Array<{
    field: string;
    gptValue: number;
    geminiValue: number;
    selectedValue: number;
    reason: string;
  }>;
  confidence: ExtractionConfidence;
  validationNotes: string[];
  overallConfidence: number;
}

/**
 * Initialize Gemini client
 */
function getGeminiClient(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Extract segment breakdowns using Gemini 2.5 Pro
 */
export async function extractSegmentsWithGemini(
  text: string,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<SegmentAnalysis> {
  onProgress?.('Analyzing business segments with Gemini 2.5 Pro...');

  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: SEGMENT_EXTRACTION_PROMPT + text }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const response = result.response.text();
    return JSON.parse(response) as SegmentAnalysis;
  } catch (error) {
    console.error('[Gemini] Segment extraction error:', error);
    throw new Error(`Segment extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Perform MD&A qualitative analysis using Gemini 2.5 Pro
 */
export async function analyzeMDAWithGemini(
  text: string,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<MDAanalysis> {
  onProgress?.('Analyzing MD&A section with Gemini 2.5 Pro...');

  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: MDA_ANALYSIS_PROMPT + text }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const response = result.response.text();
    return JSON.parse(response) as MDAanalysis;
  } catch (error) {
    console.error('[Gemini] MD&A analysis error:', error);
    throw new Error(`MD&A analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract data from complex/tricky tables using Gemini 2.5 Pro
 */
export async function extractTablesWithGemini(
  text: string,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<LLMExtractionResponse> {
  onProgress?.('Extracting complex tables with Gemini 2.5 Pro...');

  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

  let response: string;
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: TABLE_EXTRACTION_PROMPT + text }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });
    response = result.response.text();
  } catch (error) {
    console.error('[Gemini] Table extraction API error:', error);
    throw new Error(`Table extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const parsed = JSON.parse(response);

  // Transform to standard LLMExtractionResponse format
  return {
    financials: {
      companyName: '',
      ticker: null,
      filingType: 'unknown',
      fiscalYear: new Date().getFullYear(),
      fiscalPeriod: '',
      ...parsed.financials,
      extractionNotes: parsed.tableNotes || [],
    } as ExtractedFinancials,
    confidence: {
      overall: parsed.dataQuality?.confidence || 0.7,
      companyName: 0,
      revenue: parsed.financials?.revenue ? 0.9 : 0,
      costOfRevenue: parsed.financials?.costOfRevenue ? 0.9 : 0,
      operatingExpenses: parsed.financials?.operatingExpenses ? 0.9 : 0,
      depreciationAmortization: parsed.financials?.depreciationAmortization ? 0.8 : 0,
      interestExpense: parsed.financials?.interestExpense ? 0.8 : 0,
      incomeTaxExpense: parsed.financials?.incomeTaxExpense ? 0.8 : 0,
      accountsReceivable: parsed.financials?.accountsReceivable ? 0.8 : 0,
      inventory: parsed.financials?.inventory ? 0.8 : 0,
      accountsPayable: parsed.financials?.accountsPayable ? 0.8 : 0,
      propertyPlantEquipment: parsed.financials?.propertyPlantEquipment ? 0.8 : 0,
      totalDebt: parsed.financials?.totalDebt ? 0.8 : 0,
      sharesOutstanding: parsed.financials?.sharesOutstandingDiluted ? 0.8 : 0,
    },
    warnings: (parsed.dataQuality?.issues || []).map((issue: string) => ({
      field: 'tables',
      message: issue,
      severity: 'medium' as const,
    })),
  };
}

/**
 * Validate extraction by comparing GPT-4 and Gemini results
 */
export async function validateExtractionWithGemini(
  gptExtraction: LLMExtractionResponse,
  text: string,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<ValidationResult> {
  onProgress?.('Running validation pass with Gemini 2.5 Pro...');

  // First, get Gemini's own extraction
  const geminiExtraction = await extractTablesWithGemini(text, apiKey);

  onProgress?.('Comparing extractions and resolving discrepancies...');

  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

  const prompt = VALIDATION_PROMPT
    .replace('{extraction1}', JSON.stringify(gptExtraction.financials, null, 2))
    .replace('{extraction2}', JSON.stringify(geminiExtraction.financials, null, 2));

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const response = result.response.text();
    return JSON.parse(response) as ValidationResult;
  } catch (error) {
    console.error('[Gemini] Validation error:', error);
    throw new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Full Gemini extraction
 * @param useFlash - If true, uses Gemini 2.5 Flash (faster). If false, uses Gemini 2.5 Pro (more accurate).
 */
export async function extractFinancialsWithGemini(
  text: string,
  apiKey: string,
  onProgress?: (message: string) => void,
  useFlash: boolean = false
): Promise<LLMExtractionResponse> {
  const modelName = useFlash ? 'Gemini 2.5 Flash' : 'Gemini 2.5 Pro';
  onProgress?.(`Extracting financials with ${modelName}...`);

  const FULL_EXTRACTION_PROMPT = `You are a financial analyst AI. Extract key financial data from the following SEC 10-K or 10-Q filing.

Return a JSON object with the following structure. Use numbers only (no currency symbols or commas). Use null for any values you cannot find. All monetary values should be in dollars (not thousands or millions - convert if needed).

{
  "financials": {
    "companyName": "string",
    "ticker": "string or null",
    "filingType": "10-K" | "10-Q" | "unknown",
    "fiscalYear": number,
    "fiscalPeriod": "string",
    "revenue": number,
    "costOfRevenue": number,
    "grossProfit": number,
    "operatingExpenses": number,
    "sgaExpense": number or null,
    "rdExpense": number or null,
    "depreciationAmortization": number,
    "operatingIncome": number,
    "interestExpense": number,
    "incomeBeforeTax": number,
    "incomeTaxExpense": number,
    "netIncome": number,
    "totalCurrentAssets": number,
    "accountsReceivable": number,
    "inventory": number,
    "totalAssets": number,
    "propertyPlantEquipment": number,
    "totalCurrentLiabilities": number,
    "accountsPayable": number,
    "totalDebt": number,
    "shortTermDebt": number,
    "longTermDebt": number,
    "totalLiabilities": number,
    "totalEquity": number,
    "retainedEarnings": number,
    "cashAndEquivalents": number,
    "sharesOutstandingBasic": number,
    "sharesOutstandingDiluted": number,
    "priorYearRevenue": number or null,
    "extractionNotes": []
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
    "overall": 0.0-1.0
  },
  "warnings": []
}

Filing text:
` + text;

  const genAI = getGeminiClient(apiKey);
  // Use stable Gemini 2.5 model identifiers
  const modelId = useFlash ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
  console.log(`[Gemini] Using model: ${modelId}`);

  const model = genAI.getGenerativeModel({ model: modelId });

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: FULL_EXTRACTION_PROMPT }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const response = result.response.text();
    console.log(`[Gemini] Response received, length: ${response.length}`);

    try {
      return JSON.parse(response) as LLMExtractionResponse;
    } catch (parseError) {
      console.error('[Gemini] JSON parse error:', parseError);
      console.error('[Gemini] Raw response:', response.substring(0, 500));
      throw new Error(`Failed to parse Gemini response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }
  } catch (apiError) {
    console.error('[Gemini] API error:', apiError);
    throw new Error(`Gemini API error: ${apiError instanceof Error ? apiError.message : 'Unknown API error'}`);
  }
}
