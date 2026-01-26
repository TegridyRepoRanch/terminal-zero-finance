// Sentry Error Tracking Configuration
import * as Sentry from '@sentry/react';

/**
 * Initializes Sentry error tracking for the application.
 *
 * Only initializes in production or if VITE_SENTRY_DSN is explicitly set.
 * Configures error sampling, performance monitoring, and session replay.
 *
 * Environment Variables:
 * - VITE_SENTRY_DSN: Sentry Data Source Name (required)
 * - VITE_SENTRY_ENVIRONMENT: Environment name (default: process.env.NODE_ENV)
 * - VITE_APP_VERSION: App version for release tracking
 *
 * @example
 * // In main.tsx
 * initSentry();
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE;
  const release = import.meta.env.VITE_APP_VERSION;

  // Only initialize in production or if DSN is explicitly provided
  if (!dsn || environment === 'development') {
    console.log('[Sentry] Skipping initialization in development');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release,

    // Performance Monitoring
    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration({
        // Trace navigation and page loads
        tracePropagationTargets: [
          'localhost',
          /^https:\/\/.*\.terminalzero\.finance/,
        ],
      }),

      // Session replay for debugging
      Sentry.replayIntegration({
        maskAllText: true, // Mask sensitive text content
        blockAllMedia: true, // Block sensitive media
      }),

      // Browser profiling
      Sentry.browserProfilingIntegration(),
    ],

    // Sample rate for error tracking (100% = capture all errors)
    sampleRate: 1.0,

    // Performance monitoring sample rate
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Session replay sample rate
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',

      // Network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',

      // Aborted requests
      'AbortError',
      'The operation was aborted',

      // ResizeObserver errors (harmless)
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            // Remove API keys, tokens, etc.
            delete breadcrumb.data.apiKey;
            delete breadcrumb.data.token;
            delete breadcrumb.data.authorization;
          }
          return breadcrumb;
        });
      }

      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['X-CSRF-Token'];
      }

      return event;
    },
  });

  console.log(`[Sentry] Initialized in ${environment} environment`);
}

/**
 * Manually capture an exception with Sentry.
 *
 * @param error - The error to capture
 * @param context - Additional context for the error
 *
 * @example
 * captureException(error, {
 *   tags: { feature: 'extraction' },
 *   extra: { fileName: 'report.pdf' }
 * });
 */
export function captureException(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: Sentry.SeverityLevel;
  }
) {
  Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
    level: context?.level,
  });
}

/**
 * Manually capture a message with Sentry.
 *
 * @param message - The message to capture
 * @param level - Severity level
 *
 * @example
 * captureMessage('File upload completed', 'info');
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking.
 *
 * @param user - User information
 *
 * @example
 * setUser({ id: '123', email: 'user@example.com' });
 */
export function setUser(user: { id?: string; email?: string; username?: string } | null) {
  Sentry.setUser(user);
}

/**
 * Add a breadcrumb for debugging context.
 *
 * @param message - Breadcrumb message
 * @param data - Additional data
 *
 * @example
 * addBreadcrumb('File uploaded', { size: 1024000, type: 'application/pdf' });
 */
export function addBreadcrumb(message: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
  });
}

/**
 * Wraps a component with Sentry error boundary.
 *
 * @example
 * export default withErrorBoundary(App);
 */
export const ErrorBoundary = Sentry.ErrorBoundary;
export const withErrorBoundary = Sentry.withErrorBoundary;
