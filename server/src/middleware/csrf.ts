// CSRF Protection Middleware
import { doubleCsrf } from 'csrf-csrf';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

// Initialize CSRF protection using double-submit cookie pattern
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => config.csrfSecret,
  getSessionIdentifier: (req: Request) => {
    // Use a combination of IP and user-agent for stateless session identification
    // This provides reasonable security without requiring server-side sessions
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    return `${ip}:${userAgent.substring(0, 50)}`;
  },
  cookieName: 'tz-csrf-token',
  cookieOptions: {
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    path: '/',
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 1000, // 1 hour
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

/**
 * Generates and returns a CSRF token for the client.
 * The token is also set as an httpOnly cookie for the double-submit pattern.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export function csrfTokenGenerator(req: Request, res: Response) {
  if (!config.csrfEnabled) {
    console.log('[CSRF] Token endpoint called (CSRF disabled via config)');
    res.json({
      token: 'csrf-disabled',
      success: true,
    });
    return;
  }

  try {
    const token = generateCsrfToken(req, res);
    console.log('[CSRF] Token generated successfully');
    res.json({
      token,
      success: true,
    });
  } catch (error) {
    console.error('[CSRF] Token generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate CSRF token',
      status: 'error',
    });
  }
}

/**
 * CSRF protection middleware using double-submit cookie pattern.
 *
 * Validates that:
 * 1. The CSRF cookie is present
 * 2. The CSRF header (x-csrf-token) matches the cookie value
 *
 * Can be disabled via CSRF_ENABLED=false environment variable.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (!config.csrfEnabled) {
    console.log('[CSRF] Protection disabled via config - allowing request');
    next();
    return;
  }

  doubleCsrfProtection(req, res, next);
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
  _req: Request,
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
