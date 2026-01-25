// CSRF Protection Middleware
import { doubleCsrf } from 'csrf-csrf';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

// Initialize CSRF protection
const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => config.csrfSecret,
  cookieName: '__Host-tz.x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: config.nodeEnv === 'production',
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

/**
 * Middleware to generate and send CSRF token
 * Attach to GET endpoint that frontend calls on mount
 */
export function csrfTokenGenerator(req: Request, res: Response) {
  const token = generateToken(req, res);
  res.json({
    token,
    success: true,
  });
}

/**
 * CSRF protection middleware
 * Apply to all state-changing routes (POST, PUT, DELETE, PATCH)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF in development if disabled
  if (config.nodeEnv === 'development' && !config.csrfEnabled) {
    console.log('[CSRF] Protection disabled in development');
    return next();
  }

  // Apply double CSRF token validation
  doubleCsrfProtection(req, res, next);
}

/**
 * Error handler for CSRF validation failures
 */
export function csrfErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err.message === 'invalid csrf token') {
    return res.status(403).json({
      error: 'Invalid CSRF token. Please refresh the page and try again.',
      status: 'error',
      code: 'CSRF_VALIDATION_FAILED',
    });
  }
  next(err);
}
