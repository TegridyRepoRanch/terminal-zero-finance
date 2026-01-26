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
import { initializeGeminiClient } from '../src/services/gemini.service.js';
import { initializeAnthropicClient } from '../src/services/anthropic.service.js';
import extractionRoutes from '../src/routes/extraction.routes.js';
import claudeRoutes from '../src/routes/claude.routes.js';
import secRoutes from '../src/routes/sec.routes.js';

console.log('[Routes] Extraction routes imported:', !!extractionRoutes, typeof extractionRoutes);
console.log('[Routes] Claude routes imported:', !!claudeRoutes, typeof claudeRoutes);
console.log('[Routes] SEC routes imported:', !!secRoutes, typeof secRoutes);

// Validate configuration (non-fatal - log warnings only)
try {
  validateConfig();
  console.log('[Config] Validation passed');
} catch (error) {
  console.warn('[Config] Validation failed:', error);
  console.warn('[Config] Server will start but some features may be unavailable');
}

// Initialize AI clients
initializeGeminiClient();
initializeAnthropicClient();

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// CSRF token endpoint
app.get('/api/csrf-token', csrfTokenGenerator);

// Cache management endpoints
app.get('/api/cache/stats', getCacheStats);
app.post('/api/cache/clear', csrfProtection, clearCache);

// API routes
app.use('/api/extraction', cacheMiddleware, csrfProtection, extractionRoutes);
console.log('[Routes] Registered /api/extraction');
app.use('/api/claude', cacheMiddleware, csrfProtection, claudeRoutes);
console.log('[Routes] Registered /api/claude');
// SEC EDGAR proxy (no CSRF needed for public data)
app.use('/api/sec', cacheMiddleware, secRoutes);
console.log('[Routes] Registered /api/sec (no CSRF)');

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// Debug endpoint to list all registered routes
app.get('/debug/routes', (_req, res) => {
  const routes: string[] = [];
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          const path = middleware.regexp.source.replace('\\/?', '').replace('(?=\\/|$)', '').replace(/\\\//g, '/');
          routes.push(`${Object.keys(handler.route.methods).join(', ').toUpperCase()} ${path}${handler.route.path}`);
        }
      });
    }
  });
  res.json({
    totalRoutes: routes.length,
    routes: routes.sort(),
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Terminal Zero Finance API',
    version: '1.0.0',
    status: 'running',
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    status: 'error',
  });
});

// Error handlers
app.use(csrfErrorHandler);
app.use(errorHandler);

// Export for Vercel
export default app;
