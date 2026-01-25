// Extraction API Routes
import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validation.js';
import * as schemas from '../middleware/validation.js';
import * as geminiService from '../services/gemini.service.js';

const router = express.Router();

/**
 * POST /api/extraction/financials
 * Extract financial data from text
 */
router.post(
  '/financials',
  validate(schemas.extractFinancialsSchema),
  asyncHandler(async (req, res) => {
    const { text, useFlash, prompt } = req.body;

    const result = await geminiService.extractFinancials(text, useFlash || false, prompt);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/extraction/segments
 * Extract business segment data
 */
router.post(
  '/segments',
  validate(schemas.extractSegmentsSchema),
  asyncHandler(async (req, res) => {
    const { text, prompt } = req.body;

    const result = await geminiService.extractSegments(text, prompt);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/extraction/mda
 * Analyze MD&A section
 */
router.post(
  '/mda',
  validate(schemas.analyzeMDASchema),
  asyncHandler(async (req, res) => {
    const { text, prompt } = req.body;

    const result = await geminiService.analyzeMDA(text, prompt);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/extraction/tables
 * Extract complex table data
 */
router.post(
  '/tables',
  validate(schemas.extractTablesSchema),
  asyncHandler(async (req, res) => {
    const { text, prompt } = req.body;

    const result = await geminiService.extractTables(text, prompt);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/extraction/validate
 * Validate extraction results
 */
router.post(
  '/validate',
  validate(schemas.validateExtractionSchema),
  asyncHandler(async (req, res) => {
    const { validationPrompt } = req.body;

    const result = await geminiService.validateExtraction(validationPrompt);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/extraction/health
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
