// Gemini Client for SEC Filing Analysis
// Uses Gemini 3 Pro/Flash for financial data extraction

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  ExtractedFinancials,
  ExtractionConfidence,
  LLMExtractionResponse,
} from './extraction-types';
import { GEMINI_MODELS, GEMINI_CONFIG } from './constants';
import {
  SEGMENT_EXTRACTION_PROMPT,
  MDA_ANALYSIS_PROMPT,
  TABLE_EXTRACTION_PROMPT,
  FINANCIAL_EXTRACTION_PROMPT,
  buildValidationPrompt,
} from './prompts';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

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
    primaryValue: number;
    verificationValue: number;
    selectedValue: number;
    reason: string;
  }>;
  confidence: ExtractionConfidence;
  validationNotes: string[];
  overallConfidence: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Initialize Gemini client with API key
 */
function getGeminiClient(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Wrap a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs / 1000}s`)), timeoutMs)
    )
  ]);
}

/**
 * Get display name for a model ID
 */
function getModelDisplayName(modelId: string): string {
  if (modelId === GEMINI_MODELS.FLASH) return 'Gemini 3 Flash';
  if (modelId === GEMINI_MODELS.PRO) return 'Gemini 3 Pro';
  return modelId;
}

/**
 * Safe JSON parse with error context
 */
function safeParseJSON<T>(response: string, context: string): T {
  try {
    return JSON.parse(response) as T;
  } catch (parseError) {
    console.error(`[Gemini] JSON parse error in ${context}:`, parseError);
    console.error('[Gemini] Raw response (first 500 chars):', response.substring(0, 500));
    throw new Error(`Failed to parse ${context} response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
  }
}

// =============================================================================
// EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Extract segment breakdowns using Gemini Pro
 */
export async function extractSegmentsWithGemini(
  text: string,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<SegmentAnalysis> {
  const modelId = GEMINI_MODELS.PRO;
  onProgress?.(`Analyzing business segments with ${getModelDisplayName(modelId)}...`);

  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });

  try {
    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: 'user', parts: [{ text: SEGMENT_EXTRACTION_PROMPT + text }] }],
        generationConfig: {
          temperature: GEMINI_CONFIG.TEMPERATURE_EXTRACTION,
          responseMimeType: GEMINI_CONFIG.RESPONSE_MIME_TYPE,
        },
      }),
      120000, // 2 minute timeout
      'Segment extraction'
    );

    const response = result.response.text();
    return safeParseJSON<SegmentAnalysis>(response, 'segment extraction');
  } catch (error) {
    console.error('[Gemini] Segment extraction error:', error);
    throw new Error(`Segment extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Perform MD&A qualitative analysis using Gemini Pro
 */
export async function analyzeMDAWithGemini(
  text: string,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<MDAanalysis> {
  const modelId = GEMINI_MODELS.PRO;
  onProgress?.(`Analyzing MD&A section with ${getModelDisplayName(modelId)}...`);

  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });

  try {
    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: 'user', parts: [{ text: MDA_ANALYSIS_PROMPT + text }] }],
        generationConfig: {
          temperature: GEMINI_CONFIG.TEMPERATURE_ANALYSIS,
          responseMimeType: GEMINI_CONFIG.RESPONSE_MIME_TYPE,
        },
      }),
      120000, // 2 minute timeout
      'MD&A analysis'
    );

    const response = result.response.text();
    return safeParseJSON<MDAanalysis>(response, 'MD&A analysis');
  } catch (error) {
    console.error('[Gemini] MD&A analysis error:', error);
    throw new Error(`MD&A analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract data from complex/tricky tables using Gemini Pro
 */
export async function extractTablesWithGemini(
  text: string,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<LLMExtractionResponse> {
  const modelId = GEMINI_MODELS.PRO;
  onProgress?.(`Extracting complex tables with ${getModelDisplayName(modelId)}...`);

  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });

  let response: string;
  try {
    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: 'user', parts: [{ text: TABLE_EXTRACTION_PROMPT + text }] }],
        generationConfig: {
          temperature: GEMINI_CONFIG.TEMPERATURE_EXTRACTION,
          responseMimeType: GEMINI_CONFIG.RESPONSE_MIME_TYPE,
        },
      }),
      120000, // 2 minute timeout
      'Table extraction'
    );
    response = result.response.text();
  } catch (error) {
    console.error('[Gemini] Table extraction API error:', error);
    throw new Error(`Table extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const parsed = safeParseJSON<{
    financials: Partial<ExtractedFinancials>;
    tableNotes?: string[];
    dataQuality?: { confidence?: number; issues?: string[] };
  }>(response, 'table extraction');

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
 * Validate extraction by comparing two extraction passes
 */
export async function validateExtractionWithGemini(
  primaryExtraction: LLMExtractionResponse,
  text: string,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<ValidationResult> {
  const modelId = GEMINI_MODELS.PRO;
  onProgress?.(`Running validation pass with ${getModelDisplayName(modelId)}...`);

  // First, get a second extraction for comparison
  const verificationExtraction = await extractTablesWithGemini(text, apiKey);

  onProgress?.('Comparing extractions and resolving discrepancies...');

  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });

  const prompt = buildValidationPrompt(
    JSON.stringify(primaryExtraction.financials, null, 2),
    JSON.stringify(verificationExtraction.financials, null, 2)
  );

  try {
    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: GEMINI_CONFIG.TEMPERATURE_EXTRACTION,
          responseMimeType: GEMINI_CONFIG.RESPONSE_MIME_TYPE,
        },
      }),
      120000, // 2 minute timeout
      'Validation'
    );

    const response = result.response.text();
    return safeParseJSON<ValidationResult>(response, 'validation');
  } catch (error) {
    console.error('[Gemini] Validation error:', error);
    throw new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Full financial extraction from SEC filing
 * @param text - The filing text to extract from
 * @param apiKey - Gemini API key
 * @param onProgress - Optional progress callback
 * @param useFlash - If true, uses Gemini Flash (faster). If false, uses Gemini Pro (more accurate).
 */
export async function extractFinancialsWithGemini(
  text: string,
  apiKey: string,
  onProgress?: (message: string) => void,
  useFlash: boolean = false
): Promise<LLMExtractionResponse> {
  const modelId = useFlash ? GEMINI_MODELS.FLASH : GEMINI_MODELS.PRO;
  const modelName = getModelDisplayName(modelId);

  onProgress?.(`Extracting financials with ${modelName}...`);
  console.log(`[Gemini] Using model: ${modelId}`);

  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });

  try {
    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: 'user', parts: [{ text: FINANCIAL_EXTRACTION_PROMPT + text }] }],
        generationConfig: {
          temperature: GEMINI_CONFIG.TEMPERATURE_EXTRACTION,
          responseMimeType: GEMINI_CONFIG.RESPONSE_MIME_TYPE,
        },
      }),
      120000, // 2 minute timeout
      'Financial extraction'
    );

    const response = result.response.text();
    console.log(`[Gemini] Response received, length: ${response.length}`);

    return safeParseJSON<LLMExtractionResponse>(response, 'financial extraction');
  } catch (error) {
    console.error('[Gemini] API error:', error);
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown API error'}`);
  }
}

/**
 * Extract financials directly from PDF file - let Gemini read the PDF
 * No text extraction needed - Gemini handles the PDF natively
 */
export async function extractFinancialsFromPDF(
  pdfBase64: string,
  mimeType: string,
  apiKey: string,
  onProgress?: (message: string) => void,
  useFlash: boolean = false
): Promise<LLMExtractionResponse> {
  const modelId = useFlash ? GEMINI_MODELS.FLASH : GEMINI_MODELS.PRO;
  const modelName = getModelDisplayName(modelId);

  onProgress?.(`Reading PDF with ${modelName}...`);
  console.log(`[Gemini] Sending PDF directly to model: ${modelId}`);

  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });

  try {
    const result = await withTimeout(
      model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: pdfBase64,
              },
            },
            { text: FINANCIAL_EXTRACTION_PROMPT },
          ],
        }],
        generationConfig: {
          temperature: GEMINI_CONFIG.TEMPERATURE_EXTRACTION,
          responseMimeType: GEMINI_CONFIG.RESPONSE_MIME_TYPE,
        },
      }),
      180000, // 3 minute timeout for PDF processing
      'PDF financial extraction'
    );

    const response = result.response.text();
    console.log(`[Gemini] Response received, length: ${response.length}`);

    return safeParseJSON<LLMExtractionResponse>(response, 'PDF financial extraction');
  } catch (error) {
    console.error('[Gemini] PDF extraction error:', error);
    throw new Error(`Gemini PDF extraction error: ${error instanceof Error ? error.message : 'Unknown API error'}`);
  }
}
