// Anthropic Claude Client for SEC Filing Analysis
// Uses Claude Opus for high-accuracy extraction and final validation

import Anthropic from '@anthropic-ai/sdk';
import type { LLMExtractionResponse } from './extraction-types';
import { ANTHROPIC_MODELS, MODEL_CONFIG } from './constants';
import { FINANCIAL_EXTRACTION_PROMPT } from './prompts';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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
 * Safe JSON parse with error context
 */
function safeParseJSON<T>(response: string, context: string): T {
  // Try to extract JSON from markdown code blocks if present
  let jsonStr = response;
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch (parseError) {
    console.error(`[Anthropic] JSON parse error in ${context}:`, parseError);
    console.error('[Anthropic] Raw response (first 500 chars):', response.substring(0, 500));
    throw new Error(`Failed to parse ${context} response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
  }
}

// =============================================================================
// EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Extract financials using Claude Opus
 */
export async function extractFinancialsWithClaude(
  text: string,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<LLMExtractionResponse> {
  const modelId = ANTHROPIC_MODELS.OPUS;
  onProgress?.(`Extracting financials with Claude Opus...`);
  console.log(`[Anthropic] Using model: ${modelId}`);

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  try {
    const result = await withTimeout(
      client.messages.create({
        model: modelId,
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: FINANCIAL_EXTRACTION_PROMPT + text
          }
        ]
      }),
      MODEL_CONFIG.TIMEOUT_MS,
      'Claude extraction'
    );

    const responseText = result.content[0].type === 'text' ? result.content[0].text : '';
    console.log(`[Anthropic] Response received, length: ${responseText.length}`);

    return safeParseJSON<LLMExtractionResponse>(responseText, 'Claude financial extraction');
  } catch (error) {
    console.error('[Anthropic] API error:', error);
    throw new Error(`Claude API error: ${error instanceof Error ? error.message : 'Unknown API error'}`);
  }
}

// =============================================================================
// FINAL REVIEW PROMPT
// =============================================================================

const FINAL_REVIEW_PROMPT = `You are a senior financial analyst performing the final validation step for SEC filing extraction.

You have three independent extractions from different AI models. Your job is to:
1. Compare all three extractions against the source document
2. Identify the most accurate value for each field
3. Flag any significant discrepancies
4. Provide a final validated dataset

EXTRACTION 1 (Gemini 3 Flash):
{extraction1}

EXTRACTION 2 (Gemini 3 Pro):
{extraction2}

EXTRACTION 3 (Claude Opus):
{extraction3}

SOURCE DOCUMENT (first 50,000 chars):
{source}

Return a JSON object with this exact structure:
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
    "extractionNotes": ["Notes about the validation process"]
  },
  "confidence": {
    "overall": 0.0-1.0,
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
    "sharesOutstanding": 0.0-1.0
  },
  "warnings": [
    {
      "field": "string",
      "message": "string",
      "severity": "low" | "medium" | "high"
    }
  ],
  "validationSummary": {
    "agreementRate": 0.0-1.0,
    "majorDiscrepancies": ["List of fields where models significantly disagreed"],
    "resolvedBy": "Which source was used to resolve discrepancies",
    "notes": "Any important observations"
  }
}

IMPORTANT:
- Use the SOURCE DOCUMENT to verify disputed values
- Prefer values where 2+ models agree
- All monetary values in actual dollars (not thousands/millions)
- Be conservative - when in doubt, use the more conservative figure
`;

/**
 * Perform final review comparing all extractions against source
 */
export async function performFinalReview(
  extraction1: LLMExtractionResponse, // Gemini Flash
  extraction2: LLMExtractionResponse, // Gemini Pro
  extraction3: LLMExtractionResponse, // Claude Opus
  sourceText: string,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<LLMExtractionResponse & { validationSummary?: { agreementRate: number; majorDiscrepancies: string[]; resolvedBy: string; notes: string } }> {
  onProgress?.('Performing final cross-model validation with Claude Opus...');
  console.log('[Anthropic] Starting final review');

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  // Truncate source for the prompt
  const truncatedSource = sourceText.substring(0, 50000);

  const prompt = FINAL_REVIEW_PROMPT
    .replace('{extraction1}', JSON.stringify(extraction1.financials, null, 2))
    .replace('{extraction2}', JSON.stringify(extraction2.financials, null, 2))
    .replace('{extraction3}', JSON.stringify(extraction3.financials, null, 2))
    .replace('{source}', truncatedSource);

  try {
    const result = await withTimeout(
      client.messages.create({
        model: ANTHROPIC_MODELS.OPUS,
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
      MODEL_CONFIG.TIMEOUT_MS,
      'Final review'
    );

    const responseText = result.content[0].type === 'text' ? result.content[0].text : '';
    console.log(`[Anthropic] Final review response received, length: ${responseText.length}`);

    return safeParseJSON(responseText, 'final review');
  } catch (error) {
    console.error('[Anthropic] Final review error:', error);
    throw new Error(`Final review failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
