# Terminal Zero Finance - Developer Handoff Document

**Last Updated**: January 26, 2026
**Current Status**: Working - SEC routes functional, CSRF enabled, deployment configured
**Priority**: Set environment variables in Vercel, delete old deployment

---

## Quick Start

```bash
# Install dependencies
npm run setup

# Run both frontend and backend locally
npm run dev:all

# Frontend only: http://localhost:5173
npm run dev

# Backend only: http://localhost:3001
npm run dev:server
```

---

## Project Overview

**Terminal Zero Finance** is a financial analysis tool that:
1. Fetches SEC 10-K/10-Q filings by ticker symbol
2. Extracts financial data using AI (Google Gemini + Anthropic Claude)
3. Performs DCF (Discounted Cash Flow) valuations
4. Displays interactive charts and financial grids

### Architecture

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   Frontend (React 19)   │  HTTP   │   Backend (Express)     │
│   Vite + TypeScript     │◄───────►│   TypeScript + Node     │
│   localhost:5173        │         │   localhost:3001        │
│   vercel.app (prod)     │         │   server-amber-phi      │
└─────────────────────────┘         └─────────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
            ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
            │ Google Gemini│         │   Anthropic  │         │  SEC EDGAR   │
            │ (extraction) │         │   Claude     │         │  (filings)   │
            └──────────────┘         └──────────────┘         └──────────────┘
```

---

## Directory Structure

```
terminal-zero-finance/
├── src/                          # Frontend React app
│   ├── components/               # UI components (22 files)
│   │   ├── upload/               # File upload & processing screens
│   │   ├── finance/              # Financial data grids
│   │   └── ui/                   # Shared UI primitives
│   ├── lib/                      # Core business logic
│   │   ├── sec-edgar-client.ts   # SEC API client (IMPORTANT)
│   │   ├── backend-client.ts     # Backend API wrapper
│   │   ├── dcf-logic.ts          # DCF valuation engine
│   │   └── api-config.ts         # API configuration
│   ├── store/                    # Zustand state management
│   └── contexts/                 # React contexts (Theme, Auth)
│
├── server/                       # Backend Express API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── sec.routes.ts     # SEC EDGAR proxy (WORKING)
│   │   │   ├── extraction.routes.ts # Gemini extraction
│   │   │   └── claude.routes.ts  # Claude extraction
│   │   ├── services/
│   │   │   ├── gemini.service.ts # Google AI integration
│   │   │   └── anthropic.service.ts # Claude integration
│   │   ├── middleware/
│   │   │   ├── csrf.ts           # CSRF protection (ENABLED)
│   │   │   ├── cache.ts          # LRU caching
│   │   │   └── errorHandler.ts   # Error handling
│   │   ├── server.ts             # Dev server entry
│   │   └── config.ts             # Environment config
│   │
│   ├── api/
│   │   └── index.ts              # Vercel serverless entry (PROD)
│   │
│   ├── vercel.json               # Vercel deployment config
│   └── package.json
│
├── package.json                  # Root monorepo config
└── vite.config.ts                # Frontend build config
```

---

## Current Deployment Status

### Frontend
- **URL**: Deployed to Vercel (auto-deploy on push to main)
- **Status**: Working
- **Build**: `npm run build` (Vite)

### Backend
- **URL**: `https://server-amber-phi.vercel.app`
- **Status**: Working (as of Jan 26, 2026)
- **Entry Point**: `server/api/index.ts`
- **Deploy**: `cd server && npx vercel --prod`

### Known Issue: Multiple Vercel Deployments

There were TWO backend instances:
1. `terminal-zero-finance-fyk1.vercel.app` - OLD (v1.0.0, broken)
2. `server-amber-phi.vercel.app` - CURRENT (v1.0.3-sec, working)

The frontend now points to the correct one. Delete the old deployment from Vercel dashboard.

---

## The Good

### Well-Architected
- Clean separation: frontend/backend in same repo but independent
- TypeScript strict mode everywhere
- Zod validation on all API inputs
- Comprehensive error handling with custom AppError class
- Modular route/service pattern

### Security Conscious
- API keys stored on backend only (not exposed to frontend)
- Helmet security headers
- CORS whitelist (not `*`)
- Rate limiting (100 req/15min per IP)
- Input validation and sanitization

### Smart Caching
- LRU cache with TTL on backend
- Caches SEC ticker lookups (60min)
- Reduces redundant API calls
- SHA256-based cache keys

### Dual AI Validation
- Primary extraction: Google Gemini (fast, cheap)
- Validation: Anthropic Claude (thorough)
- Cross-model comparison catches errors

---

## The Bad

### 1. ~~CSRF Protection is DISABLED~~ FIXED

**File**: `server/src/middleware/csrf.ts`

CSRF protection is now **enabled** using the double-submit cookie pattern with `csrf-csrf` v4.

- Frontend fetches token from `/api/csrf-token`
- Token is sent in `x-csrf-token` header on POST requests
- Cookie is set with `sameSite: 'none'` and `secure: true` in production for cross-origin requests

**Configuration**:
- Set `CSRF_SECRET` environment variable in production (generate with `openssl rand -base64 32`)
- Can be disabled with `CSRF_ENABLED=false` if needed (not recommended)

### 2. ~~Hardcoded Backend URL~~ FIXED

**Files**: `src/lib/sec-edgar-client.ts`, `src/lib/backend-client.ts`

Backend URL now uses **environment variable only**:

```typescript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
```

**Required Action**: Set `VITE_BACKEND_URL` in Vercel frontend project settings:
```
VITE_BACKEND_URL=https://server-amber-phi.vercel.app
```

A console warning will appear if the env var is not set in production.

### 3. Vercel Deployment Confusion

**Issue**: Two separate Vercel projects exist for the backend.

**Root Cause**: Unclear deployment history, possibly manual deploys vs git-triggered.

**Fix**:
1. Delete old deployment (`terminal-zero-finance-fyk1`)
2. Set up proper CI/CD with single deployment target
3. Use Vercel project linking: `vercel link` in server directory

---

## The Ugly

### Vercel Build/Deploy Issues

The main pain point has been deployment synchronization:

1. **Version Mismatch**: Code shows `v1.0.3-sec` but deployment showed `v1.0.0`
2. **Route Registration**: SEC routes existed in code but returned 404 in prod
3. **Two Instances**: Confusion about which deployment was active

**Diagnosis Steps Used**:
```bash
# Check deployed version
curl https://server-amber-phi.vercel.app/

# Should return: {"version":"1.0.3-sec",...}

# Test SEC endpoint
curl https://server-amber-phi.vercel.app/api/sec/tickers | head -100
```

**Current vercel.json**:
```json
{
  "version": 2,
  "builds": [{
    "src": "api/index.ts",
    "use": "@vercel/node",
    "config": { "maxDuration": 60 }
  }],
  "routes": [{
    "src": "/(.*)",
    "dest": "api/index.ts"
  }]
}
```

This routes ALL requests to the Express app. The Express app then handles routing internally.

### SEC CORS Fallback is Ineffective

**File**: `src/lib/sec-edgar-client.ts`

The frontend has CORS proxy fallbacks, but SEC.gov blocks most CORS proxies anyway. The fallback chain:
1. Backend proxy (works)
2. allorigins.win (usually blocked)
3. thingproxy (usually blocked)
4. corsproxy.io (usually blocked)

**Reality**: If backend fails, user gets error. The fallbacks don't help.

---

## Environment Variables

### Backend (server/.env)
```env
# Required
GEMINI_API_KEY=your-gemini-key
PORT=3001
NODE_ENV=development

# CSRF Protection (required for production)
CSRF_SECRET=your-csrf-secret  # Generate with: openssl rand -base64 32
# CSRF_ENABLED=true  # Set to false to disable (not recommended)

# Optional
ANTHROPIC_API_KEY=your-claude-key
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env)
```env
# Required for production
VITE_BACKEND_URL=https://server-amber-phi.vercel.app

# Optional (analytics)
VITE_SENTRY_DSN=
VITE_POSTHOG_KEY=
```

### Vercel Environment Variables

Set these in Vercel project settings:

**Backend Project** (server-amber-phi):
- `GEMINI_API_KEY` - Required for AI extraction
- `ANTHROPIC_API_KEY` - Optional, for Claude validation
- `NODE_ENV=production`
- `ALLOWED_ORIGINS=https://your-frontend.vercel.app`
- `CSRF_SECRET` - **Required** - Generate with `openssl rand -base64 32`

**Frontend Project**:
- `VITE_BACKEND_URL=https://server-amber-phi.vercel.app` - **Required**

---

## API Endpoints

### SEC Routes (Working)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sec/tickers` | All company tickers |
| GET | `/api/sec/submissions/:cik` | Filings for company |
| POST | `/api/sec/lookup` | CIK by ticker |
| POST | `/api/sec/latest-filing` | Latest 10-K/10-Q |

### Extraction Routes (Needs API Keys)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/extraction/financials` | Gemini extraction |
| POST | `/api/extraction/financials/pdf` | PDF extraction |
| POST | `/api/claude/financials` | Claude extraction |
| POST | `/api/claude/final-review` | Cross-validation |

### Utility Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/` | Version info |
| GET | `/api/csrf-token` | CSRF token |
| GET | `/api/cache/stats` | Cache stats |

---

## Testing Deployment

```bash
# 1. Check backend is alive
curl https://server-amber-phi.vercel.app/health
# Expected: {"status":"healthy","test":"sec-only",...}

# 2. Check version matches code
curl https://server-amber-phi.vercel.app/
# Expected: {"version":"1.0.3-sec",...}

# 3. Test SEC endpoint
curl https://server-amber-phi.vercel.app/api/sec/tickers | head -100
# Expected: {"status":"success","data":{...}}

# 4. Test SEC lookup
curl -X POST https://server-amber-phi.vercel.app/api/sec/lookup \
  -H "Content-Type: application/json" \
  -d '{"ticker":"AAPL"}'
# Expected: {"status":"success","data":{"cik":"0000320193",...}}
```

---

## Priority Fixes

### P0 - Critical (Before Production)
1. ~~**Enable CSRF Protection**~~ ✅ DONE - Implemented with csrf-csrf v4
2. ~~**Remove Hardcoded Backend URL**~~ ✅ DONE - Uses VITE_BACKEND_URL env var
3. **Set Environment Variables** - Add `CSRF_SECRET` to backend, `VITE_BACKEND_URL` to frontend in Vercel
4. **Clean Up Vercel Projects** - Delete old deployment (`terminal-zero-finance-fyk1`)

### P1 - Important
5. Set up proper CI/CD (single deployment target)
6. Add monitoring (Sentry for errors)
7. Load test backend under real usage

### P2 - Nice to Have
8. Improve error messages for users
9. Add retry logic for AI API calls
10. Consider per-user caching for extractions

---

## Key Files to Understand

| File | Purpose | Notes |
|------|---------|-------|
| `server/api/index.ts` | Vercel entry point | This is what runs in production |
| `server/src/server.ts` | Dev server entry | Used with `npm run dev:server` |
| `server/src/routes/sec.routes.ts` | SEC API proxy | The working routes |
| `server/src/middleware/csrf.ts` | CSRF middleware | Enabled, uses double-submit cookie |
| `src/lib/sec-edgar-client.ts` | Frontend SEC client | Uses VITE_BACKEND_URL env var |
| `server/vercel.json` | Deployment config | Routes all to Express |

---

## Contact & Resources

- **SEC EDGAR Docs**: https://www.sec.gov/developer
- **Gemini API**: https://makersuite.google.com/
- **Anthropic API**: https://console.anthropic.com/
- **Vercel Docs**: https://vercel.com/docs

---

## Summary

The app works locally and the SEC routes work in production.

**Completed fixes:**
1. ✅ **CSRF enabled** - Using double-submit cookie pattern with csrf-csrf v4
2. ✅ **Hardcoded URL removed** - Now uses VITE_BACKEND_URL environment variable

**Remaining action items:**
1. **Set Vercel environment variables** - Add `CSRF_SECRET` to backend, `VITE_BACKEND_URL` to frontend
2. **Delete old Vercel deployment** - Remove `terminal-zero-finance-fyk1` from Vercel dashboard

The codebase is well-structured and type-safe. Security is now properly configured.
