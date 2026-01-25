# Backend Setup Guide

This guide explains how to set up and use the secure backend API proxy for Terminal Zero Finance.

## Why a Backend?

**Security**: The backend keeps your AI API keys secure on the server instead of exposing them in the frontend code. This prevents unauthorized usage and API key theft.

**Before** (Insecure):
```
Frontend → Gemini/Claude API (key exposed in browser)
```

**After** (Secure):
```
Frontend → Backend API → Gemini/Claude API (key secure on server)
```

## Quick Start

### 1. Install Dependencies

From the project root:
```bash
npm run setup
```

This installs dependencies for both frontend and backend.

### 2. Configure Environment Variables

#### Backend Configuration
```bash
cd server
cp .env.example .env
```

Edit `server/.env` and add your API keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=3001
NODE_ENV=development
```

#### Frontend Configuration
```bash
# From project root
cp .env.example .env
```

Edit `.env` (frontend):
```env
VITE_BACKEND_URL=http://localhost:3001
```

### 3. Run Development Servers

**Option A: Run both servers together**
```bash
npm run dev:all
```

**Option B: Run servers separately**

Terminal 1 (Backend):
```bash
npm run dev:server
```

Terminal 2 (Frontend):
```bash
npm run dev
```

### 4. Verify Setup

1. **Backend Health Check**:
   ```bash
   curl http://localhost:3001/health
   ```
   Should return: `{"status":"healthy",...}`

2. **Open Frontend**:
   Navigate to `http://localhost:5173`

3. **Test Extraction**:
   Upload a PDF - it should now use the secure backend API

## Project Structure

```
terminal-zero-finance/
├── src/                      # Frontend React app
│   └── lib/
│       ├── backend-client.ts    # NEW: Backend API client
│       ├── gemini-client.ts     # OLD: Direct API calls (deprecated)
│       └── anthropic-client.ts  # OLD: Direct API calls (deprecated)
│
├── server/                   # NEW: Backend API server
│   ├── src/
│   │   ├── server.ts           # Express app
│   │   ├── config.ts           # Configuration
│   │   ├── middleware/         # Validation, error handling
│   │   ├── services/           # Gemini & Claude API wrappers
│   │   └── routes/             # API endpoints
│   ├── package.json
│   ├── .env                    # API keys (DO NOT COMMIT)
│   └── .env.example            # Template
│
├── package.json              # Frontend dependencies
├── .env                      # Frontend config (DO NOT COMMIT)
└── .env.example              # Template
```

## Environment Variables

### Backend (server/.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key |
| `ANTHROPIC_API_KEY` | ⚠️ Optional | Anthropic Claude API key (for Claude features) |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | Environment (development/production) |
| `ALLOWED_ORIGINS` | No | CORS allowed origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window (default: 900000 = 15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max requests per window (default: 100) |

### Frontend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_BACKEND_URL` | ✅ Yes | Backend API URL (default: http://localhost:3001) |

## API Endpoints

### Gemini Extraction
- `POST /api/extraction/financials` - Extract financial data
- `POST /api/extraction/segments` - Extract business segments
- `POST /api/extraction/mda` - Analyze MD&A section
- `POST /api/extraction/tables` - Extract complex tables
- `POST /api/extraction/validate` - Validate extraction

### Claude Extraction
- `POST /api/claude/financials` - Extract with Claude Opus
- `POST /api/claude/final-review` - Cross-model validation

### Health Checks
- `GET /health` - Server health
- `GET /api/extraction/health` - Gemini service health
- `GET /api/claude/health` - Claude service health

## Development Workflow

### Making Changes

1. **Frontend changes**: Edit files in `src/`, server auto-reloads
2. **Backend changes**: Edit files in `server/src/`, server auto-reloads (tsx watch)

### Testing API Calls

```bash
# Test health
curl http://localhost:3001/health

# Test extraction (replace with actual text and prompt)
curl -X POST http://localhost:3001/api/extraction/financials \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Sample SEC filing text...",
    "prompt": "Extract financial data...",
    "useFlash": true
  }'
```

## Troubleshooting

### Backend won't start

**Error**: `GEMINI_API_KEY environment variable is required`
- **Fix**: Add `GEMINI_API_KEY` to `server/.env`

**Error**: `Port 3001 already in use`
- **Fix**: Change `PORT` in `server/.env` or stop the other process

### Frontend can't connect to backend

**Error**: `Backend request failed: fetch failed`
- **Fix**: Ensure backend is running (`npm run dev:server`)
- **Fix**: Check `VITE_BACKEND_URL` in `.env` matches backend port

### CORS errors

**Error**: `Blocked by CORS policy`
- **Fix**: Add your frontend URL to `ALLOWED_ORIGINS` in `server/.env`
  ```env
  ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
  ```

### Rate limit errors

**Error**: `429 Too Many Requests`
- **Fix**: Wait 15 minutes or increase limits in `server/.env`:
  ```env
  RATE_LIMIT_MAX_REQUESTS=200
  ```

## Production Deployment

### Backend Deployment

See [server/README.md](server/README.md) for detailed production deployment guide.

**Quick checklist**:
1. Set `NODE_ENV=production` in backend environment
2. Use production API keys
3. Update `ALLOWED_ORIGINS` to your production domain
4. Enable HTTPS
5. Use a process manager (PM2, Docker, etc.)
6. Set up monitoring

### Frontend Deployment

Update `.env.production`:
```env
VITE_BACKEND_URL=https://your-backend-domain.com
```

Build:
```bash
npm run build:all
```

Deploy:
- Frontend: `dist/` folder to Vercel/Netlify/etc.
- Backend: `server/dist/` to your Node.js host

## Migration from Direct API Calls

The old approach (direct Gemini/Claude calls) still exists in the codebase but is deprecated:

**Old** (Deprecated):
```typescript
import { extractFinancialsWithGemini } from './gemini-client';
const result = await extractFinancialsWithGemini(text, apiKey);
```

**New** (Secure):
```typescript
import { extractFinancialsWithBackend } from './backend-client';
const result = await extractFinancialsWithBackend(text, prompt);
// No API key needed in frontend!
```

### Migration Steps

If you're updating existing code:

1. Replace `gemini-client` imports with `backend-client`
2. Remove API key parameters from function calls
3. Add prompt parameters to function calls
4. Test with backend running

## Security Notes

⚠️ **NEVER commit .env files to Git**

✅ **DO**:
- Use backend proxy in production
- Rotate API keys regularly
- Monitor API usage
- Set appropriate rate limits

❌ **DON'T**:
- Expose API keys in frontend code
- Commit `.env` files
- Use development keys in production
- Disable security features (CORS, rate limiting)

## Additional Resources

- [Backend API Documentation](server/README.md)
- [Security Guidelines](SECURITY.md)
- [Main README](README.md)

## Getting Help

If you encounter issues:
1. Check this guide
2. Check [server/README.md](server/README.md) for backend-specific issues
3. Check browser console for errors
4. Check backend logs for API errors
5. Verify environment variables are set correctly
