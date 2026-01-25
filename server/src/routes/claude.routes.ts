// Claude/Anthropic API Routes
import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validation.js';
import { z } from 'zod';
import * as anthropicService from '../services/anthropic.service.js';
import { config } from '../config.js';

const router = express.Router();

// Validation schemas
const extractFinancialsSchema = z.object({
  text: z.string().min(10).max(config.maxTextLength),
  prompt: z.string().min(10),
});

const finalReviewSchema = z.object({
  finalReviewPrompt: z.string().min(10),
});

/**
 * POST /api/claude/financials
 * Extract financial data using Claude Opus
 */
router.post(
  '/financials',
  validate(extractFinancialsSchema),
  asyncHandler(async (req, res) => {
    const { text, prompt } = req.body;

    const result = await anthropicService.extractFinancials(text, prompt);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/claude/final-review
 * Perform final cross-model validation
 */
router.post(
  '/final-review',
  validate(finalReviewSchema),
  asyncHandler(async (req, res) => {
    const { finalReviewPrompt } = req.body;

    const result = await anthropicService.performFinalReview(finalReviewPrompt);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/claude/health
 * Health check endpoint
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
