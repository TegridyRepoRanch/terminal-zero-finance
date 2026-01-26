// Gemini API Service - Server-side wrapper for Google Generative AI
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { AppError } from '../middleware/errorHandler.js';

// Gemini Models
const GEMINI_MODELS = {
  FLASH: 'gemini-3-flash-preview',
  PRO: 'gemini-3-pro-preview',
} as const;

// Gemini Configuration
const GEMINI_CONFIG = {
  TEMPERATURE_EXTRACTION: 0.1,
  TEMPERATURE_ANALYSIS: 0.3,
  RESPONSE_MIME_TYPE: 'application/json',
} as const;

// Initialize client
let genAI: GoogleGenerativeAI;

/**
 * Initializes the Google Generative AI client with API key from config.
 *
 * Must be called during server startup before any Gemini API calls.
 * Throws an error if GEMINI_API_KEY environment variable is not set.
 *
 * @throws {Error} If Gemini API key is not configured
 */
export function initializeGeminiClient() {
  if (!config.geminiApiKey) {
    throw new Error('Gemini API key not configured');
  }
  genAI = new GoogleGenerativeAI(config.geminiApiKey);
  console.log('[Gemini] Client initialized');
}

/**
 * Wraps a promise with a timeout to prevent indefinite hanging.
 *
 * If the promise doesn't resolve within the specified timeout,
 * rejects with an AppError (408 Request Timeout).
 *
 * @template T - The type of the promise result
 * @param promise - The promise to wrap with timeout
 * @param timeoutMs - Timeout duration in milliseconds
 * @param operation - Human-readable operation name for error messages
 * @returns Promise that resolves with the original result or rejects on timeout
 *
 * @throws {AppError} 408 error if timeout is reached
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new AppError(408, `${operation} timed out after ${timeoutMs / 1000}s`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Safely parses JSON response from Gemini API with error handling.
 *
 * Logs detailed error information including response preview if parsing fails.
 * Throws AppError (500) with context-specific message on failure.
 *
 * @template T - The expected type of the parsed JSON
 * @param response - Raw JSON string response from Gemini
 * @param context - Operation context for error messages (e.g., "financial extraction")
 * @returns Parsed JSON object of type T
 *
 * @throws {AppError} 500 error if JSON parsing fails
 */
function safeParseJSON<T>(response: string, context: string): T {
  try {
    return JSON.parse(response) as T;
  } catch (error) {
    console.error(`[Gemini] JSON parse error in ${context}`);
    console.error(`[Gemini] Response preview: ${response.substring(0, 200)}...`);
    throw new AppError(500, `Failed to parse ${context} response`);
  }
}

/**
 * Generates content using the specified Gemini model with timeout protection.
 *
 * Core function for all Gemini API calls. Configures the model with:
 * - User prompt as input
 * - Specified temperature for response variation control
 * - JSON response format
 * - Timeout wrapper (default 120s from config)
 *
 * @param modelId - Gemini model identifier (e.g., 'gemini-3-flash-preview')
 * @param prompt - The prompt to send to the model
 * @param temperature - Temperature setting (0.0-1.0): lower = more deterministic
 * @param operationName - Human-readable operation name for logging/errors
 * @returns Raw text response from Gemini (typically JSON string)
 *
 * @throws {AppError} 500 if client not initialized or API call fails
 * @throws {AppError} 408 if timeout is reached
 */
async function generateContent(
  modelId: string,
  prompt: string,
  temperature: number,
  operationName: string
): Promise<string> {
  if (!genAI) {
    throw new AppError(500, 'Gemini client not initialized');
  }

  const model = genAI.getGenerativeModel({ model: modelId });

  try {
    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          responseMimeType: GEMINI_CONFIG.RESPONSE_MIME_TYPE,
        },
      }),
      config.geminiTimeout,
      operationName
    );

    return result.response.text();
  } catch (error) {
    if (error instanceof AppError) throw error;

    console.error(`[Gemini] ${operationName} error:`, error);
    throw new AppError(
      500,
      `${operationName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extracts financial data from SEC filing text using Gemini AI.
 *
 * Uses either Gemini Flash (faster, lower cost) or Gemini Pro (more accurate)
 * depending on the useFlash parameter. Extraction uses low temperature (0.1)
 * for deterministic, factual outputs.
 *
 * Expected to return structured financial data matching ExtractedFinancials schema.
 *
 * @param text - SEC filing text content (10-K, 10-Q, etc.)
 * @param useFlash - True to use Flash model, false for Pro model
 * @param prompt - Extraction prompt with JSON schema and instructions
 * @returns Parsed JSON object containing extracted financial data
 *
 * @throws {AppError} 408 if extraction times out
 * @throws {AppError} 500 if API call or JSON parsing fails
 */
export async function extractFinancials(
  text: string,
  useFlash: boolean,
  prompt: string
): Promise<unknown> {
  const modelId = useFlash ? GEMINI_MODELS.FLASH : GEMINI_MODELS.PRO;
  console.log(`[Gemini] Extracting financials with ${modelId}`);

  const response = await generateContent(
    modelId,
    prompt + text,
    GEMINI_CONFIG.TEMPERATURE_EXTRACTION,
    'Financial extraction'
  );

  return safeParseJSON(response, 'financial extraction');
}

/**
 * Extracts financial data from PDF file (base64) using Gemini AI.
 *
 * Sends the PDF directly to Gemini as inline data - no text extraction needed.
 * Gemini reads the PDF natively and extracts structured financial data.
 *
 * @param pdfBase64 - Base64-encoded PDF file data
 * @param mimeType - MIME type of the PDF (should be 'application/pdf')
 * @param useFlash - True to use Flash model, false for Pro model
 * @returns Parsed JSON object containing extracted financial data
 *
 * @throws {AppError} 408 if extraction times out
 * @throws {AppError} 500 if API call or JSON parsing fails
 */
export async function extractFinancialsFromPDF(
  pdfBase64: string,
  mimeType: string,
  useFlash: boolean
): Promise<unknown> {
  if (!genAI) {
    throw new AppError(500, 'Gemini client not initialized');
  }

  const modelId = useFlash ? GEMINI_MODELS.FLASH : GEMINI_MODELS.PRO;
  console.log(`[Gemini] Extracting financials from PDF with ${modelId}`);

  const model = genAI.getGenerativeModel({ model: modelId });

  // Financial extraction prompt
  const prompt = `Extract financial data from this SEC filing and return as JSON.

Return a JSON object with this exact structure:
{
  "companyName": string,
  "filingType": "10-K" | "10-Q" | "8-K",
  "fiscalPeriod": "Q1 2024" | "FY 2023" etc,
  "revenue": [numbers for each period],
  "netIncome": [numbers],
  "totalAssets": [numbers],
  "totalLiabilities": [numbers],
  "cashFlow": [numbers],
  "extractionNotes": [any important notes]
}

Focus on the most recent periods shown in the financial statements.`;

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
            { text: prompt },
          ],
        }],
        generationConfig: {
          temperature: GEMINI_CONFIG.TEMPERATURE_EXTRACTION,
          responseMimeType: GEMINI_CONFIG.RESPONSE_MIME_TYPE,
        },
      }),
      config.geminiTimeout,
      'PDF extraction'
    );

    const response = result.response.text();
    return safeParseJSON(response, 'PDF financial extraction');
  } catch (error) {
    if (error instanceof AppError) throw error;

    console.error(`[Gemini] PDF extraction error:`, error);
    throw new AppError(
      500,
      `PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extracts business segment data from SEC filing text.
 *
 * Always uses Gemini Pro model with low temperature (0.1) for accuracy.
 *
 * @param text - SEC filing text content
 * @param prompt - Segment extraction prompt with schema
 * @returns Parsed JSON with segment analysis data
 * @throws {AppError} On timeout or API failure
 */
export async function extractSegments(text: string, prompt: string): Promise<unknown> {
  console.log('[Gemini] Extracting segments with Pro');

  const response = await generateContent(
    GEMINI_MODELS.PRO,
    prompt + text,
    GEMINI_CONFIG.TEMPERATURE_EXTRACTION,
    'Segment extraction'
  );

  return safeParseJSON(response, 'segment extraction');
}

/**
 * Analyzes Management Discussion & Analysis (MD&A) section of SEC filings.
 *
 * Uses Gemini Pro with medium temperature (0.3) to allow more interpretive analysis
 * of qualitative information like business risks, opportunities, and management outlook.
 *
 * @param text - MD&A section text from filing
 * @param prompt - Analysis prompt with desired output structure
 * @returns Parsed JSON with key points, risks, and opportunities
 * @throws {AppError} On timeout or API failure
 */
export async function analyzeMDA(text: string, prompt: string): Promise<unknown> {
  console.log('[Gemini] Analyzing MD&A with Pro');

  const response = await generateContent(
    GEMINI_MODELS.PRO,
    prompt + text,
    GEMINI_CONFIG.TEMPERATURE_ANALYSIS,
    'MD&A analysis'
  );

  return safeParseJSON(response, 'MD&A analysis');
}

/**
 * Extracts complex financial tables from filing text.
 *
 * Uses Gemini Pro with low temperature (0.1) for accurate table parsing.
 * Handles multi-column tables with complex layouts.
 *
 * @param text - Text containing financial tables
 * @param prompt - Table extraction prompt with desired format
 * @returns Parsed JSON with structured table data
 * @throws {AppError} On timeout or API failure
 */
export async function extractTables(text: string, prompt: string): Promise<unknown> {
  console.log('[Gemini] Extracting tables with Pro');

  const response = await generateContent(
    GEMINI_MODELS.PRO,
    prompt + text,
    GEMINI_CONFIG.TEMPERATURE_EXTRACTION,
    'Table extraction'
  );

  return safeParseJSON(response, 'table extraction');
}

/**
 * Validates extraction results for accuracy and completeness.
 *
 * Cross-checks extracted data against source document and flags
 * inconsistencies, missing data, or potential errors.
 *
 * Uses Gemini Pro with low temperature (0.1) for factual validation.
 *
 * @param validationPrompt - Prompt containing extracted data and validation instructions
 * @returns Parsed JSON with validation results and warnings
 * @throws {AppError} On timeout or API failure
 */
export async function validateExtraction(
  validationPrompt: string
): Promise<unknown> {
  console.log('[Gemini] Running validation with Pro');

  const response = await generateContent(
    GEMINI_MODELS.PRO,
    validationPrompt,
    GEMINI_CONFIG.TEMPERATURE_EXTRACTION,
    'Validation'
  );

  return safeParseJSON(response, 'validation');
}
