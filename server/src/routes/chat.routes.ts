// Chat Routes - SSE streaming endpoints for DD chat feature
import { Router, Request, Response } from 'express';
import {
  streamClaudeChat,
  streamGeminiChat,
  orchestrateAIDiscussion,
  ChatMessage,
  ChatContext,
  StreamChunk,
} from '../services/chat.service.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();

// SSE headers helper
function setSSEHeaders(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();
}

// Send SSE event helper
function sendSSE(res: Response, data: StreamChunk) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// Validate messages array
function validateMessages(messages: unknown): messages is ChatMessage[] {
  if (!Array.isArray(messages)) return false;
  return messages.every(
    msg =>
      typeof msg === 'object' &&
      msg !== null &&
      typeof msg.role === 'string' &&
      typeof msg.content === 'string' &&
      ['user', 'assistant', 'system'].includes(msg.role)
  );
}

/**
 * POST /api/chat/claude/stream
 * Stream chat response from Claude
 */
router.post(
  '/claude/stream',
  asyncHandler(async (req: Request, res: Response) => {
    const { messages, context } = req.body;

    if (!validateMessages(messages)) {
      throw new AppError(400, 'Invalid messages format');
    }

    if (messages.length === 0) {
      throw new AppError(400, 'Messages array cannot be empty');
    }

    const chatContext: ChatContext = context || {};

    setSSEHeaders(res);

    // Handle client disconnect
    let isConnected = true;
    req.on('close', () => {
      isConnected = false;
      console.log('[Chat] Claude stream: client disconnected');
    });

    try {
      const stream = streamClaudeChat(messages, chatContext);

      for await (const chunk of stream) {
        if (!isConnected) break;
        sendSSE(res, chunk);
      }
    } catch (error) {
      console.error('[Chat] Claude stream error:', error);
      if (isConnected) {
        sendSSE(res, {
          type: 'error',
          error: error instanceof Error ? error.message : 'Stream failed',
          model: 'claude',
        });
      }
    } finally {
      if (isConnected) {
        res.end();
      }
    }
  })
);

/**
 * POST /api/chat/gemini/stream
 * Stream chat response from Gemini
 */
router.post(
  '/gemini/stream',
  asyncHandler(async (req: Request, res: Response) => {
    const { messages, context } = req.body;

    if (!validateMessages(messages)) {
      throw new AppError(400, 'Invalid messages format');
    }

    if (messages.length === 0) {
      throw new AppError(400, 'Messages array cannot be empty');
    }

    const chatContext: ChatContext = context || {};

    setSSEHeaders(res);

    let isConnected = true;
    req.on('close', () => {
      isConnected = false;
      console.log('[Chat] Gemini stream: client disconnected');
    });

    try {
      const stream = streamGeminiChat(messages, chatContext);

      for await (const chunk of stream) {
        if (!isConnected) break;
        sendSSE(res, chunk);
      }
    } catch (error) {
      console.error('[Chat] Gemini stream error:', error);
      if (isConnected) {
        sendSSE(res, {
          type: 'error',
          error: error instanceof Error ? error.message : 'Stream failed',
          model: 'gemini',
        });
      }
    } finally {
      if (isConnected) {
        res.end();
      }
    }
  })
);

/**
 * POST /api/chat/ai-discussion
 * AI-to-AI discussion mode with turn-based streaming
 */
router.post(
  '/ai-discussion',
  asyncHandler(async (req: Request, res: Response) => {
    const { topic, context, maxTurns = 5, startingModel = 'claude' } = req.body;

    if (!topic || typeof topic !== 'string') {
      throw new AppError(400, 'Topic is required');
    }

    if (topic.length < 5) {
      throw new AppError(400, 'Topic must be at least 5 characters');
    }

    const turns = Math.min(Math.max(1, Number(maxTurns) || 5), 20);
    const starter = startingModel === 'gemini' ? 'gemini' : 'claude';
    const chatContext: ChatContext = context || {};

    setSSEHeaders(res);

    let isConnected = true;
    req.on('close', () => {
      isConnected = false;
      console.log('[Chat] AI discussion: client disconnected');
    });

    try {
      const stream = orchestrateAIDiscussion(topic, chatContext, turns, starter);

      for await (const chunk of stream) {
        if (!isConnected) break;
        sendSSE(res, chunk);
      }
    } catch (error) {
      console.error('[Chat] AI discussion error:', error);
      if (isConnected) {
        sendSSE(res, {
          type: 'error',
          error: error instanceof Error ? error.message : 'Discussion failed',
        });
      }
    } finally {
      if (isConnected) {
        res.end();
      }
    }
  })
);

/**
 * GET /api/chat/health
 * Health check for chat endpoints
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    endpoints: ['/claude/stream', '/gemini/stream', '/ai-discussion'],
  });
});

export default router;
