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

  // CORS - allow all Vercel deployments (preview + production)
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  // Allow any vercel.app subdomain for preview deployments
  allowVercelOrigins: true,

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Timeouts
  geminiTimeout: 170000, // ~3 minutes (just under Vercel's 180s limit)

  // Validation
  maxTextLength: 500000, // 500KB max text input

  // CSRF Protection
  csrfSecret: process.env.CSRF_SECRET || 'terminal-zero-csrf-secret-change-in-production',
  csrfEnabled: process.env.CSRF_ENABLED !== 'false', // Enabled by default
} as const;

// Validate required config
export function validateConfig() {
  if (!config.geminiApiKey) {
    console.warn('[Config] GEMINI_API_KEY not set - extraction features will be unavailable');
    console.warn('[Config] Set GEMINI_API_KEY environment variable in Vercel project settings');
  } else {
    console.log('[Config] GEMINI_API_KEY configured');
  }

  // Anthropic is optional - only needed if using Claude features
  if (!config.anthropicApiKey) {
    console.warn('[Config] ANTHROPIC_API_KEY not set - Claude features will be unavailable');
  } else {
    console.log('[Config] ANTHROPIC_API_KEY configured');
  }
}
