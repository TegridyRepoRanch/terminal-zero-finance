// Enterprise Watchlist with Real-Time SEC Alerts
// Professional watchlist management with instant filing notifications

import React, { useState, useEffect, useCallback } from 'react';
import { useEnterpriseStore } from '../../store/useEnterpriseStore';
import { secAlerts, type FilingAlert, type AlertSubscription } from '../../lib/sec-alerts';
import { getQuote, getCompanyProfile } from '../../lib/fmp-api';

// ============================================================================
// TYPES
// ============================================================================

interface WatchlistItem {
  ticker: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  subscription?: AlertSubscription;
  recentAlerts: FilingAlert[];
  lastUpdated: Date;
}

interface QuoteData {
  price: number;
  change: number;
  changesPercentage: number;
  marketCap?: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const Watchlist: React.FC = () => {
  const { watchlists, activeWatchlistId, addToWatchlist, removeFromWatchlist, createWatchlist } = useEnterpriseStore();

  const [watchlistItems, setWatchlistItems] = useState<Map<string, WatchlistItem>>(new Map());
  const [alerts, setAlerts] = useState<FilingAlert[]>([]);
  const [newTicker, setNewTicker] = useState('');
  const [isAddingTicker, setIsAddingTicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [showNewWatchlistForm, setShowNewWatchlistForm] = useState(false);

  const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId) || watchlists[0];
  const tickers = activeWatchlist?.companies?.map(c => c.ticker) || [];

  // Subscribe to SEC alerts
  useEffect(() => {
    const unsubscribe = secAlerts.onAlert((alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts

      // Update the specific ticker's alerts
      setWatchlistItems(prev => {
        const item = prev.get(alert.ticker);
        if (item) {
          const updated = new Map(prev);
          updated.set(alert.ticker, {
            ...item,
            recentAlerts: [alert, ...item.recentAlerts].slice(0, 10),
          });
          return updated;
        }
        return prev;
      });
    });

    // Start polling for alerts
    secAlerts.startPolling();

    return () => {
      unsubscribe();
      secAlerts.stopPolling();
    };
  }, []);

  // Subscribe tickers to alerts and fetch data
  useEffect(() => {
    const subscribeAndFetch = async () => {
      setIsLoading(true);

      for (const ticker of tickers) {
        // Subscribe to alerts
        if (!watchlistItems.has(ticker)) {
          secAlerts.subscribe(ticker);
        }

        // Fetch quote and profile
        try {
          const [quoteData, profileData] = await Promise.all([
            fetchQuote(ticker),
            fetchProfile(ticker),
          ]);

          setWatchlistItems(prev => {
            const updated = new Map(prev);
            updated.set(ticker, {
              ticker,
              companyName: profileData?.companyName || ticker,
              price: quoteData?.price || 0,
              change: quoteData?.change || 0,
              changePercent: quoteData?.changesPercentage || 0,
              marketCap: quoteData?.marketCap || profileData?.mktCap,
              recentAlerts: prev.get(ticker)?.recentAlerts || [],
              lastUpdated: new Date(),
            });
            return updated;
          });
        } catch (e) {
          console.error(`Failed to fetch data for ${ticker}:`, e);
        }
      }

      setIsLoading(false);
    };

    if (tickers.length > 0) {
      subscribeAndFetch();
    }
  }, [tickers]);

  // Auto-refresh quotes every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      for (const ticker of tickers) {
        try {
          const quoteData = await fetchQuote(ticker);
          if (quoteData) {
            setWatchlistItems(prev => {
              const item = prev.get(ticker);
              if (item) {
                const updated = new Map(prev);
                updated.set(ticker, {
                  ...item,
                  price: quoteData.price,
                  change: quoteData.change,
                  changePercent: quoteData.changesPercentage,
                  lastUpdated: new Date(),
                });
                return updated;
              }
              return prev;
            });
          }
        } catch (e) {
          // Silent fail for refresh
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [tickers]);

  const fetchQuote = async (ticker: string): Promise<QuoteData | null> => {
    try {
      const quotes = await getQuote(ticker);
      if (quotes && quotes.length > 0) {
        return quotes[0];
      }
    } catch (e) {
      console.error(`Quote fetch failed for ${ticker}:`, e);
    }
    return null;
  };

  const fetchProfile = async (ticker: string) => {
    try {
      const profiles = await getCompanyProfile(ticker);
      if (profiles && profiles.length > 0) {
        return profiles[0];
      }
    } catch (e) {
      console.error(`Profile fetch failed for ${ticker}:`, e);
    }
    return null;
  };

  const handleAddTicker = useCallback(async () => {
    if (!newTicker.trim() || !activeWatchlist) return;

    const ticker = newTicker.trim().toUpperCase();

    if (tickers.includes(ticker)) {
      setError('Ticker already in watchlist');
      return;
    }

    setIsAddingTicker(true);
    setError(null);

    try {
      // Verify ticker exists
      const profile = await fetchProfile(ticker);
      if (!profile) {
        setError('Invalid ticker symbol');
        setIsAddingTicker(false);
        return;
      }

      // Add to watchlist
      addToWatchlist(activeWatchlist.id, ticker, profile.companyName || ticker);
      setNewTicker('');

      // Subscribe to alerts
      secAlerts.subscribe(ticker);

    } catch (e) {
      setError('Failed to add ticker');
    }

    setIsAddingTicker(false);
  }, [newTicker, activeWatchlist, tickers, addToWatchlist]);

  const handleRemoveTicker = useCallback((ticker: string) => {
    if (activeWatchlist) {
      removeFromWatchlist(activeWatchlist.id, ticker);
      setWatchlistItems(prev => {
        const updated = new Map(prev);
        updated.delete(ticker);
        return updated;
      });
    }
  }, [activeWatchlist, removeFromWatchlist]);

  const handleCreateWatchlist = useCallback(() => {
    if (!newWatchlistName.trim()) return;
    createWatchlist(newWatchlistName.trim());
    setNewWatchlistName('');
    setShowNewWatchlistForm(false);
  }, [newWatchlistName, createWatchlist]);

  const formatMarketCap = (cap?: number) => {
    if (!cap) return '-';
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toLocaleString()}`;
  };

  const formatChange = (change: number, changePercent: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  return (
    <div className="watchlist-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>
            📊 Watchlist
          </h1>
          <p style={{ color: '#6b7280', marginTop: '4px' }}>
            Real-time monitoring with SEC filing alerts
          </p>
        </div>

        {/* Watchlist selector */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={activeWatchlistId || ''}
            onChange={(e) => useEnterpriseStore.getState().setActiveWatchlist(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {watchlists.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowNewWatchlistForm(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            + New List
          </button>
        </div>
      </div>

      {/* New Watchlist Form */}
      {showNewWatchlistForm && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f3f4f6',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}>
          <input
            type="text"
            value={newWatchlistName}
            onChange={(e) => setNewWatchlistName(e.target.value)}
            placeholder="Watchlist name..."
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
            }}
          />
          <button
            onClick={handleCreateWatchlist}
            style={{
              padding: '10px 20px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Create
          </button>
          <button
            onClick={() => setShowNewWatchlistForm(false)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Add Ticker Form */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        alignItems: 'center',
      }}>
        <input
          type="text"
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTicker()}
          placeholder="Enter ticker symbol (e.g., AAPL)"
          style={{
            flex: 1,
            maxWidth: '300px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
          }}
        />
        <button
          onClick={handleAddTicker}
          disabled={isAddingTicker || !newTicker.trim()}
          style={{
            padding: '12px 24px',
            backgroundColor: isAddingTicker ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isAddingTicker ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {isAddingTicker ? 'Adding...' : 'Add to Watchlist'}
        </button>
        {error && (
          <span style={{ color: '#ef4444', fontSize: '14px' }}>{error}</span>
        )}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Watchlist Table */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
              {activeWatchlist?.name || 'Watchlist'} ({tickers.length} stocks)
            </h2>
          </div>

          {isLoading && tickers.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              Loading watchlist...
            </div>
          ) : tickers.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>Your watchlist is empty</p>
              <p style={{ fontSize: '14px' }}>Add tickers above to start monitoring</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Ticker</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Company</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Price</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Change</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Market Cap</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Alerts</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickers.map((ticker: string) => {
                  const item = watchlistItems.get(ticker);
                  const isPositive = (item?.change || 0) >= 0;

                  return (
                    <tr
                      key={ticker}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '16px', fontWeight: '600', fontSize: '15px' }}>
                        <a
                          href={`/company/${ticker}`}
                          style={{ color: '#3b82f6', textDecoration: 'none' }}
                        >
                          {ticker}
                        </a>
                      </td>
                      <td style={{ padding: '16px', color: '#374151', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item?.companyName || 'Loading...'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600', fontFamily: 'monospace' }}>
                        ${item?.price?.toFixed(2) || '-'}
                      </td>
                      <td style={{
                        padding: '16px',
                        textAlign: 'right',
                        color: isPositive ? '#10b981' : '#ef4444',
                        fontWeight: '500',
                        fontFamily: 'monospace',
                      }}>
                        {item ? formatChange(item.change, item.changePercent) : '-'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', color: '#6b7280' }}>
                        {formatMarketCap(item?.marketCap)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        {item?.recentAlerts && item.recentAlerts.length > 0 ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#fef3c7',
                            color: '#d97706',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}>
                            {item.recentAlerts.length} new
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '13px' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleRemoveTicker(ticker)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'transparent',
                            color: '#ef4444',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Alerts Panel */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          maxHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
              🔔 SEC Filing Alerts
            </h2>
            <span style={{
              backgroundColor: alerts.length > 0 ? '#ef4444' : '#10b981',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '600',
            }}>
              {alerts.length} new
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {alerts.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
                <p style={{ fontSize: '14px' }}>No recent alerts</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>
                  Monitoring for new SEC filings...
                </p>
              </div>
            ) : (
              alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div style={{
        marginTop: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
      }}>
        <QuickStatCard
          label="Total Stocks"
          value={tickers.length.toString()}
          icon="📈"
        />
        <QuickStatCard
          label="Gainers"
          value={Array.from(watchlistItems.values()).filter(i => i.change > 0).length.toString()}
          icon="🟢"
          color="#10b981"
        />
        <QuickStatCard
          label="Losers"
          value={Array.from(watchlistItems.values()).filter(i => i.change < 0).length.toString()}
          icon="🔴"
          color="#ef4444"
        />
        <QuickStatCard
          label="Pending Alerts"
          value={alerts.length.toString()}
          icon="🔔"
          color="#f59e0b"
        />
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const AlertItem: React.FC<{ alert: FilingAlert }> = ({ alert }) => {
  const priorityColors = {
    high: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
    medium: { bg: '#fefce8', border: '#fef08a', text: '#ca8a04' },
    low: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
  };

  const colors = priorityColors[alert.priority];

  return (
    <div style={{
      padding: '14px 16px',
      borderBottom: '1px solid #f3f4f6',
      backgroundColor: colors.bg,
      borderLeft: `3px solid ${colors.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <span style={{ fontWeight: '600', color: '#111827' }}>
          {alert.ticker}
        </span>
        <span style={{
          fontSize: '11px',
          backgroundColor: colors.text,
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontWeight: '500',
        }}>
          {alert.filingType}
        </span>
      </div>

      <p style={{ fontSize: '13px', color: '#374151', margin: '0 0 6px 0', lineHeight: 1.4 }}>
        {alert.headline || `New ${alert.filingType} filing detected`}
      </p>

      {alert.tradingImplication && (
        <p style={{ fontSize: '12px', color: colors.text, margin: '0 0 8px 0', fontStyle: 'italic' }}>
          ⚡ {alert.tradingImplication}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>
          {new Date(alert.detectedAt).toLocaleTimeString()}
        </span>
        <a
          href={alert.filingUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '12px',
            color: '#3b82f6',
            textDecoration: 'none',
          }}
        >
          View Filing →
        </a>
      </div>
    </div>
  );
};

const QuickStatCard: React.FC<{
  label: string;
  value: string;
  icon: string;
  color?: string;
}> = ({ label, value, icon, color = '#3b82f6' }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  }}>
    <span style={{ fontSize: '24px' }}>{icon}</span>
    <div>
      <div style={{ fontSize: '24px', fontWeight: '700', color }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>{label}</div>
    </div>
  </div>
);

export default Watchlist;
