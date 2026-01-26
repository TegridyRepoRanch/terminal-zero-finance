// Vercel Serverless Function Entry Point
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from '../src/config.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { csrfTokenGenerator, csrfProtection, csrfErrorHandler } from '../src/middleware/csrf.js';
import { cacheMiddleware, getCacheStats, clearCache } from '../src/middleware/cache.js';

import extractionRoutes from '../src/routes/extraction.routes.js';
import claudeRoutes from '../src/routes/claude.routes.js';
import secRoutes from '../src/routes/sec.routes.js';

const app = express();

// Validate config (non-fatal)
try {
  validateConfig();
} catch (error) {
  console.warn('[Config] Validation warning:', error);
}

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CSRF token endpoint
app.get('/api/csrf-token', csrfTokenGenerator);

// Cache management
app.get('/api/cache/stats', getCacheStats);
app.post('/api/cache/clear', csrfProtection, clearCache);

// API routes
app.use('/api/extraction', csrfProtection, extractionRoutes);
app.use('/api/claude', csrfProtection, claudeRoutes);
app.use('/api/sec', cacheMiddleware, secRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    test: 'sec-only',
  });
});

// Root
app.get('/', (_req, res) => {
  res.json({ name: 'Terminal Zero Finance API', version: '1.0.3-sec', status: 'running' });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found', status: 'error' });
});

// Error handlers
app.use(csrfErrorHandler);
app.use(errorHandler);

export default app;
