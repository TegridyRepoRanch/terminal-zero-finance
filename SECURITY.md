# Security Guidelines

## Critical Security Warning

**IMPORTANT:** This application currently exposes API keys in the frontend code. This is a **critical security vulnerability** and must be addressed before any public deployment.

### Current Security Issues

#### 1. API Key Exposure (CRITICAL)

**Problem:**
- Gemini API key is stored in frontend environment variables (`VITE_GEMINI_API_KEY`)
- The key is accessible in browser DevTools and network requests
- Anyone can extract and abuse your API key, leading to:
  - Unauthorized usage and costs
  - API quota exhaustion
  - Potential account suspension

**Impact:** HIGH - Your API key can be stolen and used by anyone

**Immediate Action Required:**
- ✅ For development/testing: Keep current setup but **NEVER deploy publicly**
- ❌ For production: **DO NOT** deploy with client-side API keys

**Proper Solution:**
Create a backend API proxy that:
1. Stores API keys securely on the server
2. Validates incoming requests
3. Adds rate limiting
4. Proxies requests to Gemini API
5. Never exposes keys to the frontend

Example architecture:
```
Frontend → Your Backend API → Gemini API
         (no key)         (key stored securely)
```

#### 2. No Authentication

**Problem:**
- No user authentication or authorization
- Anyone with the URL can use the application
- No usage tracking or limits per user

**Impact:** MEDIUM - Anyone can use your API quota

**Solution:**
- Implement user authentication (OAuth, JWT, etc.)
- Add per-user rate limiting
- Track usage by user

#### 3. CORS Configuration

**Problem:**
- Direct browser → Gemini API calls require CORS
- No protection against unauthorized origins

**Impact:** LOW-MEDIUM - CORS helps but doesn't prevent key theft

**Solution:**
- Backend proxy eliminates CORS issues
- Server-side origin validation

### Recommended Security Architecture

#### Development Environment
Current setup is acceptable for local development only:
- Use `.env.local` for API keys (never commit)
- Keep `.env` files in `.gitignore`
- Rotate keys regularly

#### Production Environment
**Required changes before deployment:**

1. **Backend API Proxy** (Required)
   ```
   Frontend (React) → Backend (Node/Python/etc.) → Gemini API
   ```

2. **Environment Variables** (Server-side)
   - Store API keys in server environment
   - Use secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)
   - Never log API keys

3. **Authentication** (Required)
   - Implement user authentication
   - Use secure session management
   - Add JWT or session tokens

4. **Rate Limiting** (Recommended)
   - Limit requests per user
   - Prevent abuse
   - Protect your API quota

5. **Input Validation** (Required)
   - Validate all user inputs
   - Sanitize file uploads
   - Check file sizes and types

6. **Monitoring** (Recommended)
   - Log API usage
   - Alert on anomalies
   - Track costs

### Example Backend Proxy (Node.js/Express)

```typescript
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Middleware
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Protected endpoint
app.post('/api/extract', authenticateUser, async (req, res) => {
  try {
    const { text, useFlash } = req.body;

    // Validate input
    if (!text || text.length > 200000) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    // Call Gemini API (key never exposed)
    const model = genAI.getGenerativeModel({
      model: useFlash ? 'gemini-2.5-flash' : 'gemini-2.5-pro'
    });

    const result = await model.generateContent(text);

    res.json({ data: result.response.text() });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

app.listen(3000);
```

### Frontend Changes for Backend Proxy

Replace direct Gemini API calls with backend requests:

```typescript
// Before (INSECURE - current implementation)
const genAI = new GoogleGenerativeAI(apiKey); // API key exposed!
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
const result = await model.generateContent(text);

// After (SECURE - backend proxy)
const response = await fetch('/api/extract', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}` // JWT token, not API key
  },
  body: JSON.stringify({ text, useFlash: true })
});
const result = await response.json();
```

### Security Checklist Before Production

- [ ] Backend API proxy implemented
- [ ] API keys moved to server-side environment
- [ ] User authentication implemented
- [ ] Rate limiting added
- [ ] Input validation on all endpoints
- [ ] HTTPS enabled (SSL certificate)
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Error messages don't leak sensitive info
- [ ] API keys rotated from development
- [ ] Security audit performed
- [ ] Monitoring and alerting set up

### Reporting Security Issues

If you discover a security vulnerability, please email security@yourdomain.com

**Do not:**
- Open a public GitHub issue
- Share details publicly before fix is deployed

### Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [API Security Checklist](https://github.com/shieldfy/API-Security-Checklist)

---

**Remember:** The current implementation is for development/demo purposes only. Never deploy to production without addressing the API key exposure issue.
