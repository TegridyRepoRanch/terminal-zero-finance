// Real-Time SEC Filing Alert System
// Monitors SEC EDGAR for new filings and triggers instant analysis
// Supports 10-K, 10-Q, 8-K, Form 4, 13-F, 13-D/G, and more

import { getSECFilings, type FMPSECFiling } from './fmp-api';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type FilingType =
  | '10-K'      // Annual report
  | '10-Q'      // Quarterly report
  | '8-K'       // Material event
  | '4'         // Insider trading
  | '13F-HR'    // Institutional holdings
  | '13D'       // Activist position >5%
  | '13G'       // Passive position >5%
  | 'S-1'       // IPO registration
  | '424B'      // Prospectus
  | 'DEF 14A'   // Proxy statement
  | 'SC 13D'    // Schedule 13D
  | 'SC 13G';   // Schedule 13G

export interface FilingAlert {
  id: string;
  ticker: string;
  companyName?: string;
  filingType: string;
  filingDate: string;
  acceptedDate: string;
  filingUrl: string;
  secUrl: string;

  // Alert metadata
  detectedAt: Date;
  isNew: boolean;
  priority: 'high' | 'medium' | 'low';
  category: 'financial' | 'insider' | 'institutional' | 'material_event' | 'offering' | 'governance';

  // Quick analysis
  headline?: string;
  summary?: string;
  keyChanges?: string[];
  tradingImplication?: string;
}

export interface AlertSubscription {
  id: string;
  ticker: string;
  filingTypes: FilingType[];
  enabled: boolean;
  notifyEmail?: string;
  webhookUrl?: string;
  createdAt: Date;
}

export interface AlertConfig {
  pollIntervalMs: number;           // How often to check for new filings
  filingTypes: FilingType[];        // Which filing types to monitor
  lookbackMinutes: number;          // How far back to check
  priorityTickers: string[];        // Tickers to always alert on
}

const DEFAULT_CONFIG: AlertConfig = {
  pollIntervalMs: 60_000,           // 1 minute
  filingTypes: ['10-K', '10-Q', '8-K', '4', '13F-HR', '13D'],
  lookbackMinutes: 60,
  priorityTickers: [],
};

// ============================================================================
// 8-K ANALYSIS PATTERNS
// ============================================================================

const MATERIAL_EVENT_TYPES: Record<string, {
  description: string;
  priority: 'high' | 'medium' | 'low';
  tradingRelevance: string;
}> = {
  '1.01': {
    description: 'Entry into Material Definitive Agreement',
    priority: 'high',
    tradingRelevance: 'Major contracts, M&A, partnerships',
  },
  '1.02': {
    description: 'Termination of Material Definitive Agreement',
    priority: 'high',
    tradingRelevance: 'Lost contracts, deal breakups',
  },
  '1.03': {
    description: 'Bankruptcy or Receivership',
    priority: 'high',
    tradingRelevance: 'Significant credit event',
  },
  '2.01': {
    description: 'Completion of Acquisition or Disposition',
    priority: 'high',
    tradingRelevance: 'Closed M&A deal',
  },
  '2.02': {
    description: 'Results of Operations and Financial Condition',
    priority: 'high',
    tradingRelevance: 'Earnings pre-announcement',
  },
  '2.03': {
    description: 'Creation of Direct Financial Obligation',
    priority: 'medium',
    tradingRelevance: 'New debt or obligations',
  },
  '2.04': {
    description: 'Triggering Events That Accelerate or Increase Obligation',
    priority: 'high',
    tradingRelevance: 'Debt covenant concerns',
  },
  '2.05': {
    description: 'Costs Associated with Exit or Disposal Activities',
    priority: 'medium',
    tradingRelevance: 'Restructuring charges',
  },
  '2.06': {
    description: 'Material Impairments',
    priority: 'high',
    tradingRelevance: 'Writedowns, goodwill impairment',
  },
  '3.01': {
    description: 'Notice of Delisting or Transfer',
    priority: 'high',
    tradingRelevance: 'Exchange listing changes',
  },
  '4.01': {
    description: 'Changes in Registrant\'s Certifying Accountant',
    priority: 'high',
    tradingRelevance: 'Auditor change (red flag)',
  },
  '4.02': {
    description: 'Non-Reliance on Previously Issued Financial Statements',
    priority: 'high',
    tradingRelevance: 'Restatement (major red flag)',
  },
  '5.01': {
    description: 'Changes in Control of Registrant',
    priority: 'high',
    tradingRelevance: 'Ownership change',
  },
  '5.02': {
    description: 'Departure/Election of Directors or Officers',
    priority: 'medium',
    tradingRelevance: 'Management changes',
  },
  '5.03': {
    description: 'Amendments to Articles of Incorporation',
    priority: 'low',
    tradingRelevance: 'Corporate governance changes',
  },
  '7.01': {
    description: 'Regulation FD Disclosure',
    priority: 'medium',
    tradingRelevance: 'Material non-public info released',
  },
  '8.01': {
    description: 'Other Events',
    priority: 'low',
    tradingRelevance: 'Varies',
  },
};

// ============================================================================
// SEC ALERT SERVICE
// ============================================================================

export class SECAlertService {
  private config: AlertConfig;
  private subscriptions: Map<string, AlertSubscription> = new Map();
  private seenFilings: Set<string> = new Set();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<(alert: FilingAlert) => void> = [];

  constructor(config?: Partial<AlertConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a listener for new filing alerts
   */
  onAlert(callback: (alert: FilingAlert) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Subscribe to alerts for a specific ticker
   */
  subscribe(
    ticker: string,
    filingTypes: FilingType[] = this.config.filingTypes
  ): AlertSubscription {
    const subscription: AlertSubscription = {
      id: `sub-${ticker}-${Date.now()}`,
      ticker: ticker.toUpperCase(),
      filingTypes,
      enabled: true,
      createdAt: new Date(),
    };

    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  /**
   * Unsubscribe from alerts
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Get all active subscriptions
   */
  getSubscriptions(): AlertSubscription[] {
    return Array.from(this.subscriptions.values()).filter(s => s.enabled);
  }

  /**
   * Check for new filings for a specific ticker
   */
  async checkFilings(ticker: string): Promise<FilingAlert[]> {
    const alerts: FilingAlert[] = [];

    try {
      const filings = await getSECFilings(ticker, undefined, 20);

      for (const filing of filings) {
        const filingId = `${ticker}-${filing.type}-${filing.acceptedDate}`;

        // Skip if already seen
        if (this.seenFilings.has(filingId)) continue;

        // Check if filing type is monitored
        const isMonitored = this.config.filingTypes.some(t =>
          filing.type.toUpperCase().includes(t)
        );

        if (!isMonitored) continue;

        // Check if recent enough
        const filingTime = new Date(filing.acceptedDate);
        const cutoff = new Date(Date.now() - this.config.lookbackMinutes * 60 * 1000);

        if (filingTime < cutoff) continue;

        // Create alert
        const alert = this.createAlert(ticker, filing);
        alerts.push(alert);

        // Mark as seen
        this.seenFilings.add(filingId);

        // Notify listeners
        for (const listener of this.listeners) {
          try {
            listener(alert);
          } catch (e) {
            console.error('[SECAlerts] Listener error:', e);
          }
        }
      }
    } catch (e) {
      console.error(`[SECAlerts] Failed to check filings for ${ticker}:`, e);
    }

    return alerts;
  }

  /**
   * Create an alert from a filing
   */
  private createAlert(ticker: string, filing: FMPSECFiling): FilingAlert {
    const filingType = filing.type.toUpperCase();
    const category = this.categorizeFilingType(filingType);
    const priority = this.determinePriority(ticker, filingType);

    const alert: FilingAlert = {
      id: `alert-${ticker}-${Date.now()}`,
      ticker: ticker.toUpperCase(),
      filingType: filing.type,
      filingDate: filing.fillingDate,
      acceptedDate: filing.acceptedDate,
      filingUrl: filing.finalLink,
      secUrl: filing.link,
      detectedAt: new Date(),
      isNew: true,
      priority,
      category,
    };

    // Generate quick analysis based on filing type
    const analysis = this.generateQuickAnalysis(filingType, ticker);
    if (analysis) {
      alert.headline = analysis.headline;
      alert.summary = analysis.summary;
      alert.tradingImplication = analysis.tradingImplication;
    }

    return alert;
  }

  /**
   * Categorize filing type
   */
  private categorizeFilingType(type: string): FilingAlert['category'] {
    if (type.includes('10-K') || type.includes('10-Q')) return 'financial';
    if (type.includes('4') || type.includes('144')) return 'insider';
    if (type.includes('13F') || type.includes('13D') || type.includes('13G')) return 'institutional';
    if (type.includes('8-K')) return 'material_event';
    if (type.includes('S-1') || type.includes('424')) return 'offering';
    if (type.includes('DEF') || type.includes('PROXY')) return 'governance';
    return 'material_event';
  }

  /**
   * Determine alert priority
   */
  private determinePriority(ticker: string, filingType: string): FilingAlert['priority'] {
    // Priority tickers are always high
    if (this.config.priorityTickers.includes(ticker.toUpperCase())) {
      return 'high';
    }

    // Filing type based priority
    if (filingType.includes('8-K')) return 'high';
    if (filingType.includes('10-K') || filingType.includes('10-Q')) return 'high';
    if (filingType.includes('13D')) return 'high'; // Activist
    if (filingType.includes('4')) return 'medium'; // Insider
    if (filingType.includes('13F')) return 'low';
    if (filingType.includes('13G')) return 'low';

    return 'medium';
  }

  /**
   * Generate quick analysis for a filing
   */
  private generateQuickAnalysis(filingType: string, ticker: string): {
    headline: string;
    summary: string;
    tradingImplication: string;
  } | null {
    if (filingType.includes('10-K')) {
      return {
        headline: `${ticker} Annual Report (10-K) Filed`,
        summary: 'Annual report containing comprehensive financial statements, MD&A, and risk factors.',
        tradingImplication: 'Review for guidance changes, margin trends, and forward-looking statements.',
      };
    }

    if (filingType.includes('10-Q')) {
      return {
        headline: `${ticker} Quarterly Report (10-Q) Filed`,
        summary: 'Quarterly financial update with updated financials and MD&A.',
        tradingImplication: 'Check for deviation from guidance and sequential trends.',
      };
    }

    if (filingType.includes('8-K')) {
      return {
        headline: `${ticker} Material Event (8-K) Filed`,
        summary: 'Report of material event that may affect stock price.',
        tradingImplication: 'URGENT: Review immediately for trading implications.',
      };
    }

    if (filingType.includes('4')) {
      return {
        headline: `${ticker} Insider Transaction (Form 4)`,
        summary: 'Insider buying or selling activity reported.',
        tradingImplication: 'Large buys by insiders can be bullish signal; sales may be routine.',
      };
    }

    if (filingType.includes('13D')) {
      return {
        headline: `${ticker} Activist Position (13D) Filed`,
        summary: 'Investor has accumulated >5% stake with active intentions.',
        tradingImplication: 'HIGH PRIORITY: Activist involvement often drives stock volatility.',
      };
    }

    if (filingType.includes('13F')) {
      return {
        headline: `Institutional Holdings Update (13F)`,
        summary: 'Quarterly disclosure of institutional investment positions.',
        tradingImplication: 'Track smart money movements and position changes.',
      };
    }

    return null;
  }

  /**
   * Start polling for new filings
   */
  startPolling(): void {
    if (this.pollInterval) return;

    console.log('[SECAlerts] Starting polling...');

    this.pollInterval = setInterval(async () => {
      const subscriptions = this.getSubscriptions();

      for (const sub of subscriptions) {
        await this.checkFilings(sub.ticker);
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      }
    }, this.config.pollIntervalMs);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('[SECAlerts] Polling stopped');
    }
  }

  /**
   * Check all subscribed tickers immediately
   */
  async checkAllNow(): Promise<FilingAlert[]> {
    const allAlerts: FilingAlert[] = [];
    const subscriptions = this.getSubscriptions();

    for (const sub of subscriptions) {
      const alerts = await this.checkFilings(sub.ticker);
      allAlerts.push(...alerts);
    }

    return allAlerts;
  }

  /**
   * Clear seen filings cache
   */
  clearSeenFilings(): void {
    this.seenFilings.clear();
  }

  /**
   * Get 8-K event type info
   */
  static get8KEventInfo(itemNumber: string): typeof MATERIAL_EVENT_TYPES[string] | undefined {
    return MATERIAL_EVENT_TYPES[itemNumber];
  }

  /**
   * Get all 8-K event types
   */
  static getAllEventTypes(): typeof MATERIAL_EVENT_TYPES {
    return MATERIAL_EVENT_TYPES;
  }
}

// Singleton instance
export const secAlerts = new SECAlertService();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Subscribe to alerts for a watchlist of tickers
 */
export function subscribeWatchlist(tickers: string[]): AlertSubscription[] {
  return tickers.map(ticker => secAlerts.subscribe(ticker));
}

/**
 * Get recent filings for a ticker with analysis
 */
export async function getRecentFilingsWithAnalysis(
  ticker: string,
  days: number = 7
): Promise<FilingAlert[]> {
  const filings = await getSECFilings(ticker, undefined, 50);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return filings
    .filter(f => new Date(f.acceptedDate) >= cutoff)
    .map(f => ({
      id: `filing-${ticker}-${f.acceptedDate}`,
      ticker: ticker.toUpperCase(),
      filingType: f.type,
      filingDate: f.fillingDate,
      acceptedDate: f.acceptedDate,
      filingUrl: f.finalLink,
      secUrl: f.link,
      detectedAt: new Date(f.acceptedDate),
      isNew: false,
      priority: 'medium' as const,
      category: 'financial' as const,
    }));
}

/**
 * Format alert for display
 */
export function formatAlertMessage(alert: FilingAlert): string {
  const priorityEmoji = {
    high: '🚨',
    medium: '📋',
    low: 'ℹ️',
  }[alert.priority];

  return `${priorityEmoji} **${alert.ticker}** - ${alert.filingType}
${alert.headline || 'New SEC Filing'}
Filed: ${alert.filingDate}
${alert.tradingImplication ? `\n⚡ ${alert.tradingImplication}` : ''}
[View Filing](${alert.filingUrl})`;
}

export default secAlerts;
