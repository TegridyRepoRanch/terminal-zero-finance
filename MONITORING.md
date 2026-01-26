# Monitoring & Observability

This document describes the monitoring, error tracking, and analytics infrastructure for Terminal Zero Finance.

## Table of Contents

- [Overview](#overview)
- [Error Tracking (Sentry)](#error-tracking-sentry)
- [Analytics (PostHog)](#analytics-posthog)
- [Performance Monitoring (Web Vitals)](#performance-monitoring-web-vitals)
- [CI/CD Pipeline](#cicd-pipeline)
- [Dependency Scanning (Snyk)](#dependency-scanning-snyk)
- [Setup Instructions](#setup-instructions)

## Overview

Terminal Zero Finance includes comprehensive monitoring infrastructure:

| Component | Purpose | Service | Status |
|-----------|---------|---------|--------|
| Error Tracking | Capture and debug production errors | Sentry | ✅ Configured |
| Analytics | User behavior and feature usage | PostHog | ✅ Configured |
| Performance | Core Web Vitals monitoring | Web Vitals | ✅ Configured |
| CI/CD | Automated testing and deployment | GitHub Actions | ✅ Configured |
| Security | Dependency vulnerability scanning | Snyk | ✅ Configured |

## Error Tracking (Sentry)

### Features

- **Automatic error capture** - JavaScript errors, unhandled promises, React errors
- **Performance monitoring** - Transaction tracing, API call timing
- **Session replay** - Video-like reproduction of user sessions (with privacy controls)
- **Breadcrumbs** - Trail of events leading to errors
- **Release tracking** - Error rates by version
- **User context** - Identify affected users

### Configuration

Set environment variables in production:

```bash
VITE_SENTRY_DSN=https://your-key@sentry.io/project-id
VITE_SENTRY_ENVIRONMENT=production
VITE_APP_VERSION=1.0.0
```

### Usage Examples

**Automatic capture** (already configured):
```typescript
// Errors are automatically captured
throw new Error('Something went wrong');
```

**Manual capture**:
```typescript
import { captureException, captureMessage } from './lib/sentry';

try {
  await riskyOperation();
} catch (error) {
  captureException(error, {
    tags: { feature: 'extraction' },
    extra: { fileName: file.name },
    level: 'error',
  });
}
```

**Set user context**:
```typescript
import { setUser } from './lib/sentry';

setUser({
  id: 'user_123',
  email: 'user@example.com',
  username: 'johndoe',
});
```

**Add breadcrumbs**:
```typescript
import { addBreadcrumb } from './lib/sentry';

addBreadcrumb('File upload started', {
  fileName: 'report.pdf',
  fileSize: 1024000,
});
```

### Privacy Controls

Sentry is configured with privacy in mind:

- **Text masking** - Sensitive text is masked in session replays
- **Media blocking** - Screenshots and videos are blocked
- **Header filtering** - Authorization tokens removed from requests
- **Data scrubbing** - API keys and tokens filtered from breadcrumbs

### Viewing Errors

1. Go to [sentry.io](https://sentry.io)
2. Select your project
3. View issues, filter by environment, release, or user
4. Click an issue to see stack trace, breadcrumbs, and session replay

## Analytics (PostHog)

### Features

- **Event tracking** - Custom events with properties
- **User identification** - Track authenticated users
- **Feature flags** - A/B testing and gradual rollouts
- **Session recording** - User session playback (disabled by default)
- **Funnels** - Conversion tracking
- **Cohorts** - User segmentation

### Configuration

Set environment variables in production:

```bash
VITE_POSTHOG_KEY=phc_your_api_key_here
VITE_POSTHOG_HOST=https://app.posthog.com
```

### Usage Examples

**Track events**:
```typescript
import { trackEvent, AnalyticsEvents } from './lib/analytics';

// Using predefined events
trackEvent(AnalyticsEvents.FILE_UPLOADED, {
  fileType: 'pdf',
  fileSize: 1024000,
  extractionTime: 2500,
});

// Custom events
trackEvent('custom_feature_used', {
  feature: 'monte-carlo',
  iterations: 1000,
});
```

**Identify users**:
```typescript
import { identifyUser, resetUser } from './lib/analytics';

// On login
identifyUser('user_123', {
  email: 'user@example.com',
  plan: 'pro',
  signupDate: '2024-01-15',
});

// On logout
resetUser();
```

**Track page views** (automatic):
```typescript
// Page views are automatically tracked
// Manual override if needed:
trackPageView('Custom Page Name');
```

**Opt-out**:
```typescript
import { setTrackingEnabled } from './lib/analytics';

setTrackingEnabled(false); // User opts out
setTrackingEnabled(true);  // User opts in
```

### Pre-defined Events

See `AnalyticsEvents` in [src/lib/analytics.ts](src/lib/analytics.ts) for all tracked events:

- File operations: `FILE_UPLOADED`, `FILE_EXTRACTION_COMPLETED`
- Data editing: `DATA_EDITED`, `BULK_EDIT_APPLIED`
- Valuation: `VALUATION_CALCULATED`, `SENSITIVITY_ANALYZED`
- Navigation: `TAB_CHANGED`, `TICKER_SEARCHED`
- Errors: `ERROR_OCCURRED`, `API_ERROR`

### Viewing Analytics

1. Go to [app.posthog.com](https://app.posthog.com)
2. Select your project
3. View insights, dashboards, funnels, or session recordings

## Performance Monitoring (Web Vitals)

### Core Web Vitals

Terminal Zero tracks all Google Core Web Vitals:

| Metric | Description | Good | Needs Improvement | Poor |
|--------|-------------|------|-------------------|------|
| **LCP** | Largest Contentful Paint - Loading | ≤ 2.5s | 2.5s - 4.0s | > 4.0s |
| **FID** | First Input Delay - Interactivity | ≤ 100ms | 100ms - 300ms | > 300ms |
| **INP** | Interaction to Next Paint - Responsiveness | ≤ 200ms | 200ms - 500ms | > 500ms |
| **CLS** | Cumulative Layout Shift - Visual Stability | ≤ 0.1 | 0.1 - 0.25 | > 0.25 |
| **FCP** | First Contentful Paint - Loading | ≤ 1.8s | 1.8s - 3.0s | > 3.0s |
| **TTFB** | Time to First Byte - Server Response | ≤ 800ms | 800ms - 1800ms | > 1800ms |

### Usage Examples

**Custom metrics**:
```typescript
import { reportCustomMetric, measureAsync } from './lib/web-vitals';

// Report a custom metric
reportCustomMetric('pdf_parse_time', 1250, {
  fileSize: 'large',
  complexity: 'high',
});

// Measure async operations
const data = await measureAsync(
  'api_extraction',
  async () => {
    return await extractFinancials(text);
  },
  { model: 'gemini-pro' }
);
```

### Integration

Web Vitals are automatically sent to:

1. **Sentry** - Performance monitoring dashboard
2. **PostHog** - Analytics events for correlation
3. **Custom endpoint** - If `VITE_ANALYTICS_ENDPOINT` is set
4. **Google Analytics** - If gtag is available

### Viewing Performance Data

**In Sentry:**
1. Go to Performance → Web Vitals
2. View metrics by page, browser, location
3. Filter by time range and percentiles

**In PostHog:**
1. Go to Insights → Events
2. Filter for `web_vital` events
3. Create dashboards with performance trends

## CI/CD Pipeline

### GitHub Actions Workflows

Two workflows are configured:

#### 1. CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and pull request:

```yaml
Jobs:
  ✓ Lint & Type Check (frontend + backend)
  ✓ Unit Tests (with coverage)
  ✓ E2E Tests (Playwright)
  ✓ Build (frontend + backend)
  ✓ Security Audit (npm audit)
  ✓ Snyk Scan (vulnerability detection)
  ✓ Bundle Size Check
```

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Manual workflow dispatch

**Artifacts:**
- Test coverage reports (uploaded to Codecov)
- Playwright test results
- Build artifacts (frontend + backend)

#### 2. CD Pipeline (`.github/workflows/cd.yml`)

Handles deployments:

```yaml
Jobs:
  ✓ Deploy to Staging (on push to main)
  ✓ Deploy to Production (on version tags)
  ✓ Deploy Storybook (to GitHub Pages)
```

**Triggers:**
- Push to `main` → Deploy to staging
- Tags matching `v*` → Deploy to production
- Manual workflow dispatch

### Required Secrets

Configure these in GitHub Settings → Secrets:

```bash
# Codecov (test coverage)
CODECOV_TOKEN=your_codecov_token

# Snyk (security scanning)
SNYK_TOKEN=your_snyk_token

# Deployment (if using Vercel, Netlify, etc.)
VERCEL_TOKEN=your_vercel_token
# or
NETLIFY_AUTH_TOKEN=your_netlify_token
```

### Deployment Configuration

Update deployment commands in `cd.yml`:

```yaml
# Example for Vercel
- name: Deploy to production
  run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}

# Example for Netlify
- name: Deploy to production
  run: npx netlify deploy --prod --auth ${{ secrets.NETLIFY_AUTH_TOKEN }}
```

## Dependency Scanning (Snyk)

### Features

- **Vulnerability detection** - Known CVEs in dependencies
- **License compliance** - Open source license violations
- **Fix recommendations** - Automated PR creation for fixes
- **Priority scoring** - Criticality assessment

### Configuration

1. Sign up at [snyk.io](https://snyk.io)
2. Get API token from Settings
3. Add to GitHub Secrets: `SNYK_TOKEN`
4. Snyk runs automatically in CI on `main` branch

### Manual Scanning

```bash
# Install Snyk CLI
npm install -g snyk

# Authenticate
snyk auth

# Scan frontend
snyk test

# Scan backend
cd server && snyk test

# Monitor project (continuous monitoring)
snyk monitor
```

### Viewing Results

1. Go to [app.snyk.io](https://app.snyk.io)
2. View projects and vulnerabilities
3. Create automated fix PRs
4. Set up Slack/email notifications

## Setup Instructions

### 1. Local Development

No setup needed - monitoring is disabled in development by default.

### 2. Staging Environment

```bash
# Set environment variables
VITE_SENTRY_DSN=https://key@sentry.io/project
VITE_SENTRY_ENVIRONMENT=staging
VITE_POSTHOG_KEY=phc_key_here
VITE_APP_VERSION=$(git describe --tags)

# Build and deploy
npm run build
```

### 3. Production Environment

```bash
# Set environment variables
VITE_SENTRY_DSN=https://key@sentry.io/project
VITE_SENTRY_ENVIRONMENT=production
VITE_POSTHOG_KEY=phc_key_here
VITE_APP_VERSION=$(git describe --tags)

# Build with production config
npm run build

# Deploy using your preferred method
```

### 4. GitHub Actions

1. Go to repository Settings → Secrets and variables → Actions
2. Add required secrets:
   - `CODECOV_TOKEN`
   - `SNYK_TOKEN`
   - Deployment tokens (Vercel, Netlify, etc.)
3. Push to `main` or create a pull request
4. Workflows run automatically

## Best Practices

### Error Tracking

- **Set user context** on login/signup
- **Add breadcrumbs** before risky operations
- **Use tags** to categorize errors by feature
- **Set severity levels** appropriately
- **Review issues weekly** and prioritize fixes

### Analytics

- **Use predefined events** for consistency
- **Respect user privacy** - allow opt-out
- **Don't track PII** (passwords, API keys, etc.)
- **Create dashboards** for key metrics
- **Review funnels** to identify drop-off points

### Performance

- **Monitor Core Web Vitals** regularly
- **Set up alerts** for degradation
- **Test on real devices** and networks
- **Optimize critical paths** (LCP, FID)
- **Measure custom operations** (API calls, parsing)

### CI/CD

- **Keep pipelines fast** (< 10 minutes)
- **Run tests in parallel** where possible
- **Cache dependencies** (npm ci with cache)
- **Fail fast** on critical errors
- **Review failed builds** promptly

## Troubleshooting

### Sentry not capturing errors

- Check `VITE_SENTRY_DSN` is set
- Verify DSN is correct in Sentry project settings
- Ensure environment is not `development`
- Check browser console for Sentry initialization logs

### PostHog not tracking events

- Check `VITE_POSTHOG_KEY` is set
- Verify API key in PostHog project settings
- Check browser console for initialization errors
- Ensure user hasn't opted out of tracking

### Web Vitals not reporting

- Check browser supports Performance API
- Verify Sentry or PostHog is initialized
- Check console for Web Vitals logs (dev mode)
- Ensure page has contentful elements for LCP

### CI/CD pipeline failing

- Check GitHub Actions logs for error details
- Verify all required secrets are set
- Ensure Node.js version matches (20.x)
- Check test failures locally first

## Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [PostHog Documentation](https://posthog.com/docs)
- [Web Vitals Guide](https://web.dev/vitals/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Snyk Documentation](https://docs.snyk.io/)

---

For questions or issues, please open a GitHub issue or contact the maintainers.
