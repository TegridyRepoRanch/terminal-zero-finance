// Enterprise Notification Service
// Multi-channel alert delivery for institutional clients
// Supports: Email, Webhooks, In-App, Slack, and more

import type { FilingAlert } from './sec-alerts';
import type { DetectedTheme } from './theme-detector';
import type { EarningsAnalysis } from './earnings-analyzer';

// ============================================================================
// TYPES
// ============================================================================

export type NotificationChannel = 'email' | 'webhook' | 'slack' | 'in_app' | 'sms';
export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';
export type NotificationType =
  | 'sec_filing'
  | 'earnings_alert'
  | 'price_alert'
  | 'theme_detected'
  | 'insider_activity'
  | 'analyst_rating'
  | 'custom';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  ticker?: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
  createdAt: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  error?: string;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    email?: {
      enabled: boolean;
      address: string;
      digestMode?: 'instant' | 'hourly' | 'daily';
    };
    webhook?: {
      enabled: boolean;
      url: string;
      secret?: string;
      headers?: Record<string, string>;
    };
    slack?: {
      enabled: boolean;
      webhookUrl: string;
      channel?: string;
    };
    sms?: {
      enabled: boolean;
      phoneNumber: string;
    };
    inApp: {
      enabled: boolean;
    };
  };
  filters: {
    minPriority: NotificationPriority;
    types: NotificationType[];
    tickers?: string[];
  };
}

export interface WebhookPayload {
  event: NotificationType;
  timestamp: string;
  priority: NotificationPriority;
  data: {
    title: string;
    message: string;
    ticker?: string;
    details?: Record<string, unknown>;
  };
  signature?: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// ============================================================================
// DEFAULT PREFERENCES
// ============================================================================

const DEFAULT_PREFERENCES: NotificationPreferences = {
  userId: 'default',
  channels: {
    inApp: { enabled: true },
  },
  filters: {
    minPriority: 'low',
    types: ['sec_filing', 'earnings_alert', 'price_alert', 'theme_detected', 'insider_activity'],
  },
};

// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

export class NotificationService {
  private preferences: NotificationPreferences;
  private notifications: Notification[] = [];
  private listeners: Array<(notification: Notification) => void> = [];
  private webhookQueue: Notification[] = [];
  private emailQueue: Notification[] = [];
  private processingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(preferences?: Partial<NotificationPreferences>) {
    this.preferences = { ...DEFAULT_PREFERENCES, ...preferences };
  }

  // --------------------------------------------------------------------------
  // CONFIGURATION
  // --------------------------------------------------------------------------

  /**
   * Update notification preferences
   */
  setPreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
  }

  /**
   * Get current preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Enable a notification channel
   */
  enableChannel(channel: NotificationChannel, config: Record<string, unknown>): void {
    this.preferences.channels[channel] = {
      enabled: true,
      ...config,
    } as any;
  }

  /**
   * Disable a notification channel
   */
  disableChannel(channel: NotificationChannel): void {
    if (this.preferences.channels[channel]) {
      (this.preferences.channels[channel] as any).enabled = false;
    }
  }

  // --------------------------------------------------------------------------
  // NOTIFICATION SENDING
  // --------------------------------------------------------------------------

  /**
   * Send a notification through all enabled channels
   */
  async notify(
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      priority?: NotificationPriority;
      ticker?: string;
      data?: Record<string, unknown>;
      channels?: NotificationChannel[];
    }
  ): Promise<Notification> {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority: options?.priority || 'medium',
      title,
      message,
      ticker: options?.ticker,
      data: options?.data,
      channels: options?.channels || this.getEnabledChannels(),
      createdAt: new Date(),
      status: 'pending',
    };

    // Check if notification should be filtered out
    if (!this.shouldSendNotification(notification)) {
      notification.status = 'failed';
      notification.error = 'Filtered by preferences';
      return notification;
    }

    // Store notification
    this.notifications.unshift(notification);
    if (this.notifications.length > 1000) {
      this.notifications = this.notifications.slice(0, 1000);
    }

    // Send through each channel
    await this.dispatchNotification(notification);

    // Notify local listeners
    for (const listener of this.listeners) {
      try {
        listener(notification);
      } catch (e) {
        console.error('[Notifications] Listener error:', e);
      }
    }

    return notification;
  }

  /**
   * Check if notification passes filters
   */
  private shouldSendNotification(notification: Notification): boolean {
    const { filters } = this.preferences;

    // Priority filter
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    const notifPriority = priorityOrder.indexOf(notification.priority);
    const minPriority = priorityOrder.indexOf(filters.minPriority);
    if (notifPriority > minPriority) return false;

    // Type filter
    if (!filters.types.includes(notification.type)) return false;

    // Ticker filter
    if (filters.tickers && notification.ticker) {
      if (!filters.tickers.includes(notification.ticker.toUpperCase())) return false;
    }

    return true;
  }

  /**
   * Dispatch notification to enabled channels
   */
  private async dispatchNotification(notification: Notification): Promise<void> {
    const results: Promise<void>[] = [];

    for (const channel of notification.channels) {
      switch (channel) {
        case 'webhook':
          if (this.preferences.channels.webhook?.enabled) {
            results.push(this.sendWebhook(notification));
          }
          break;
        case 'email':
          if (this.preferences.channels.email?.enabled) {
            results.push(this.sendEmail(notification));
          }
          break;
        case 'slack':
          if (this.preferences.channels.slack?.enabled) {
            results.push(this.sendSlack(notification));
          }
          break;
        case 'in_app':
          // In-app notifications are handled by listeners
          break;
      }
    }

    try {
      await Promise.allSettled(results);
      notification.status = 'sent';
      notification.sentAt = new Date();
    } catch (e) {
      notification.status = 'failed';
      notification.error = e instanceof Error ? e.message : 'Unknown error';
    }
  }

  // --------------------------------------------------------------------------
  // WEBHOOK DELIVERY
  // --------------------------------------------------------------------------

  /**
   * Send notification via webhook
   */
  private async sendWebhook(notification: Notification): Promise<void> {
    const webhookConfig = this.preferences.channels.webhook;
    if (!webhookConfig?.enabled || !webhookConfig.url) return;

    const payload: WebhookPayload = {
      event: notification.type,
      timestamp: new Date().toISOString(),
      priority: notification.priority,
      data: {
        title: notification.title,
        message: notification.message,
        ticker: notification.ticker,
        details: notification.data,
      },
    };

    // Add signature if secret is configured
    if (webhookConfig.secret) {
      payload.signature = await this.generateSignature(payload, webhookConfig.secret);
    }

    try {
      const response = await fetch(webhookConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookConfig.headers || {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      console.log(`[Notifications] Webhook sent: ${notification.id}`);
    } catch (e) {
      console.error('[Notifications] Webhook error:', e);
      throw e;
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private async generateSignature(payload: WebhookPayload, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, data);
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // --------------------------------------------------------------------------
  // EMAIL DELIVERY
  // --------------------------------------------------------------------------

  /**
   * Send notification via email
   * Note: Requires backend email service (SendGrid, SES, etc.)
   */
  private async sendEmail(notification: Notification): Promise<void> {
    const emailConfig = this.preferences.channels.email;
    if (!emailConfig?.enabled || !emailConfig.address) return;

    const subject = this.formatEmailSubject(notification);
    const html = this.formatEmailHTML(notification);
    const text = this.formatEmailText(notification);

    const payload: EmailPayload = {
      to: emailConfig.address,
      subject,
      html,
      text,
    };

    // Send to backend email service
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      if (!backendUrl) {
        console.warn('[Notifications] No backend URL configured for email');
        return;
      }

      const response = await fetch(`${backendUrl}/api/notifications/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Email failed: ${response.status}`);
      }

      console.log(`[Notifications] Email sent: ${notification.id}`);
    } catch (e) {
      console.error('[Notifications] Email error:', e);
      // Queue for retry
      this.emailQueue.push(notification);
    }
  }

  private formatEmailSubject(notification: Notification): string {
    const priorityEmoji = {
      critical: '🚨',
      high: '⚠️',
      medium: '📋',
      low: 'ℹ️',
    }[notification.priority];

    const ticker = notification.ticker ? `[${notification.ticker}] ` : '';
    return `${priorityEmoji} ${ticker}${notification.title}`;
  }

  private formatEmailHTML(notification: Notification): string {
    const priorityColor = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#2563eb',
      low: '#6b7280',
    }[notification.priority];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${priorityColor}; color: white; padding: 16px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .ticker { background: #dbeafe; color: #1d4ed8; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">${notification.title}</h2>
            ${notification.ticker ? `<span class="ticker">${notification.ticker}</span>` : ''}
          </div>
          <div class="content">
            <p>${notification.message}</p>
            ${notification.data ? `<pre style="background: #fff; padding: 12px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(notification.data, null, 2)}</pre>` : ''}
          </div>
          <div class="footer">
            <p>Sent by Terminal Zero Finance</p>
            <p>Time: ${notification.createdAt.toISOString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private formatEmailText(notification: Notification): string {
    return `
${notification.title}
${notification.ticker ? `Ticker: ${notification.ticker}` : ''}

${notification.message}

---
Sent by Terminal Zero Finance
Time: ${notification.createdAt.toISOString()}
    `.trim();
  }

  // --------------------------------------------------------------------------
  // SLACK DELIVERY
  // --------------------------------------------------------------------------

  /**
   * Send notification to Slack
   */
  private async sendSlack(notification: Notification): Promise<void> {
    const slackConfig = this.preferences.channels.slack;
    if (!slackConfig?.enabled || !slackConfig.webhookUrl) return;

    const color = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#2563eb',
      low: '#6b7280',
    }[notification.priority];

    const payload = {
      channel: slackConfig.channel,
      attachments: [
        {
          color,
          title: notification.title,
          text: notification.message,
          fields: [
            ...(notification.ticker ? [{ title: 'Ticker', value: notification.ticker, short: true }] : []),
            { title: 'Priority', value: notification.priority.toUpperCase(), short: true },
            { title: 'Type', value: notification.type.replace('_', ' ').toUpperCase(), short: true },
          ],
          footer: 'Terminal Zero Finance',
          ts: Math.floor(notification.createdAt.getTime() / 1000),
        },
      ],
    };

    try {
      const response = await fetch(slackConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack failed: ${response.status}`);
      }

      console.log(`[Notifications] Slack sent: ${notification.id}`);
    } catch (e) {
      console.error('[Notifications] Slack error:', e);
      throw e;
    }
  }

  // --------------------------------------------------------------------------
  // CONVENIENCE METHODS
  // --------------------------------------------------------------------------

  /**
   * Send SEC filing alert
   */
  async notifySECFiling(alert: FilingAlert): Promise<Notification> {
    return this.notify('sec_filing', alert.headline || `New ${alert.filingType} Filing`, alert.summary || `${alert.ticker} filed ${alert.filingType}`, {
      priority: alert.priority,
      ticker: alert.ticker,
      data: {
        filingType: alert.filingType,
        filingDate: alert.filingDate,
        filingUrl: alert.filingUrl,
        tradingImplication: alert.tradingImplication,
      },
    });
  }

  /**
   * Send theme detection alert
   */
  async notifyTheme(theme: DetectedTheme): Promise<Notification> {
    return this.notify('theme_detected', `Theme Detected: ${theme.name}`, theme.description, {
      priority: theme.confidence > 0.8 ? 'high' : 'medium',
      data: {
        category: theme.category,
        affectedTickers: theme.affectedTickers,
        signals: theme.signals,
        tradingIdeas: theme.tradingIdeas,
      },
    });
  }

  /**
   * Send earnings analysis alert
   */
  async notifyEarnings(analysis: EarningsAnalysis): Promise<Notification> {
    const priority: NotificationPriority = analysis.redFlags.length > 2 ? 'high' :
      analysis.redFlags.length > 0 ? 'medium' : 'low';

    return this.notify('earnings_alert', `${analysis.ticker} Earnings Analysis Complete`, `Management tone: ${analysis.managementTone.overall}`, {
      priority,
      ticker: analysis.ticker,
      data: {
        managementTone: analysis.managementTone,
        redFlags: analysis.redFlags,
        guidanceChanges: analysis.guidanceChanges,
        keyTakeaways: analysis.keyTakeaways,
      },
    });
  }

  /**
   * Send price alert
   */
  async notifyPriceAlert(
    ticker: string,
    currentPrice: number,
    threshold: number,
    direction: 'above' | 'below'
  ): Promise<Notification> {
    return this.notify('price_alert', `${ticker} Price Alert`, `${ticker} is now ${direction} $${threshold.toFixed(2)} (current: $${currentPrice.toFixed(2)})`, {
      priority: 'high',
      ticker,
      data: { currentPrice, threshold, direction },
    });
  }

  // --------------------------------------------------------------------------
  // LISTENERS & HISTORY
  // --------------------------------------------------------------------------

  /**
   * Add notification listener
   */
  onNotification(callback: (notification: Notification) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Get notification history
   */
  getNotifications(options?: {
    type?: NotificationType;
    ticker?: string;
    limit?: number;
    since?: Date;
  }): Notification[] {
    let filtered = this.notifications;

    if (options?.type) {
      filtered = filtered.filter(n => n.type === options.type);
    }

    if (options?.ticker) {
      filtered = filtered.filter(n => n.ticker?.toUpperCase() === options.ticker?.toUpperCase());
    }

    if (options?.since) {
      filtered = filtered.filter(n => n.createdAt >= options.since!);
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Clear notification history
   */
  clearNotifications(): void {
    this.notifications = [];
  }

  /**
   * Get enabled channels
   */
  private getEnabledChannels(): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    if (this.preferences.channels.inApp?.enabled) channels.push('in_app');
    if (this.preferences.channels.email?.enabled) channels.push('email');
    if (this.preferences.channels.webhook?.enabled) channels.push('webhook');
    if (this.preferences.channels.slack?.enabled) channels.push('slack');
    if (this.preferences.channels.sms?.enabled) channels.push('sms');

    return channels;
  }

  /**
   * Start processing queued notifications
   */
  startProcessing(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(async () => {
      // Retry failed webhooks
      while (this.webhookQueue.length > 0) {
        const notification = this.webhookQueue.shift();
        if (notification) {
          try {
            await this.sendWebhook(notification);
          } catch {
            // Re-queue if still failing
            this.webhookQueue.push(notification);
            break;
          }
        }
      }

      // Retry failed emails
      while (this.emailQueue.length > 0) {
        const notification = this.emailQueue.shift();
        if (notification) {
          try {
            await this.sendEmail(notification);
          } catch {
            this.emailQueue.push(notification);
            break;
          }
        }
      }
    }, 30000); // Retry every 30 seconds
  }

  /**
   * Stop processing
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const notificationService = new NotificationService();

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const notify = notificationService.notify.bind(notificationService);
export const notifySECFiling = notificationService.notifySECFiling.bind(notificationService);
export const notifyTheme = notificationService.notifyTheme.bind(notificationService);
export const notifyEarnings = notificationService.notifyEarnings.bind(notificationService);

export default notificationService;
