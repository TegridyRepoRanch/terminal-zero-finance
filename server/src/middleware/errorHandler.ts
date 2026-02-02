// Error handling middleware
import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  console.error('[Error]', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      status: 'error',
    });
  }

  // Unknown errors - don't leak details in production
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    error: isDev ? err.message : 'Internal server error',
    status: 'error',
    ...(isDev && { stack: err.stack }),
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
