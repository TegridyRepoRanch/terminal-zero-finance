// Enterprise Features Store
// Manages watchlists, alerts, themes, and company data for institutional features

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MarketTheme, ThemeDetectionResult } from '../lib/theme-detector';
import type { EarningsAnalysis } from '../lib/earnings-analyzer';
import type { DCFValuation } from '../lib/dcf-generator';
import type { FilingAlert } from '../lib/sec-alerts';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface WatchlistCompany {
  ticker: string;
  name: string;
  addedAt: Date;
  lastAnalyzedAt?: Date;
  notes?: string;
  tags?: string[];
  alertsEnabled: boolean;
}

export interface Watchlist {
  id: string;
  name: string;
  description?: string;
  companies: WatchlistCompany[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyAnalysisData {
  ticker: string;
  name?: string;
  sector?: string;
  industry?: string;

  // Earnings Analysis
  earningsAnalyses: EarningsAnalysis[];
  lastEarningsAnalysisAt?: Date;

  // DCF Valuation
  dcfValuation?: DCFValuation;
  lastDCFAt?: Date;

  // Alerts
  recentAlerts: FilingAlert[];

  // Data freshness
  lastUpdatedAt: Date;
}

export interface EnterpriseState {
  // Watchlists
  watchlists: Watchlist[];
  activeWatchlistId: string | null;

  // Company Analysis Cache
  companyData: Map<string, CompanyAnalysisData>;

  // Themes
  detectedThemes: MarketTheme[];
  lastThemeDetectionAt: Date | null;
  themeDetectionResult: ThemeDetectionResult | null;

  // Alerts
  alerts: FilingAlert[];
  unreadAlertCount: number;
  alertsEnabled: boolean;

  // UI State
  dashboardView: 'overview' | 'themes' | 'alerts' | 'watchlist';
  selectedCompanyTicker: string | null;
  isAnalyzing: boolean;
  analysisProgress: { current: number; total: number; message: string } | null;

  // Actions - Watchlists
  createWatchlist: (name: string, description?: string) => string;
  deleteWatchlist: (id: string) => void;
  renameWatchlist: (id: string, name: string) => void;
  setActiveWatchlist: (id: string | null) => void;
  addToWatchlist: (watchlistId: string, ticker: string, name: string) => void;
  removeFromWatchlist: (watchlistId: string, ticker: string) => void;
  updateWatchlistCompany: (watchlistId: string, ticker: string, updates: Partial<WatchlistCompany>) => void;

  // Actions - Company Data
  setCompanyData: (ticker: string, data: Partial<CompanyAnalysisData>) => void;
  getCompanyData: (ticker: string) => CompanyAnalysisData | undefined;
  clearCompanyData: (ticker: string) => void;

  // Actions - Themes
  setThemeDetectionResult: (result: ThemeDetectionResult) => void;
  clearThemes: () => void;

  // Actions - Alerts
  addAlert: (alert: FilingAlert) => void;
  markAlertRead: (alertId: string) => void;
  markAllAlertsRead: () => void;
  clearAlerts: () => void;
  setAlertsEnabled: (enabled: boolean) => void;

  // Actions - UI
  setDashboardView: (view: EnterpriseState['dashboardView']) => void;
  setSelectedCompany: (ticker: string | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setAnalysisProgress: (progress: EnterpriseState['analysisProgress']) => void;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useEnterpriseStore = create<EnterpriseState>()(
  persist(
    (set, get) => ({
      // Initial State
      watchlists: [],
      activeWatchlistId: null,
      companyData: new Map(),
      detectedThemes: [],
      lastThemeDetectionAt: null,
      themeDetectionResult: null,
      alerts: [],
      unreadAlertCount: 0,
      alertsEnabled: true,
      dashboardView: 'overview',
      selectedCompanyTicker: null,
      isAnalyzing: false,
      analysisProgress: null,

      // Watchlist Actions
      createWatchlist: (name, description) => {
        const id = `watchlist-${Date.now()}`;
        const newWatchlist: Watchlist = {
          id,
          name,
          description,
          companies: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          watchlists: [...state.watchlists, newWatchlist],
          activeWatchlistId: state.activeWatchlistId || id,
        }));

        return id;
      },

      deleteWatchlist: (id) => {
        set((state) => ({
          watchlists: state.watchlists.filter((w) => w.id !== id),
          activeWatchlistId: state.activeWatchlistId === id ? null : state.activeWatchlistId,
        }));
      },

      renameWatchlist: (id, name) => {
        set((state) => ({
          watchlists: state.watchlists.map((w) =>
            w.id === id ? { ...w, name, updatedAt: new Date() } : w
          ),
        }));
      },

      setActiveWatchlist: (id) => {
        set({ activeWatchlistId: id });
      },

      addToWatchlist: (watchlistId, ticker, name) => {
        set((state) => ({
          watchlists: state.watchlists.map((w) => {
            if (w.id !== watchlistId) return w;
            if (w.companies.some((c) => c.ticker === ticker.toUpperCase())) return w;

            return {
              ...w,
              companies: [
                ...w.companies,
                {
                  ticker: ticker.toUpperCase(),
                  name,
                  addedAt: new Date(),
                  alertsEnabled: true,
                },
              ],
              updatedAt: new Date(),
            };
          }),
        }));
      },

      removeFromWatchlist: (watchlistId, ticker) => {
        set((state) => ({
          watchlists: state.watchlists.map((w) => {
            if (w.id !== watchlistId) return w;
            return {
              ...w,
              companies: w.companies.filter((c) => c.ticker !== ticker.toUpperCase()),
              updatedAt: new Date(),
            };
          }),
        }));
      },

      updateWatchlistCompany: (watchlistId, ticker, updates) => {
        set((state) => ({
          watchlists: state.watchlists.map((w) => {
            if (w.id !== watchlistId) return w;
            return {
              ...w,
              companies: w.companies.map((c) =>
                c.ticker === ticker.toUpperCase() ? { ...c, ...updates } : c
              ),
              updatedAt: new Date(),
            };
          }),
        }));
      },

      // Company Data Actions
      setCompanyData: (ticker, data) => {
        const normalizedTicker = ticker.toUpperCase();
        const existing = get().companyData.get(normalizedTicker);

        const updated: CompanyAnalysisData = {
          ticker: normalizedTicker,
          earningsAnalyses: [],
          recentAlerts: [],
          lastUpdatedAt: new Date(),
          ...existing,
          ...data,
        };

        set((state) => {
          const newMap = new Map(state.companyData);
          newMap.set(normalizedTicker, updated);
          return { companyData: newMap };
        });
      },

      getCompanyData: (ticker) => {
        return get().companyData.get(ticker.toUpperCase());
      },

      clearCompanyData: (ticker) => {
        set((state) => {
          const newMap = new Map(state.companyData);
          newMap.delete(ticker.toUpperCase());
          return { companyData: newMap };
        });
      },

      // Theme Actions
      setThemeDetectionResult: (result) => {
        set({
          themeDetectionResult: result,
          detectedThemes: result.themes,
          lastThemeDetectionAt: new Date(),
        });
      },

      clearThemes: () => {
        set({
          detectedThemes: [],
          themeDetectionResult: null,
          lastThemeDetectionAt: null,
        });
      },

      // Alert Actions
      addAlert: (alert) => {
        set((state) => ({
          alerts: [alert, ...state.alerts].slice(0, 100), // Keep last 100
          unreadAlertCount: state.unreadAlertCount + 1,
        }));
      },

      markAlertRead: (alertId) => {
        set((state) => {
          const alert = state.alerts.find((a) => a.id === alertId);
          if (!alert || !alert.isNew) return state;

          return {
            alerts: state.alerts.map((a) =>
              a.id === alertId ? { ...a, isNew: false } : a
            ),
            unreadAlertCount: Math.max(0, state.unreadAlertCount - 1),
          };
        });
      },

      markAllAlertsRead: () => {
        set((state) => ({
          alerts: state.alerts.map((a) => ({ ...a, isNew: false })),
          unreadAlertCount: 0,
        }));
      },

      clearAlerts: () => {
        set({ alerts: [], unreadAlertCount: 0 });
      },

      setAlertsEnabled: (enabled) => {
        set({ alertsEnabled: enabled });
      },

      // UI Actions
      setDashboardView: (view) => {
        set({ dashboardView: view });
      },

      setSelectedCompany: (ticker) => {
        set({ selectedCompanyTicker: ticker?.toUpperCase() || null });
      },

      setIsAnalyzing: (isAnalyzing) => {
        set({ isAnalyzing });
      },

      setAnalysisProgress: (progress) => {
        set({ analysisProgress: progress });
      },
    }),
    {
      name: 'enterprise-store',
      partialize: (state) => ({
        watchlists: state.watchlists,
        activeWatchlistId: state.activeWatchlistId,
        alertsEnabled: state.alertsEnabled,
        // Note: companyData is not persisted as it can be large
      }),
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const useActiveWatchlist = () => {
  const { watchlists, activeWatchlistId } = useEnterpriseStore();
  return watchlists.find((w) => w.id === activeWatchlistId) || null;
};

export const useWatchlistTickers = () => {
  const watchlist = useActiveWatchlist();
  return watchlist?.companies.map((c) => c.ticker) || [];
};

export const useUnreadAlerts = () => {
  const { alerts } = useEnterpriseStore();
  return alerts.filter((a) => a.isNew);
};

export const useHighPriorityAlerts = () => {
  const { alerts } = useEnterpriseStore();
  return alerts.filter((a) => a.priority === 'high');
};

export const useThemesByCategory = () => {
  const { detectedThemes } = useEnterpriseStore();
  const byCategory = new Map<string, typeof detectedThemes>();

  for (const theme of detectedThemes) {
    const existing = byCategory.get(theme.category) || [];
    byCategory.set(theme.category, [...existing, theme]);
  }

  return byCategory;
};

export default useEnterpriseStore;
