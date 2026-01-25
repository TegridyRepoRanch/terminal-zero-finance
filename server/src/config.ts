// Server Configuration
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // API Keys
  geminiApiKey: process.env.GEMINI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000',
  ],

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Timeouts
  geminiTimeout: 120000, // 2 minutes

  // Validation
  maxTextLength: 500000, // 500KB max text input
} as const;

// Validate required config
export function validateConfig() {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  // Anthropic is optional - only needed if using Claude features
  if (!config.anthropicApiKey) {
    console.warn('[Config] ANTHROPIC_API_KEY not set - Claude features will be unavailable');
  }
}
