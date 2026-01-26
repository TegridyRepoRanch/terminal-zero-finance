// Chat Service - Orchestrates streaming chat with Claude and Gemini
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { AppError } from '../middleware/errorHandler.js';

// Types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: 'claude' | 'gemini' | 'user' | 'system';
}

export interface ChatContext {
  ticker?: string;
  companyName?: string;
  financials?: Record<string, unknown>;
  extractionMetadata?: Record<string, unknown>;
}

export interface StreamChunk {
  type: 'text' | 'done' | 'error' | 'turn_start' | 'turn_end';
  content?: string;
  model?: 'claude' | 'gemini';
  error?: string;
  turnNumber?: number;
}

// Anthropic Models
const ANTHROPIC_MODELS = {
  OPUS: 'claude-opus-4-5-20251101',
} as const;

// Gemini Models
const GEMINI_MODELS = {
  PRO: 'gemini-2.5-pro-preview-05-06',
} as const;

// Initialize clients lazily
let anthropicClient: Anthropic | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    if (!config.anthropicApiKey) {
      throw new AppError(503, 'Anthropic API key not configured');
    }
    anthropicClient = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return anthropicClient;
}

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    if (!config.geminiApiKey) {
      throw new AppError(503, 'Gemini API key not configured');
    }
    geminiClient = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return geminiClient;
}

/**
 * Build system prompt with financial context
 */
export function buildSystemPrompt(context: ChatContext, model: 'claude' | 'gemini'): string {
  const modelName = model === 'claude' ? 'Claude (Anthropic)' : 'Gemini (Google)';

  let prompt = `You are ${modelName}, an AI financial analyst assistant helping with due diligence research.

Your role is to provide insightful analysis and answer questions about financial data, SEC filings, and investment considerations.

Guidelines:
- Be concise but thorough
- Support claims with data when available
- Acknowledge uncertainty when appropriate
- Focus on financial analysis and due diligence
- When discussing specific numbers, cite where they come from
`;

  if (context.ticker || context.companyName) {
    prompt += `\n## Current Company Context
`;
    if (context.ticker) prompt += `- Ticker: ${context.ticker}\n`;
    if (context.companyName) prompt += `- Company: ${context.companyName}\n`;
  }

  if (context.financials && Object.keys(context.financials).length > 0) {
    prompt += `\n## Financial Data Available
The following financial data has been extracted from SEC filings:

\`\`\`json
${JSON.stringify(context.financials, null, 2)}
\`\`\`

Use this data to answer questions accurately. Reference specific figures when relevant.
`;
  }

  if (context.extractionMetadata) {
    prompt += `\n## Data Source
${JSON.stringify(context.extractionMetadata, null, 2)}
`;
  }

  return prompt;
}

/**
 * Stream chat response from Claude
 */
export async function* streamClaudeChat(
  messages: ChatMessage[],
  context: ChatContext
): AsyncGenerator<StreamChunk> {
  const client = getAnthropicClient();
  const systemPrompt = buildSystemPrompt(context, 'claude');

  // Convert messages to Anthropic format
  const anthropicMessages = messages.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  console.log('[Chat] Starting Claude stream');

  try {
    const stream = client.messages.stream({
      model: ANTHROPIC_MODELS.OPUS,
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          yield { type: 'text', content: delta.text, model: 'claude' };
        }
      }
    }

    yield { type: 'done', model: 'claude' };
  } catch (error) {
    console.error('[Chat] Claude stream error:', error);
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown Claude error',
      model: 'claude',
    };
  }
}

/**
 * Stream chat response from Gemini
 */
export async function* streamGeminiChat(
  messages: ChatMessage[],
  context: ChatContext
): AsyncGenerator<StreamChunk> {
  const client = getGeminiClient();
  const systemPrompt = buildSystemPrompt(context, 'gemini');

  const model = client.getGenerativeModel({
    model: GEMINI_MODELS.PRO,
    systemInstruction: systemPrompt,
  });

  // Build chat history (all but the last message)
  const history = messages.slice(0, -1).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  // Get the last message as the current input
  const lastMessage = messages[messages.length - 1];

  console.log('[Chat] Starting Gemini stream');

  try {
    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(lastMessage.content);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield { type: 'text', content: text, model: 'gemini' };
      }
    }

    yield { type: 'done', model: 'gemini' };
  } catch (error) {
    console.error('[Chat] Gemini stream error:', error);
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown Gemini error',
      model: 'gemini',
    };
  }
}

/**
 * Non-streaming chat for AI-to-AI discussion (needs full response for next turn)
 */
async function getClaudeResponse(
  messages: ChatMessage[],
  context: ChatContext
): Promise<string> {
  const client = getAnthropicClient();
  const systemPrompt = buildSystemPrompt(context, 'claude');

  const anthropicMessages = messages.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  const response = await client.messages.create({
    model: ANTHROPIC_MODELS.OPUS,
    max_tokens: 4096,
    system: systemPrompt,
    messages: anthropicMessages,
  });

  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock && 'text' in textBlock ? textBlock.text : '';
}

async function getGeminiResponse(
  messages: ChatMessage[],
  context: ChatContext
): Promise<string> {
  const client = getGeminiClient();
  const systemPrompt = buildSystemPrompt(context, 'gemini');

  const model = client.getGenerativeModel({
    model: GEMINI_MODELS.PRO,
    systemInstruction: systemPrompt,
  });

  const history = messages.slice(0, -1).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const lastMessage = messages[messages.length - 1];
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);

  return result.response.text();
}

/**
 * Orchestrate AI-to-AI discussion
 * Yields streaming chunks as each AI responds
 */
export async function* orchestrateAIDiscussion(
  topic: string,
  context: ChatContext,
  maxTurns: number,
  startingModel: 'claude' | 'gemini' = 'claude'
): AsyncGenerator<StreamChunk> {
  console.log(`[Chat] Starting AI discussion: ${maxTurns} turns, starting with ${startingModel}`);

  // Build the initial prompt
  const discussionPrompt = `Let's have a focused discussion about: "${topic}"

This is a collaborative due diligence analysis. The other AI will respond after you.
- Build on the other's points
- Offer different perspectives or challenge assumptions constructively
- Focus on actionable insights
- Keep responses focused and concise (2-3 paragraphs max)

Please begin with your initial analysis.`;

  // Track conversation history for both models
  const sharedHistory: ChatMessage[] = [
    { role: 'user', content: discussionPrompt },
  ];

  let currentModel = startingModel;

  for (let turn = 1; turn <= maxTurns; turn++) {
    yield { type: 'turn_start', model: currentModel, turnNumber: turn };

    try {
      let response: string;

      if (currentModel === 'claude') {
        // Stream Claude's response
        const claudeGen = streamClaudeChat(sharedHistory, context);
        let fullResponse = '';

        for await (const chunk of claudeGen) {
          if (chunk.type === 'text') {
            fullResponse += chunk.content;
            yield chunk;
          } else if (chunk.type === 'error') {
            yield chunk;
            return;
          }
        }

        response = fullResponse;
      } else {
        // Stream Gemini's response
        const geminiGen = streamGeminiChat(sharedHistory, context);
        let fullResponse = '';

        for await (const chunk of geminiGen) {
          if (chunk.type === 'text') {
            fullResponse += chunk.content;
            yield chunk;
          } else if (chunk.type === 'error') {
            yield chunk;
            return;
          }
        }

        response = fullResponse;
      }

      // Add this response to history
      sharedHistory.push({
        role: 'assistant',
        content: response,
        model: currentModel,
      });

      // Prepare for next turn - add a "handoff" message
      if (turn < maxTurns) {
        const nextModel = currentModel === 'claude' ? 'gemini' : 'claude';
        sharedHistory.push({
          role: 'user',
          content: `[${currentModel === 'claude' ? 'Claude' : 'Gemini'} has finished. Now ${nextModel === 'claude' ? 'Claude' : 'Gemini'}, please respond to their analysis and add your perspective.]`,
        });
      }

      yield { type: 'turn_end', model: currentModel, turnNumber: turn };

      // Switch models
      currentModel = currentModel === 'claude' ? 'gemini' : 'claude';
    } catch (error) {
      console.error(`[Chat] AI discussion error on turn ${turn}:`, error);
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'AI discussion failed',
        model: currentModel,
        turnNumber: turn,
      };
      return;
    }
  }

  yield { type: 'done' };
}
