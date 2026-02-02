// Anthropic Claude API Service - Server-side wrapper
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { AppError } from '../middleware/errorHandler.js';

// Anthropic Models
const ANTHROPIC_MODELS = {
  OPUS: 'claude-opus-4-5-20251101',
} as const;

// Initialize client
let client: Anthropic;

export function initializeAnthropicClient() {
  if (!config.anthropicApiKey) {
    console.warn('[Anthropic] API key not configured - Claude features will be unavailable');
    return;
  }
  client = new Anthropic({ apiKey: config.anthropicApiKey });
  console.log('[Anthropic] Client initialized');
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
 * Safe JSON parse - handles markdown code blocks and various response formats
 */
function safeParseJSON<T>(response: string, context: string): T {
  let jsonStr = response.trim();

  // Try 1: Extract from markdown code blocks
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Try 2: Find JSON object/array pattern in response
  if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
    const jsonObjectMatch = jsonStr.match(/(\{[\s\S]*\})/);
    const jsonArrayMatch = jsonStr.match(/(\[[\s\S]*\])/);
    if (jsonObjectMatch) {
      jsonStr = jsonObjectMatch[1];
    } else if (jsonArrayMatch) {
      jsonStr = jsonArrayMatch[1];
    }
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch (parseError) {
    console.error(`[Anthropic] JSON parse error in ${context}`);
    console.error(`[Anthropic] Parse error:`, parseError);
    console.error(`[Anthropic] Response length: ${response.length}`);
    console.error(`[Anthropic] Response preview: ${response.substring(0, 500)}...`);
    console.error(`[Anthropic] Attempted to parse: ${jsonStr.substring(0, 300)}...`);
    throw new AppError(500, `Failed to parse ${context} response`);
  }
}

/**
 * Extract financials using Claude Opus
 */
export async function extractFinancials(text: string, prompt: string): Promise<unknown> {
  if (!client) {
    throw new AppError(503, 'Anthropic client not initialized - API key missing');
  }

  console.log('[Anthropic] Extracting financials with Claude Opus');

  try {
    const result = await withTimeout(
      client.messages.create({
        model: ANTHROPIC_MODELS.OPUS,
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: prompt + text,
          },
        ],
      }),
      config.geminiTimeout, // Use same timeout as Gemini
      'Claude extraction'
    );

    const responseText = result.content[0].type === 'text' ? result.content[0].text : '';
    console.log(`[Anthropic] Response received, length: ${responseText.length}`);

    return safeParseJSON(responseText, 'Claude financial extraction');
  } catch (error) {
    if (error instanceof AppError) throw error;

    console.error('[Anthropic] API error:', error);
    throw new AppError(
      500,
      `Claude API error: ${error instanceof Error ? error.message : 'Unknown API error'}`
    );
  }
}

/**
 * Perform final review comparing multiple extractions
 */
export async function performFinalReview(finalReviewPrompt: string): Promise<unknown> {
  if (!client) {
    throw new AppError(503, 'Anthropic client not initialized - API key missing');
  }

  console.log('[Anthropic] Performing final review with Claude Opus');

  try {
    const result = await withTimeout(
      client.messages.create({
        model: ANTHROPIC_MODELS.OPUS,
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: finalReviewPrompt,
          },
        ],
      }),
      config.geminiTimeout,
      'Final review'
    );

    const responseText = result.content[0].type === 'text' ? result.content[0].text : '';
    console.log(`[Anthropic] Final review response received, length: ${responseText.length}`);

    return safeParseJSON(responseText, 'final review');
  } catch (error) {
    if (error instanceof AppError) throw error;

    console.error('[Anthropic] Final review error:', error);
    throw new AppError(
      500,
      `Final review failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
