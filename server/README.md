# Terminal Zero Finance - Backend API

Secure backend proxy for AI API calls (Gemini & Claude). This backend keeps API keys secure on the server side instead of exposing them in the frontend.

## Features

- ✅ **Secure API Key Storage** - API keys never exposed to frontend
- ✅ **Rate Limiting** - Protect against abuse (100 requests per 15 minutes)
- ✅ **Input Validation** - Zod schema validation for all requests
- ✅ **CORS Protection** - Whitelist allowed origins
- ✅ **Error Handling** - Comprehensive error handling with appropriate status codes
- ✅ **Timeout Protection** - 2-minute timeout on AI API calls
- ✅ **Security Headers** - Helmet.js for security best practices
- ✅ **Logging** - Request logging in development mode

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **AI APIs**:
  - Google Gemini 3.0 (Flash & Pro)
  - Anthropic Claude Opus 4.5
- **Validation**: Zod
- **Security**: Helmet, CORS, express-rate-limit

## Prerequisites

- Node.js 18+ or 20+
- npm or yarn
- Gemini API key (required)
- Anthropic API key (optional, for Claude features)

## Installation

```bash
cd server
npm install
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your API keys:
```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional (for Claude features)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Server config (defaults shown)
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Running the Server

### Development (with auto-reload)
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## API Endpoints

### Health Check
- `GET /health` - Server health check

### Gemini Extraction Endpoints
- `POST /api/extraction/financials` - Extract financial data
- `POST /api/extraction/segments` - Extract business segments
- `POST /api/extraction/mda` - Analyze MD&A section
- `POST /api/extraction/tables` - Extract complex tables
- `POST /api/extraction/validate` - Validate extraction
- `GET /api/extraction/health` - Extraction service health

### Claude Endpoints (requires ANTHROPIC_API_KEY)
- `POST /api/claude/financials` - Extract with Claude Opus
- `POST /api/claude/final-review` - Cross-model validation
- `GET /api/claude/health` - Claude service health

## Request Examples

### Extract Financials
```bash
curl -X POST http://localhost:3001/api/extraction/financials \
  -H "Content-Type: application/json" \
  -d '{
    "text": "SEC filing text...",
    "prompt": "Extract financial data...",
    "useFlash": true
  }'
```

### Health Check
```bash
curl http://localhost:3001/health
```

## Rate Limiting

Default limits:
- **Window**: 15 minutes
- **Max requests**: 100 per IP

Returns `429 Too Many Requests` when exceeded.

## CORS Configuration

By default, allows requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000`

Add more origins in `.env`:
```env
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
```

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message",
  "status": "error"
}
```

Common status codes:
- `400` - Bad Request (validation error)
- `408` - Request Timeout
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error
- `503` - Service Unavailable (API key missing)

## Security Features

1. **API Key Protection** - Never exposed to frontend
2. **Rate Limiting** - Prevents abuse
3. **Input Validation** - Zod schemas on all inputs
4. **CORS** - Origin whitelisting
5. **Security Headers** - Helmet.js
6. **Timeout Protection** - Prevents hanging requests
7. **Error Sanitization** - Production mode hides stack traces

## Production Deployment

### Environment Variables (Production)
```env
NODE_ENV=production
PORT=3001
GEMINI_API_KEY=your_production_key
ANTHROPIC_API_KEY=your_production_key
ALLOWED_ORIGINS=https://yourdomain.com
```

### Deployment Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use production API keys
- [ ] Update `ALLOWED_ORIGINS` to your domain
- [ ] Enable HTTPS
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Configure reverse proxy (nginx)
- [ ] Set up process manager (PM2, systemd)

### PM2 Example
```bash
npm install -g pm2
npm run build
pm2 start dist/server.js --name terminal-zero-api
pm2 save
pm2 startup
```

## Project Structure

```
server/
├── src/
│   ├── config.ts                  # Configuration
│   ├── server.ts                  # Express app & server
│   ├── middleware/
│   │   ├── errorHandler.ts        # Error handling
│   │   └── validation.ts          # Zod validation
│   ├── services/
│   │   ├── gemini.service.ts      # Gemini API wrapper
│   │   └── anthropic.service.ts   # Claude API wrapper
│   └── routes/
│       ├── extraction.routes.ts   # Gemini endpoints
│       └── claude.routes.ts       # Claude endpoints
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Troubleshooting

### API key error
```
Error: GEMINI_API_KEY environment variable is required
```
**Solution**: Add `GEMINI_API_KEY` to your `.env` file

### CORS error
```
Blocked by CORS
```
**Solution**: Add your frontend origin to `ALLOWED_ORIGINS` in `.env`

### Rate limit exceeded
```
429 Too Many Requests
```
**Solution**: Wait 15 minutes or increase limits in `.env`

### Timeout errors
```
Operation timed out after 120s
```
**Solution**: This is normal for large PDFs. Consider increasing timeout in `config.ts`

## License

Same as main project
