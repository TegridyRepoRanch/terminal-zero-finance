// Terminal Zero Finance - Backend API Server
// Secure proxy for Gemini API calls
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeGeminiClient } from './services/gemini.service.js';
import extractionRoutes from './routes/extraction.routes.js';

// Validate configuration
try {
  validateConfig();
} catch (error) {
  console.error('[Config] Validation failed:', error);
  process.exit(1);
}

// Initialize Gemini client
initializeGeminiClient();

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow for development
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
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

// Request logging (development only)
if (config.nodeEnv === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// API routes
app.use('/api/extraction', extractionRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    status: 'error',
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  console.log('='.repeat(60));
  console.log('🚀 Terminal Zero Finance - Backend API');
  console.log('='.repeat(60));
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Server running on: http://localhost:${config.port}`);
  console.log(`Health check: http://localhost:${config.port}/health`);
  console.log(`API endpoints: http://localhost:${config.port}/api/extraction/*`);
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});
