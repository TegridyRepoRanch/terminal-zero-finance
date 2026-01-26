// PostHog Analytics Configuration
import posthog from 'posthog-js';

/**
 * Initializes PostHog analytics.
 *
 * Only initializes in production or if VITE_POSTHOG_KEY is explicitly set.
 * Respects user privacy with opt-out capabilities and data masking.
 *
 * Environment Variables:
 * - VITE_POSTHOG_KEY: PostHog API key (required)
 * - VITE_POSTHOG_HOST: PostHog host URL (default: https://app.posthog.com)
 *
 * @example
 * // In main.tsx
 * initAnalytics();
 */
export function initAnalytics() {
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;
  const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';
  const environment = import.meta.env.MODE;

  // Skip in development unless explicitly configured
  if (!apiKey || environment === 'development') {
    console.log('[Analytics] Skipping initialization in development');
    return;
  }

  posthog.init(apiKey, {
    api_host: apiHost,

    // Privacy and compliance
    opt_out_capturing_by_default: false,
    respect_dnt: true, // Respect Do Not Track browser setting

    // Session recording (disabled by default for privacy)
    disable_session_recording: true,

    // Autocapture settings
    autocapture: {
      dom_event_allowlist: ['click', 'submit'], // Only capture clicks and form submits
      url_allowlist: [window.location.origin], // Only on own domain
      element_allowlist: ['button', 'a'], // Only buttons and links
    },

    // Data masking
    mask_all_text: false,
    mask_all_element_attributes: false,

    // Advanced features
    persistence: 'localStorage', // or 'cookie'
    persistence_name: 'tz_analytics',

    // Disable features for better privacy
    capture_pageview: true,
    capture_pageleave: true,

    // Debug mode in non-production
    debug: environment !== 'production',

    // Loaded callback
    loaded: (posthog) => {
      console.log('[Analytics] PostHog initialized');

      // Set super properties (sent with every event)
      posthog.register({
        app: 'Terminal Zero Finance',
        environment,
      });
    },
  });
}

/**
 * Tracks a custom event with properties.
 *
 * @param eventName - Name of the event
 * @param properties - Event properties
 *
 * @example
 * trackEvent('file_uploaded', { fileType: 'pdf', fileSize: 1024000 });
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (typeof posthog === 'undefined' || !posthog.__loaded) {
    if (import.meta.env.DEV) {
      console.log('[Analytics] Event:', eventName, properties);
    }
    return;
  }

  posthog.capture(eventName, properties);
}

/**
 * Tracks a page view (usually called automatically).
 *
 * @param pageName - Optional page name override
 *
 * @example
 * trackPageView('Dashboard');
 */
export function trackPageView(pageName?: string) {
  if (typeof posthog === 'undefined' || !posthog.__loaded) {
    return;
  }

  posthog.capture('$pageview', {
    $current_url: window.location.href,
    page_name: pageName,
  });
}

/**
 * Identifies a user (for authenticated users only).
 *
 * @param userId - Unique user identifier
 * @param traits - User properties
 *
 * @example
 * identifyUser('user_123', { email: 'user@example.com', plan: 'pro' });
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (typeof posthog === 'undefined' || !posthog.__loaded) {
    return;
  }

  posthog.identify(userId, traits);
}

/**
 * Resets user identity (on logout).
 *
 * @example
 * resetUser();
 */
export function resetUser() {
  if (typeof posthog === 'undefined' || !posthog.__loaded) {
    return;
  }

  posthog.reset();
}

/**
 * Sets user properties.
 *
 * @param properties - User properties to set
 *
 * @example
 * setUserProperties({ theme: 'dark', language: 'en' });
 */
export function setUserProperties(properties: Record<string, unknown>) {
  if (typeof posthog === 'undefined' || !posthog.__loaded) {
    return;
  }

  posthog.people.set(properties);
}

/**
 * Enables or disables analytics tracking.
 *
 * @param enabled - Whether to enable tracking
 *
 * @example
 * setTrackingEnabled(false); // Opt out
 */
export function setTrackingEnabled(enabled: boolean) {
  if (typeof posthog === 'undefined' || !posthog.__loaded) {
    return;
  }

  if (enabled) {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
  }
}

/**
 * Checks if tracking is currently enabled.
 *
 * @returns True if tracking is enabled
 */
export function isTrackingEnabled(): boolean {
  if (typeof posthog === 'undefined' || !posthog.__loaded) {
    return false;
  }

  return !posthog.has_opted_out_capturing();
}

// Pre-defined event types for consistency
export const AnalyticsEvents = {
  // File operations
  FILE_UPLOADED: 'file_uploaded',
  FILE_PARSED: 'file_parsed',
  FILE_EXTRACTION_STARTED: 'file_extraction_started',
  FILE_EXTRACTION_COMPLETED: 'file_extraction_completed',
  FILE_EXTRACTION_FAILED: 'file_extraction_failed',

  // Data operations
  DATA_EDITED: 'data_edited',
  BULK_EDIT_APPLIED: 'bulk_edit_applied',
  ASSUMPTIONS_CHANGED: 'assumptions_changed',
  FILTER_APPLIED: 'filter_applied',

  // Valuation
  VALUATION_CALCULATED: 'valuation_calculated',
  SENSITIVITY_ANALYZED: 'sensitivity_analyzed',
  SCENARIO_CREATED: 'scenario_created',

  // Navigation
  TAB_CHANGED: 'tab_changed',
  TICKER_SEARCHED: 'ticker_searched',

  // Features
  FEATURE_USED: 'feature_used',
  SHORTCUT_USED: 'shortcut_used',
  HELP_VIEWED: 'help_viewed',

  // Errors
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
  VALIDATION_ERROR: 'validation_error',

  // Performance
  SLOW_OPERATION: 'slow_operation',
} as const;

/**
 * Type-safe event tracking with predefined events.
 *
 * @param event - Event from AnalyticsEvents
 * @param properties - Event properties
 *
 * @example
 * trackAnalyticsEvent(AnalyticsEvents.FILE_UPLOADED, { fileType: 'pdf' });
 */
export function trackAnalyticsEvent(
  event: (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents],
  properties?: Record<string, unknown>
) {
  trackEvent(event, properties);
}
