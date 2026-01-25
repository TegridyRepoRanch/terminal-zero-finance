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
 * Safe JSON parse - handles markdown code blocks
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
  } catch (error) {
    console.error(`[Anthropic] JSON parse error in ${context}`);
    console.error(`[Anthropic] Response preview: ${response.substring(0, 200)}...`);
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
