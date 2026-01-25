// Input validation middleware using Zod
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import { config } from '../config.js';

// Validation schemas
export const extractFinancialsSchema = z.object({
  text: z.string().min(10).max(config.maxTextLength),
  prompt: z.string().min(10),
  useFlash: z.boolean().optional().default(false),
});

export const extractSegmentsSchema = z.object({
  text: z.string().min(10).max(config.maxTextLength),
  prompt: z.string().min(10),
});

export const analyzeMDASchema = z.object({
  text: z.string().min(10).max(config.maxTextLength),
  prompt: z.string().min(10),
});

export const extractTablesSchema = z.object({
  text: z.string().min(10).max(config.maxTextLength),
  prompt: z.string().min(10),
});

export const validateExtractionSchema = z.object({
  validationPrompt: z.string().min(10),
});

// Generic validation middleware
export function validate(schema: z.ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        next(new AppError(400, `Validation error: ${messages.join(', ')}`));
      } else {
        next(error);
      }
    }
  };
}
