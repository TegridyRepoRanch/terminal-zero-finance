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

export function initializeGeminiClient() {
  if (!config.geminiApiKey) {
    throw new Error('Gemini API key not configured');
  }
  genAI = new GoogleGenerativeAI(config.geminiApiKey);
  console.log('[Gemini] Client initialized');
}

/**
 * Wrap promise with timeout
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
 * Safe JSON parse
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
 * Generate content with Gemini
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
 * Extract financials from text
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
 * Extract business segments
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
 * Analyze MD&A section
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
 * Extract complex tables
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
 * Validate extraction
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
