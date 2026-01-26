// Web Vitals Performance Monitoring
import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } from 'web-vitals';
import type { Metric } from 'web-vitals';
import * as Sentry from '@sentry/react';

/**
 * Web Vitals thresholds (from Google recommendations)
 */
export const VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
} as const;

/**
 * Sends a Web Vital metric to analytics and monitoring services.
 */
function sendToAnalytics(metric: Metric) {
  const { name, value, rating, id, navigationType } = metric;

  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${name}:`, { value: Math.round(value), rating, id, navigationType });
  }

  if (import.meta.env.PROD) {
    Sentry.metrics.gauge(name, value, {
      tags: { rating, navigationType: navigationType || 'unknown' },
    });
  }

  if (typeof posthog !== 'undefined') {
    posthog.capture('web_vital', {
      metric: name,
      value: Math.round(value),
      rating,
      id,
      navigationType,
    });
  }
}

/**
 * Initializes Web Vitals monitoring.
 */
export function initWebVitals() {
  if (typeof window === 'undefined') return;

  try {
    onLCP(sendToAnalytics);
    onFID(sendToAnalytics);
    onINP(sendToAnalytics);
    onCLS(sendToAnalytics);
    onFCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
    console.log('[Web Vitals] Monitoring initialized');
  } catch (error) {
    console.error('[Web Vitals] Failed to initialize:', error);
  }
}

/**
 * Reports custom performance metrics.
 */
export function reportCustomMetric(name: string, value: number, tags?: Record<string, string>) {
  if (import.meta.env.DEV) {
    console.log(`[Custom Metric] ${name}:`, value, tags);
  }

  if (import.meta.env.PROD) {
    Sentry.metrics.gauge(name, value, { tags });
  }

  if (typeof posthog !== 'undefined') {
    posthog.capture('custom_metric', { metric: name, value, ...tags });
  }
}

/**
 * Measures the duration of an async operation.
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    reportCustomMetric(name, duration, { ...tags, status: 'success' });
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    reportCustomMetric(name, duration, { ...tags, status: 'error' });
    throw error;
  }
}

declare global {
  const posthog: {
    capture: (event: string, properties?: Record<string, unknown>) => void;
  };
}
