// Embedding Routes - Generate vector embeddings for RAG
import { Router, Request, Response } from 'express';
import { generateEmbeddings, verifyExtraction } from '../services/gemini.service.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();

/**
 * POST /api/embeddings/generate
 * Generate embeddings for an array of texts
 */
router.post(
  '/generate',
  asyncHandler(async (req: Request, res: Response) => {
    const { texts } = req.body;

    if (!Array.isArray(texts)) {
      throw new AppError(400, 'texts must be an array of strings');
    }

    if (texts.length === 0) {
      throw new AppError(400, 'texts array cannot be empty');
    }

    if (texts.length > 20) {
      throw new AppError(400, 'Maximum 20 texts per request');
    }

    // Validate all texts are strings
    for (let i = 0; i < texts.length; i++) {
      if (typeof texts[i] !== 'string') {
        throw new AppError(400, `texts[${i}] must be a string`);
      }
      if (texts[i].length === 0) {
        throw new AppError(400, `texts[${i}] cannot be empty`);
      }
      if (texts[i].length > 10000) {
        throw new AppError(400, `texts[${i}] exceeds maximum length of 10000 characters`);
      }
    }

    console.log(`[Embeddings] Generating embeddings for ${texts.length} texts`);

    const embeddings = await generateEmbeddings(texts);

    res.json({
      status: 'success',
      data: {
        embeddings,
        count: embeddings.length,
        dimensions: embeddings[0]?.length || 0,
      },
    });
  })
);

/**
 * POST /api/embeddings/verify
 * Verify extracted financial data using AI reasoning
 */
router.post(
  '/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const { extractedData, relevantChunks } = req.body;

    if (!extractedData || typeof extractedData !== 'object') {
      throw new AppError(400, 'extractedData is required and must be an object');
    }

    if (!Array.isArray(relevantChunks)) {
      throw new AppError(400, 'relevantChunks must be an array of strings');
    }

    console.log('[Embeddings] Running AI verification');

    const result = await verifyExtraction(extractedData, relevantChunks);

    res.json({
      status: 'success',
      data: result,
    });
  })
);

/**
 * GET /api/embeddings/health
 * Health check for embedding endpoints
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    endpoints: ['/generate', '/verify'],
  });
});

export default router;
