// Peer Group Comparison Metrics
import { useMemo, useState } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useFinanceStore } from '../../store/useFinanceStore';
import { cn } from '../../lib/utils';
import { Users, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Sample peer data
const PEER_DATA: PeerMetrics[] = [
  { ticker: 'AAPL', name: 'Apple', revenueGrowth: 8.2, grossMargin: 43.5, netMargin: 25.1, roic: 48.5, debtEquity: 1.8, fcfYield: 4.2, evRevenue: 7.2, peRatio: 28.5 },
  { ticker: 'MSFT', name: 'Microsoft', revenueGrowth: 12.5, grossMargin: 69.8, netMargin: 34.2, roic: 28.5, debtEquity: 0.4, fcfYield: 3.1, evRevenue: 11.8, peRatio: 32.1 },
  { ticker: 'GOOGL', name: 'Alphabet', revenueGrowth: 15.3, grossMargin: 56.4, netMargin: 24.1, roic: 22.5, debtEquity: 0.1, fcfYield: 4.8, evRevenue: 5.8, peRatio: 23.8 },
  { ticker: 'META', name: 'Meta', revenueGrowth: 18.5, grossMargin: 81.2, netMargin: 28.5, roic: 18.2, debtEquity: 0.2, fcfYield: 3.5, evRevenue: 8.5, peRatio: 25.2 },
  { ticker: 'AMZN', name: 'Amazon', revenueGrowth: 12.8, grossMargin: 46.5, netMargin: 6.2, roic: 8.5, debtEquity: 0.6, fcfYield: 2.1, evRevenue: 2.8, peRatio: 42.5 },
  { ticker: 'NVDA', name: 'NVIDIA', revenueGrowth: 122.3, grossMargin: 72.8, netMargin: 48.2, roic: 65.2, debtEquity: 0.4, fcfYield: 1.2, evRevenue: 22.5, peRatio: 55.8 },
];

interface PeerMetrics {
  ticker: string;
  name: string;
  revenueGrowth: number;
  grossMargin: number;
  netMargin: number;
  roic: number;
  debtEquity: number;
  fcfYield: number;
  evRevenue: number;
  peRatio: number;
}

type ViewMode = 'radar' | 'bars' | 'table';

interface PeerComparisonProps {
  className?: string;
}

export function PeerComparison({ className }: PeerComparisonProps) {
  const { assumptions, valuation, incomeStatement, company } = useFinanceStore();
  const [selectedPeers, setSelectedPeers] = useState<string[]>(['AAPL', 'MSFT', 'GOOGL']);
  const [viewMode, setViewMode] = useState<ViewMode>('radar');

  // Calculate target company metrics
  const targetMetrics = useMemo<PeerMetrics | null>(() => {
    const firstYear = incomeStatement[0];
    if (!firstYear) return null;

    return {
      ticker: company?.ticker || 'TARGET',
      name: company?.name || 'Target',
      revenueGrowth: assumptions.revenueGrowthRate,
      grossMargin: (firstYear.grossProfit / firstYear.revenue) * 100,
      netMargin: (firstYear.netIncome / firstYear.revenue) * 100,
      roic: 25, // Placeholder
      debtEquity: assumptions.debtBalance / (valuation.equityValue / 1e6),
      fcfYield: 3.5, // Placeholder
      evRevenue: valuation.enterpriseValue / firstYear.revenue,
      peRatio: valuation.equityValue / firstYear.netIncome,
    };
  }, [assumptions, valuation, incomeStatement, company]);

  const selectedPeerData = useMemo(() => {
    return PEER_DATA.filter((p) => selectedPeers.includes(p.ticker));
  }, [selectedPeers]);

  // Calculate peer group statistics
  const peerStats = useMemo(() => {
    if (selectedPeerData.length === 0) return null;

    const calcStats = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const n = sorted.length;
      return {
        median: n % 2 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2,
        mean: values.reduce((a, b) => a + b, 0) / n,
        min: sorted[0],
        max: sorted[n - 1],
      };
    };

    return {
      revenueGrowth: calcStats(selectedPeerData.map((p) => p.revenueGrowth)),
      grossMargin: calcStats(selectedPeerData.map((p) => p.grossMargin)),
      netMargin: calcStats(selectedPeerData.map((p) => p.netMargin)),
      roic: calcStats(selectedPeerData.map((p) => p.roic)),
      evRevenue: calcStats(selectedPeerData.map((p) => p.evRevenue)),
      peRatio: calcStats(selectedPeerData.map((p) => p.peRatio)),
    };
  }, [selectedPeerData]);

  // Prepare radar chart data
  const radarData = useMemo(() => {
    if (!targetMetrics || !peerStats) return [];

    // Normalize metrics for radar chart (0-100 scale)
    const normalize = (value: number, min: number, max: number) =>
      Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

    const metrics = [
      { metric: 'Revenue Growth', target: targetMetrics.revenueGrowth, median: peerStats.revenueGrowth.median, max: 50 },
      { metric: 'Gross Margin', target: targetMetrics.grossMargin, median: peerStats.grossMargin.median, max: 100 },
      { metric: 'Net Margin', target: targetMetrics.netMargin, median: peerStats.netMargin.median, max: 50 },
      { metric: 'ROIC', target: targetMetrics.roic, median: peerStats.roic.median, max: 50 },
      { metric: 'EV/Revenue', target: 10 / targetMetrics.evRevenue, median: 10 / peerStats.evRevenue.median, max: 10 }, // Inverted
      { metric: 'P/E Ratio', target: 50 / targetMetrics.peRatio, median: 50 / peerStats.peRatio.median, max: 10 }, // Inverted
    ];

    return metrics.map((m) => ({
      metric: m.metric,
      target: normalize(m.target, 0, m.max),
      peerMedian: normalize(m.median, 0, m.max),
      fullMark: 100,
    }));
  }, [targetMetrics, peerStats]);

  // Prepare bar chart data for comparison
  const barData = useMemo(() => {
    if (!targetMetrics) return [];

    return [
      { metric: 'Rev Growth %', target: targetMetrics.revenueGrowth, ...Object.fromEntries(selectedPeerData.map((p) => [p.ticker, p.revenueGrowth])) },
      { metric: 'Gross Margin %', target: targetMetrics.grossMargin, ...Object.fromEntries(selectedPeerData.map((p) => [p.ticker, p.grossMargin])) },
      { metric: 'Net Margin %', target: targetMetrics.netMargin, ...Object.fromEntries(selectedPeerData.map((p) => [p.ticker, p.netMargin])) },
      { metric: 'ROIC %', target: targetMetrics.roic, ...Object.fromEntries(selectedPeerData.map((p) => [p.ticker, p.roic])) },
    ];
  }, [targetMetrics, selectedPeerData]);

  const togglePeer = (ticker: string) => {
    setSelectedPeers((prev) =>
      prev.includes(ticker)
        ? prev.filter((t) => t !== ticker)
        : [...prev, ticker]
    );
  };

  const getComparisonIndicator = (targetVal: number, peerMedian: number) => {
    const diff = ((targetVal - peerMedian) / peerMedian) * 100;
    if (diff > 10) return { icon: <TrendingUp size={12} />, color: 'text-emerald-400', label: 'Above peers' };
    if (diff < -10) return { icon: <TrendingDown size={12} />, color: 'text-red-400', label: 'Below peers' };
    return { icon: <Minus size={12} />, color: 'text-zinc-400', label: 'In line with peers' };
  };

  const colors = ['#34d399', '#22d3ee', '#818cf8', '#f472b6', '#fbbf24', '#f43f5e'];

  return (
    <div className={cn('bg-zinc-900/50 rounded-lg border border-zinc-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Peer Group Comparison</h3>
        </div>
        <div className="flex items-center gap-2">
          {(['radar', 'bars', 'table'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'px-2 py-1 text-xs font-medium rounded transition-colors capitalize',
                viewMode === mode
                  ? 'bg-purple-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-800'
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Peer Selector */}
      <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/30">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-zinc-500">Peers:</span>
          {PEER_DATA.map((peer) => (
            <button
              key={peer.ticker}
              onClick={() => togglePeer(peer.ticker)}
              className={cn(
                'px-2 py-0.5 text-xs rounded border transition-colors',
                selectedPeers.includes(peer.ticker)
                  ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'
              )}
            >
              {peer.ticker}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Summary */}
      {targetMetrics && peerStats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-4 border-b border-zinc-800">
          {[
            { label: 'Rev Growth', target: targetMetrics.revenueGrowth, peer: peerStats.revenueGrowth.median, suffix: '%' },
            { label: 'Gross Margin', target: targetMetrics.grossMargin, peer: peerStats.grossMargin.median, suffix: '%' },
            { label: 'Net Margin', target: targetMetrics.netMargin, peer: peerStats.netMargin.median, suffix: '%' },
            { label: 'ROIC', target: targetMetrics.roic, peer: peerStats.roic.median, suffix: '%' },
            { label: 'EV/Revenue', target: targetMetrics.evRevenue, peer: peerStats.evRevenue.median, suffix: 'x' },
            { label: 'P/E', target: targetMetrics.peRatio, peer: peerStats.peRatio.median, suffix: 'x' },
          ].map((item) => {
            const comparison = getComparisonIndicator(item.target, item.peer);
            return (
              <div key={item.label} className="text-center">
                <p className="text-[10px] text-zinc-500 uppercase">{item.label}</p>
                <p className="text-sm font-mono font-bold text-zinc-200">
                  {item.target.toFixed(1)}{item.suffix}
                </p>
                <p className={cn('text-[10px] flex items-center justify-center gap-0.5', comparison.color)}>
                  {comparison.icon}
                  vs {item.peer.toFixed(1)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart/Table View */}
      <div className="p-4">
        {viewMode === 'radar' && radarData.length > 0 && (
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#3f3f46" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 9 }} />
              <Radar
                name="Target"
                dataKey="target"
                stroke="#34d399"
                fill="#34d399"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Radar
                name="Peer Median"
                dataKey="peerMedian"
                stroke="#818cf8"
                fill="#818cf8"
                fillOpacity={0.2}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        )}

        {viewMode === 'bars' && (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="metric" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                labelStyle={{ color: '#d4d4d8' }}
              />
              <Legend />
              <Bar dataKey="target" name={targetMetrics?.ticker || 'Target'} fill="#34d399" radius={[4, 4, 0, 0]} />
              {selectedPeerData.map((peer, i) => (
                <Bar key={peer.ticker} dataKey={peer.ticker} name={peer.ticker} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}

        {viewMode === 'table' && targetMetrics && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-3 py-2 text-left text-zinc-500 font-semibold">Metric</th>
                  <th className="px-3 py-2 text-right text-emerald-400 font-semibold">{targetMetrics.ticker}</th>
                  {selectedPeerData.map((peer) => (
                    <th key={peer.ticker} className="px-3 py-2 text-right text-zinc-400 font-semibold">{peer.ticker}</th>
                  ))}
                  <th className="px-3 py-2 text-right text-purple-400 font-semibold">Median</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Revenue Growth', key: 'revenueGrowth', suffix: '%' },
                  { label: 'Gross Margin', key: 'grossMargin', suffix: '%' },
                  { label: 'Net Margin', key: 'netMargin', suffix: '%' },
                  { label: 'ROIC', key: 'roic', suffix: '%' },
                  { label: 'Debt/Equity', key: 'debtEquity', suffix: 'x' },
                  { label: 'FCF Yield', key: 'fcfYield', suffix: '%' },
                  { label: 'EV/Revenue', key: 'evRevenue', suffix: 'x' },
                  { label: 'P/E Ratio', key: 'peRatio', suffix: 'x' },
                ].map((row) => {
                  const targetVal = targetMetrics[row.key as keyof PeerMetrics] as number;
                  const peerVals = selectedPeerData.map((p) => p[row.key as keyof PeerMetrics] as number);
                  const median = peerStats ? (peerStats as Record<string, { median: number }>)[row.key]?.median : 0;

                  return (
                    <tr key={row.key} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-3 py-2 text-zinc-300">{row.label}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-400">
                        {targetVal.toFixed(1)}{row.suffix}
                      </td>
                      {peerVals.map((val, i) => (
                        <td key={i} className="px-3 py-2 text-right font-mono text-zinc-300">
                          {val.toFixed(1)}{row.suffix}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-mono text-purple-400">
                        {median?.toFixed(1)}{row.suffix}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Positioning Summary */}
      {targetMetrics && peerStats && (
        <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} className="text-purple-400" />
            <span className="text-xs text-zinc-500 uppercase">Positioning vs Peers</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-zinc-400">Strengths: </span>
              <span className="text-emerald-400">
                {targetMetrics.netMargin > peerStats.netMargin.median ? 'Higher margins' : ''}
                {targetMetrics.revenueGrowth > peerStats.revenueGrowth.median ? (targetMetrics.netMargin > peerStats.netMargin.median ? ', Faster growth' : 'Faster growth') : ''}
              </span>
            </div>
            <div>
              <span className="text-zinc-400">Watch: </span>
              <span className="text-amber-400">
                {targetMetrics.evRevenue > peerStats.evRevenue.median ? 'Higher valuation multiple' : ''}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
