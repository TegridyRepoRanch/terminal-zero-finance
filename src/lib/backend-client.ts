// Backend API Client - Replaces direct Gemini API calls
// Calls our secure backend proxy instead of exposing API keys

import type {
  LLMExtractionResponse,
} from './extraction-types';
import type {
  SegmentAnalysis,
  MDAanalysis,
  ValidationResult,
} from './gemini-client';

// Backend API configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Base API client with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
  baseRoute: string = 'extraction'
): Promise<T> {
  const url = `${BACKEND_URL}/api/${baseRoute}/${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `API request failed with status ${response.status}`
      );
    }

    const result = await response.json();
    return result.data as T;
  } catch (error) {
    console.error(`[Backend] ${endpoint} error:`, error);
    throw new Error(
      `Backend request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract financials from SEC filing text
 */
export async function extractFinancialsWithBackend(
  text: string,
  prompt: string,
  onProgress?: (message: string) => void,
  useFlash: boolean = false
): Promise<LLMExtractionResponse> {
  const modelName = useFlash ? 'Gemini 3 Flash' : 'Gemini 3 Pro';
  onProgress?.(`Extracting financials with ${modelName}...`);

  return apiRequest<LLMExtractionResponse>('financials', {
    text,
    prompt,
    useFlash,
  });
}

/**
 * Extract business segment data
 */
export async function extractSegmentsWithBackend(
  text: string,
  prompt: string,
  onProgress?: (message: string) => void
): Promise<SegmentAnalysis> {
  onProgress?.('Analyzing business segments with Gemini 3 Pro...');

  return apiRequest<SegmentAnalysis>('segments', {
    text,
    prompt,
  });
}

/**
 * Analyze MD&A section
 */
export async function analyzeMDAWithBackend(
  text: string,
  prompt: string,
  onProgress?: (message: string) => void
): Promise<MDAanalysis> {
  onProgress?.('Analyzing MD&A section with Gemini 3 Pro...');

  return apiRequest<MDAanalysis>('mda', {
    text,
    prompt,
  });
}

/**
 * Extract complex tables
 */
export async function extractTablesWithBackend(
  text: string,
  prompt: string,
  onProgress?: (message: string) => void
): Promise<LLMExtractionResponse> {
  onProgress?.('Extracting complex tables with Gemini 3 Pro...');

  return apiRequest<LLMExtractionResponse>('tables', {
    text,
    prompt,
  });
}

/**
 * Validate extraction by comparing results
 */
export async function validateExtractionWithBackend(
  validationPrompt: string,
  onProgress?: (message: string) => void
): Promise<ValidationResult> {
  onProgress?.('Running validation pass with Gemini 3 Pro...');

  return apiRequest<ValidationResult>('validate', {
    validationPrompt,
  });
}

/**
 * Extract financials using Claude Opus
 */
export async function extractFinancialsWithClaudeBackend(
  text: string,
  prompt: string,
  onProgress?: (message: string) => void
): Promise<LLMExtractionResponse> {
  onProgress?.('Extracting financials with Claude Opus...');

  return apiRequest<LLMExtractionResponse>('financials', {
    text,
    prompt,
  }, 'claude');
}

/**
 * Perform final cross-model validation using Claude
 */
export async function performFinalReviewBackend(
  finalReviewPrompt: string,
  onProgress?: (message: string) => void
): Promise<LLMExtractionResponse & { validationSummary?: unknown }> {
  onProgress?.('Performing final cross-model validation with Claude Opus...');

  return apiRequest<LLMExtractionResponse & { validationSummary?: unknown }>(
    'final-review',
    {
      finalReviewPrompt,
    },
    'claude'
  );
}

/**
 * Check backend health
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
