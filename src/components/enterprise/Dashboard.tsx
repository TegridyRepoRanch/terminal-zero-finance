// Enterprise Dashboard Component
// Shows market themes, alerts, and portfolio overview

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Bell,
  Eye,
  Zap,
  BarChart3,
  Globe,
  Shield,
  Cpu,
  Users,
  FileText,
  ChevronRight,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { useEnterpriseStore, useActiveWatchlist, useHighPriorityAlerts } from '../../store/useEnterpriseStore';
import type { MarketTheme } from '../../lib/theme-detector';
import type { FilingAlert } from '../../lib/sec-alerts';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ThemeCard({ theme, onClick }: { theme: MarketTheme; onClick?: () => void }) {
  const sentimentColor = theme.sentiment > 0.2
    ? 'text-emerald-400'
    : theme.sentiment < -0.2
      ? 'text-red-400'
      : 'text-zinc-400';

  const categoryIcons: Record<string, React.ReactNode> = {
    macro: <Globe className="w-4 h-4" />,
    sector: <BarChart3 className="w-4 h-4" />,
    supply_chain: <TrendingUp className="w-4 h-4" />,
    regulatory: <Shield className="w-4 h-4" />,
    technology: <Cpu className="w-4 h-4" />,
    consumer: <Users className="w-4 h-4" />,
    competitive: <Zap className="w-4 h-4" />,
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">{categoryIcons[theme.category] || <Zap className="w-4 h-4" />}</span>
          <span className="text-xs text-zinc-500 uppercase tracking-wider">{theme.category.replace('_', ' ')}</span>
        </div>
        <div className={`flex items-center gap-1 ${sentimentColor}`}>
          {theme.sentiment > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span className="text-xs font-medium">{(theme.sentiment * 100).toFixed(0)}%</span>
        </div>
      </div>

      <h3 className="font-semibold text-zinc-100 mb-1 group-hover:text-cyan-400 transition-colors">
        {theme.name}
      </h3>

      <p className="text-sm text-zinc-500 mb-3 line-clamp-2">
        {theme.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {theme.companies.slice(0, 5).map((ticker) => (
            <span
              key={ticker}
              className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded"
            >
              {ticker}
            </span>
          ))}
          {theme.companies.length > 5 && (
            <span className="text-xs text-zinc-600">+{theme.companies.length - 5}</span>
          )}
        </div>
        <span className="text-xs text-zinc-600">
          {Math.round(theme.confidence * 100)}% confidence
        </span>
      </div>
    </button>
  );
}

function AlertCard({ alert, onClick }: { alert: FilingAlert; onClick?: () => void }) {
  const priorityStyles = {
    high: 'border-red-500/30 bg-red-500/5',
    medium: 'border-amber-500/30 bg-amber-500/5',
    low: 'border-zinc-700 bg-zinc-900/50',
  };

  const priorityIcons = {
    high: <AlertTriangle className="w-4 h-4 text-red-400" />,
    medium: <Bell className="w-4 h-4 text-amber-400" />,
    low: <FileText className="w-4 h-4 text-zinc-500" />,
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 border rounded-lg transition-all hover:opacity-80 ${priorityStyles[alert.priority]} ${alert.isNew ? 'ring-1 ring-cyan-500/50' : ''}`}
    >
      <div className="flex items-start gap-3">
        {priorityIcons[alert.priority]}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-zinc-100">{alert.ticker}</span>
            <span className="text-xs text-zinc-500">{alert.filingType}</span>
            {alert.isNew && (
              <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded">NEW</span>
            )}
          </div>
          <p className="text-sm text-zinc-400 line-clamp-1">
            {alert.headline || `New ${alert.filingType} filing`}
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            {new Date(alert.detectedAt).toLocaleString()}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
      </div>
    </button>
  );
}

function WatchlistSummary() {
  const watchlist = useActiveWatchlist();
  const { setDashboardView } = useEnterpriseStore();

  if (!watchlist) {
    return (
      <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg text-center">
        <Eye className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400 mb-3">No watchlist selected</p>
        <button
          onClick={() => setDashboardView('watchlist')}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg transition-colors"
        >
          Create Watchlist
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-100">{watchlist.name}</h3>
        <span className="text-xs text-zinc-500">{watchlist.companies.length} companies</span>
      </div>

      <div className="space-y-2">
        {watchlist.companies.slice(0, 5).map((company) => (
          <div
            key={company.ticker}
            className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0"
          >
            <div>
              <span className="font-medium text-zinc-200">{company.ticker}</span>
              <span className="ml-2 text-sm text-zinc-500">{company.name}</span>
            </div>
            {company.alertsEnabled && (
              <Bell className="w-3 h-3 text-zinc-500" />
            )}
          </div>
        ))}
      </div>

      {watchlist.companies.length > 5 && (
        <button
          onClick={() => setDashboardView('watchlist')}
          className="w-full mt-3 text-center text-sm text-cyan-400 hover:text-cyan-300"
        >
          View all {watchlist.companies.length} companies
        </button>
      )}
    </div>
  );
}

function QuickStats() {
  const { detectedThemes, alerts } = useEnterpriseStore();
  const watchlist = useActiveWatchlist();

  const bullishThemes = detectedThemes.filter((t) => t.sentiment > 0.2).length;
  const bearishThemes = detectedThemes.filter((t) => t.sentiment < -0.2).length;
  const highPriorityAlerts = alerts.filter((a) => a.priority === 'high').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <div className="flex items-center gap-2 text-emerald-400 mb-2">
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider">Bullish</span>
        </div>
        <p className="text-2xl font-bold text-zinc-100">{bullishThemes}</p>
        <p className="text-xs text-zinc-500">positive themes</p>
      </div>

      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <TrendingDown className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider">Bearish</span>
        </div>
        <p className="text-2xl font-bold text-zinc-100">{bearishThemes}</p>
        <p className="text-xs text-zinc-500">negative themes</p>
      </div>

      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <div className="flex items-center gap-2 text-amber-400 mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider">Alerts</span>
        </div>
        <p className="text-2xl font-bold text-zinc-100">{highPriorityAlerts}</p>
        <p className="text-xs text-zinc-500">high priority</p>
      </div>

      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <div className="flex items-center gap-2 text-cyan-400 mb-2">
          <Eye className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider">Watching</span>
        </div>
        <p className="text-2xl font-bold text-zinc-100">{watchlist?.companies.length || 0}</p>
        <p className="text-xs text-zinc-500">companies</p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export function Dashboard() {
  const {
    detectedThemes,
    alerts,
    lastThemeDetectionAt,
    isAnalyzing,
    analysisProgress,
    setDashboardView,
  } = useEnterpriseStore();

  const highPriorityAlerts = useHighPriorityAlerts();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const alertCount = highPriorityAlerts.length; // Used for UI indicator

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // TODO: Trigger theme detection refresh
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Market Intelligence</h1>
          <p className="text-sm text-zinc-500">
            AI-powered insights across your portfolio
            {alertCount > 0 && (
              <span className="ml-2 text-amber-400">• {alertCount} high priority alert{alertCount !== 1 ? 's' : ''}</span>
            )}
            {lastThemeDetectionAt && (
              <span className="ml-2">
                • Updated {new Date(lastThemeDetectionAt).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isAnalyzing}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && analysisProgress && (
        <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
            <div className="flex-1">
              <p className="text-sm text-cyan-400">{analysisProgress.message}</p>
              <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{ width: `${(analysisProgress.current / analysisProgress.total) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-sm text-zinc-500">
              {analysisProgress.current}/{analysisProgress.total}
            </span>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <QuickStats />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Themes Section - 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-100">Detected Themes</h2>
            <button
              onClick={() => setDashboardView('themes')}
              className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {detectedThemes.length === 0 ? (
            <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-lg text-center">
              <BarChart3 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-300 mb-2">No themes detected yet</h3>
              <p className="text-sm text-zinc-500 mb-4">
                Add companies to your watchlist and run analysis to detect market themes
              </p>
              <button
                onClick={() => setDashboardView('watchlist')}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Build Watchlist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {detectedThemes.slice(0, 6).map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  onClick={() => setDashboardView('themes')}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - Alerts & Watchlist */}
        <div className="space-y-6">
          {/* Alerts */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-100">Recent Alerts</h2>
              <button
                onClick={() => setDashboardView('alerts')}
                className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                View all <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {alerts.length === 0 ? (
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-center">
                <Bell className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No recent alerts</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            )}
          </div>

          {/* Watchlist Summary */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-100">Watchlist</h2>
              <button
                onClick={() => setDashboardView('watchlist')}
                className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                Manage <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <WatchlistSummary />
          </div>
        </div>
      </div>

      {/* Trading Ideas Section */}
      {detectedThemes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Suggested Trades</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {detectedThemes
              .filter((t) => t.tradingImplications.length > 0)
              .slice(0, 3)
              .map((theme) => (
                <div
                  key={theme.id}
                  className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">
                      Trade Idea
                    </span>
                  </div>
                  <h3 className="font-medium text-zinc-200 mb-2">{theme.name}</h3>
                  <p className="text-sm text-zinc-400">
                    {theme.tradingImplications[0]}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    {theme.longsToConsider.slice(0, 2).map((ticker) => (
                      <span
                        key={ticker}
                        className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded"
                      >
                        Long {ticker}
                      </span>
                    ))}
                    {theme.shortsToConsider.slice(0, 2).map((ticker) => (
                      <span
                        key={ticker}
                        className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded"
                      >
                        Short {ticker}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
