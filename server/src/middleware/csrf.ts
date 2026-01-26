// CSRF Protection Middleware
import { doubleCsrf } from 'csrf-csrf';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

// Initialize CSRF protection (currently disabled - see TODO below)
// const csrfProtectionUtils = doubleCsrf({
//   getSecret: () => config.csrfSecret,
//   getSessionIdentifier: (req) => {
//     // For stateless CSRF, use IP address as session identifier
//     return req.ip || 'unknown';
//   },
//   cookieName: 'tz-csrf-token',
//   cookieOptions: {
//     sameSite: config.nodeEnv === 'production' ? 'none' : 'lax', // 'none' for cross-domain in production
//     path: '/',
//     secure: config.nodeEnv === 'production', // Required for sameSite: 'none'
//     httpOnly: true,
//   },
//   size: 64,
//   ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
// });

/**
 * Generates and returns a CSRF token for the client.
 *
 * TEMPORARILY DISABLED - Returns a dummy token for now.
 * The actual CSRF token generation has TypeScript type issues with csrf-csrf v4.
 * TODO: Fix CSRF implementation or switch to different library.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export function csrfTokenGenerator(req: Request, res: Response) {
  console.log('[CSRF] Token endpoint called (CSRF temporarily disabled)');
  res.json({
    token: 'csrf-disabled',
    success: true,
  });
}

/**
 * CSRF protection middleware (TEMPORARILY DISABLED).
 *
 * CSRF validation is currently disabled due to TypeScript type issues
 * with csrf-csrf v4 library and cross-domain cookie complications.
 *
 * TODO: Re-enable CSRF protection with proper implementation.
 * Consider alternatives:
 * - JWT tokens instead of cookies
 * - Different CSRF library with better TypeScript support
 * - Custom CSRF implementation
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function csrfProtection(_req: Request, _res: Response, next: NextFunction) {
  console.log('[CSRF] Protection temporarily disabled - allowing request');
  next();
}

/**
 * Error handler middleware for CSRF validation failures.
 *
 * Catches CSRF validation errors and returns a user-friendly 403 response.
 * Should be registered as an error handling middleware in Express.
 *
 * If the error is not CSRF-related, passes it to the next error handler.
 *
 * @param err - Error object from CSRF validation
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function to pass non-CSRF errors
 *
 * @example
 * app.use(csrfErrorHandler);
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
