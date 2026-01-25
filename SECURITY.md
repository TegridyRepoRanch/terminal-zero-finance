# Security Policy

## Security Status

✅ **Backend API Proxy**: API keys stored securely on server
✅ **Rate Limiting**: 100 requests per 15 minutes
✅ **Input Validation**: Zod schema validation on all endpoints
✅ **Security Headers**: Helmet.js (CSP, HSTS, X-Frame-Options)
✅ **CORS Protection**: Origin whitelisting
✅ **CSRF Protection**: Double-submit cookie pattern
✅ **Automated Scanning**: Snyk + npm audit + GitHub Security

## Quick Start (Secure Mode)

```bash
npm run setup          # Install all dependencies
npm run dev:all        # Run frontend + backend
```

See [BACKEND_SETUP.md](BACKEND_SETUP.md) for detailed setup instructions.

---

## Automated Security Scanning

### GitHub Actions Security Workflow

Our security workflow (`.github/workflows/security.yml`) runs automatically on:
- Every push to `main` or `develop` branches
- Every pull request to `main` or `develop`
- Weekly schedule (Mondays at 9am UTC)
- Manual trigger via GitHub Actions UI

The workflow includes:
- **Snyk Security Scan**: Checks dependencies for known vulnerabilities
- **Snyk Code (SAST)**: Static application security testing
- **NPM Audit**: Native npm vulnerability scanning
- **Dependency Review**: Reviews new dependencies in pull requests

### Snyk Integration

We use [Snyk](https://snyk.io) for comprehensive vulnerability scanning.

**Setup Requirements:**
1. Create a free Snyk account at https://snyk.io
2. Generate a Snyk API token from your account settings
3. Add the token to GitHub Secrets as `SNYK_TOKEN`

**Configuration:**
- Policy file: `.snyk`
- Fail threshold: High severity
- Scans both frontend and backend dependencies
- Results uploaded to GitHub Security tab

### Manual Security Checks

Run security scans locally:

```bash
# Check both frontend and backend for vulnerabilities
npm run security:check

# Audit frontend only
npm run security:audit

# Audit backend only
cd server && npm run security:audit

# Automatically fix vulnerabilities (use with caution)
npm run security:fix

# Fix frontend only
npm run security:audit:fix

# Fix backend only
cd server && npm run security:audit:fix
```

---

## Vulnerability Management

### Severity Levels

- **Critical**: Immediate action required - patch within 24 hours
- **High**: Urgent - patch within 7 days
- **Moderate**: Important - patch within 30 days
- **Low**: Monitor - address in next release cycle

### Handling Vulnerabilities

1. **Assess Impact**: Determine if the vulnerability affects our application
2. **Update Dependencies**: Prefer updating to patched versions
3. **Document Exceptions**: If a vulnerability cannot be fixed immediately:
   - Add to `.snyk` ignore list with justification
   - Set an expiration date for the exception
   - Create a GitHub issue to track resolution

Example Snyk exception:
```yaml
ignore:
  'SNYK-JS-PACKAGE-123456':
    - '*':
        reason: 'Not exploitable - we sanitize all inputs before use'
        expires: '2026-03-01T00:00:00.000Z'
```

---

## Security Best Practices

### Dependencies

- ✅ Regularly update dependencies (at least monthly)
- ✅ Review dependency changes in pull requests
- ✅ Avoid dependencies with known security issues
- ✅ Minimize total number of dependencies
- ✅ Use exact versions in production (`package-lock.json`)

### Code Security

- ✅ All user inputs are validated with Zod schemas
- ✅ CSRF protection on all state-changing endpoints
- ✅ Rate limiting on all API endpoints (100 req/15min)
- ✅ Security headers (CSP, HSTS, X-Frame-Options)
- ✅ API keys stored server-side only
- ✅ No sensitive data in frontend code or environment variables

### API Security

- ✅ Backend proxy for all external API calls
- ✅ Input validation on all endpoints (Zod schemas)
- ✅ Rate limiting: 100 requests per 15 minutes
- ✅ CORS restricted to allowed origins
- ✅ Request size limits (500KB max)
- ✅ Timeout enforcement (2 minutes for Gemini API)
- ✅ CSRF protection (double-submit cookie)

---

## Deployment Modes

### 1. Secure Mode (RECOMMENDED)

Backend API proxy with server-side API keys:

**Features:**
- ✅ API keys stored securely on server
- ✅ Rate limiting and input validation
- ✅ CORS and CSRF protection
- ✅ Security headers

**Setup:**
See [BACKEND_SETUP.md](BACKEND_SETUP.md)

### 2. Legacy Mode (DEPRECATED)

Direct API calls from frontend:

**⚠️ WARNING:**
- API keys exposed in browser
- **Only for development/testing**
- **DO NOT use in production**
- No rate limiting or validation

---

## Security Checklist

### Before Production Deployment

- [x] Backend API proxy implemented
- [x] API keys moved to server-side environment
- [x] Rate limiting added (100 req/15min)
- [x] Input validation on all endpoints (Zod)
- [x] Security headers configured (Helmet.js)
- [x] CORS configured with origin whitelist
- [x] CSRF protection implemented
- [ ] User authentication implemented
- [ ] HTTPS enabled (SSL certificate)
- [ ] Secrets management (AWS Secrets Manager, etc.)
- [ ] Monitoring and alerting set up
- [ ] Security audit performed
- [ ] API keys rotated from development
- [ ] Dependency vulnerability scan passed

### For Contributors

Before submitting a pull request:

- [ ] Run `npm run security:check` and address any issues
- [ ] No sensitive data (API keys, credentials) in code or commits
- [ ] All user inputs validated and sanitized
- [ ] No new dependencies with known vulnerabilities
- [ ] Security headers maintained
- [ ] CSRF protection maintained for state-changing routes

---

## Reporting Security Issues

**DO NOT** open public GitHub issues for security vulnerabilities.

Instead:
1. Email security concerns to the project maintainers
2. Include detailed steps to reproduce
3. Allow time for a fix before public disclosure

We will:
- Acknowledge your report within 48 hours
- Provide regular updates on fix progress
- Credit you in the security advisory (unless you prefer anonymity)

---

## Security Tooling

| Tool | Purpose | Frequency |
|------|---------|-----------|
| Snyk | Dependency & SAST scanning | On push, PR, weekly |
| npm audit | Dependency vulnerability check | On push, PR |
| Dependency Review | PR dependency analysis | On PR |
| GitHub Security | Centralized security alerts | Continuous |
| Helmet.js | Security headers | Every request |
| express-rate-limit | Rate limiting | Every request |
| Zod | Input validation | Every API call |
| csrf-csrf | CSRF protection | State-changing requests |

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Snyk Documentation](https://docs.snyk.io/)
- [npm audit Documentation](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [GitHub Security Features](https://docs.github.com/en/code-security)
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [API Security Checklist](https://github.com/shieldfy/API-Security-Checklist)

---

**Last Updated**: 2026-01-26
