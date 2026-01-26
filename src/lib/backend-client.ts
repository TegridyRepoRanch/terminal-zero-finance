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

// CSRF token storage
let csrfToken: string | null = null;

/**
 * Fetch CSRF token from backend
 */
export async function fetchCsrfToken(): Promise<string> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/csrf-token`, {
      method: 'GET',
      credentials: 'include', // Include cookies for CSRF validation
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    }

    const data = await response.json();
    csrfToken = data.token;
    console.log('[CSRF] Token fetched successfully');
    return data.token;
  } catch (error) {
    console.error('[CSRF] Failed to fetch token:', error);
    throw new Error('Failed to fetch CSRF token. Please refresh the page.');
  }
}

/**
 * Get current CSRF token (fetch if not available)
 */
async function getCsrfToken(): Promise<string> {
  if (!csrfToken) {
    return await fetchCsrfToken();
  }
  return csrfToken;
}

/**
 * Clear cached CSRF token (used after validation failure)
 */
function clearCsrfToken(): void {
  csrfToken = null;
}

/**
 * Base API client with error handling and CSRF protection
 */
async function apiRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
  baseRoute: string = 'extraction',
  retry: boolean = true
): Promise<T> {
  const url = `${BACKEND_URL}/api/${baseRoute}/${endpoint}`;

  try {
    // Get CSRF token
    const token = await getCsrfToken();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': token,
      },
      credentials: 'include', // Include cookies for CSRF validation
      body: JSON.stringify(body),
    });

    // Handle CSRF token errors with automatic retry
    if (response.status === 403 && retry) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.code === 'CSRF_VALIDATION_FAILED') {
        console.warn('[CSRF] Token invalid, refetching and retrying...');
        clearCsrfToken();
        return apiRequest<T>(endpoint, body, baseRoute, false); // Retry once
      }
    }

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
 * Extract financials from PDF file (base64)
 * Sends PDF directly to backend - Gemini reads it natively
 */
export async function extractFinancialsFromPDFWithBackend(
  pdfBase64: string,
  mimeType: string,
  onProgress?: (message: string) => void,
  useFlash: boolean = false
): Promise<LLMExtractionResponse> {
  const modelName = useFlash ? 'Gemini 3 Flash' : 'Gemini 3 Pro';
  onProgress?.(`Analyzing PDF with ${modelName}...`);

  return apiRequest<LLMExtractionResponse>('financials/pdf', {
    pdfBase64,
    mimeType,
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
