// Quarterly Projections Module
import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Bar,
  Line,
} from 'recharts';
import { useFinanceStore } from '../../store/useFinanceStore';
import { cn } from '../../lib/utils';
import { Calendar, TrendingUp, Settings } from 'lucide-react';

interface QuarterlyDataPoint {
  quarter: string;
  year: number;
  qNum: number;
  revenue: number;
  revenueGrowth: number;
  grossProfit: number;
  grossMargin: number;
  opIncome: number;
  opMargin: number;
  netIncome: number;
  netMargin: number;
  eps: number;
  seasonalityFactor: number;
}

// Default seasonality patterns by sector
const SEASONALITY_PATTERNS: Record<string, number[]> = {
  Technology: [0.22, 0.24, 0.24, 0.30], // Q4 heavy (holiday)
  Retail: [0.20, 0.22, 0.23, 0.35], // Very Q4 heavy
  'Consumer Discretionary': [0.22, 0.24, 0.24, 0.30],
  Healthcare: [0.25, 0.25, 0.25, 0.25], // Fairly even
  Financials: [0.26, 0.24, 0.24, 0.26], // Q1/Q4 slightly higher
  Default: [0.24, 0.25, 0.25, 0.26], // Slight Q4 bias
};

interface QuarterlyProjectionsProps {
  className?: string;
}

export function QuarterlyProjections({ className }: QuarterlyProjectionsProps) {
  const { assumptions, incomeStatement, company } = useFinanceStore();
  const [showSettings, setShowSettings] = useState(false);

  // Customizable seasonality
  const [seasonality, setSeasonality] = useState<number[]>(
    SEASONALITY_PATTERNS[company?.sector || 'Default'] || SEASONALITY_PATTERNS.Default
  );

  // Generate quarterly projections from annual data
  const quarterlyData = useMemo<QuarterlyDataPoint[]>(() => {
    const data: QuarterlyDataPoint[] = [];
    const currentYear = new Date().getFullYear();

    // Use first 3 years of projections
    const yearsToProject = Math.min(3, incomeStatement.length);

    for (let yearIdx = 0; yearIdx < yearsToProject; yearIdx++) {
      const annual = incomeStatement[yearIdx];
      if (!annual) continue;

      const year = currentYear + yearIdx;

      // Distribute annual figures across quarters using seasonality
      for (let q = 0; q < 4; q++) {
        const seasonalFactor = seasonality[q];

        const revenue = annual.revenue * seasonalFactor;
        const grossProfit = annual.grossProfit * seasonalFactor;
        const opIncome = annual.ebit * seasonalFactor;
        const netIncome = annual.netIncome * seasonalFactor;

        // Calculate YoY growth
        const prevYearQuarterIdx = data.length - 4;

        let revenueGrowth = 0;
        if (prevYearQuarterIdx >= 0) {
          revenueGrowth = ((revenue - data[prevYearQuarterIdx].revenue) / data[prevYearQuarterIdx].revenue) * 100;
        }

        data.push({
          quarter: `Q${q + 1}'${year.toString().slice(2)}`,
          year,
          qNum: q + 1,
          revenue,
          revenueGrowth,
          grossProfit,
          grossMargin: (grossProfit / revenue) * 100,
          opIncome,
          opMargin: (opIncome / revenue) * 100,
          netIncome,
          netMargin: (netIncome / revenue) * 100,
          eps: netIncome / assumptions.sharesOutstanding,
          seasonalityFactor: seasonalFactor,
        });
      }
    }

    return data;
  }, [incomeStatement, assumptions.sharesOutstanding, seasonality]);

  // Calculate quarterly statistics
  const quarterlyStats = useMemo(() => {
    if (quarterlyData.length === 0) return null;

    const avgRevenue = quarterlyData.reduce((sum, q) => sum + q.revenue, 0) / quarterlyData.length;
    const maxRevenue = Math.max(...quarterlyData.map((q) => q.revenue));
    const minRevenue = Math.min(...quarterlyData.map((q) => q.revenue));

    // Find best and worst quarters on average
    const byQuarter: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] };
    quarterlyData.forEach((q) => byQuarter[q.qNum].push(q.revenue));

    const quarterAvgs = Object.entries(byQuarter).map(([q, revs]) => ({
      quarter: parseInt(q),
      avg: revs.reduce((a, b) => a + b, 0) / revs.length,
    }));
    quarterAvgs.sort((a, b) => b.avg - a.avg);

    return {
      avgRevenue,
      maxRevenue,
      minRevenue,
      bestQuarter: quarterAvgs[0].quarter,
      worstQuarter: quarterAvgs[quarterAvgs.length - 1].quarter,
      totalQuarters: quarterlyData.length,
    };
  }, [quarterlyData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload as QuarterlyDataPoint;

    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-sm font-semibold text-zinc-100 mb-1">{label}</p>
        <div className="text-xs space-y-1">
          <p className="text-zinc-400">
            Revenue: <span className="text-emerald-400">${(data.revenue / 1e9).toFixed(2)}B</span>
          </p>
          <p className="text-zinc-400">
            YoY Growth: <span className={data.revenueGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {data.revenueGrowth >= 0 ? '+' : ''}{data.revenueGrowth.toFixed(1)}%
            </span>
          </p>
          <p className="text-zinc-400">
            Net Margin: <span className="text-cyan-400">{data.netMargin.toFixed(1)}%</span>
          </p>
          <p className="text-zinc-400">
            EPS: <span className="text-purple-400">${data.eps.toFixed(2)}</span>
          </p>
        </div>
      </div>
    );
  };

  const updateSeasonality = (qIdx: number, value: number) => {
    const newSeasonality = [...seasonality];
    newSeasonality[qIdx] = value / 100;

    // Normalize to sum to 1
    const sum = newSeasonality.reduce((a, b) => a + b, 0);
    const normalized = newSeasonality.map((v) => v / sum);

    setSeasonality(normalized);
  };

  return (
    <div className={cn('bg-zinc-900/50 rounded-lg border border-zinc-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-orange-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Quarterly Projections</h3>
          <span className="text-xs text-zinc-500">({quarterlyData.length} quarters)</span>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            'p-1.5 rounded transition-colors',
            showSettings ? 'bg-orange-600 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
          )}
          title="Seasonality settings"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Seasonality Settings */}
      {showSettings && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
          <p className="text-xs text-zinc-500 mb-2">Quarterly Revenue Distribution (%)</p>
          <div className="grid grid-cols-4 gap-3">
            {['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => (
              <div key={q} className="text-center">
                <label className="text-xs text-zinc-400 block mb-1">{q}</label>
                <input
                  type="number"
                  value={Math.round(seasonality[i] * 100)}
                  onChange={(e) => updateSeasonality(i, Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-center text-zinc-300"
                  min={10}
                  max={50}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-zinc-500">
              Total: {Math.round(seasonality.reduce((a, b) => a + b, 0) * 100)}%
            </p>
            <button
              onClick={() => setSeasonality(SEASONALITY_PATTERNS[company?.sector || 'Default'] || SEASONALITY_PATTERNS.Default)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Reset to Sector Default
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {quarterlyStats && (
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-zinc-800">
          <div className="text-center">
            <p className="text-xs text-zinc-500 uppercase">Avg Quarterly Rev</p>
            <p className="text-lg font-mono font-bold text-emerald-400">
              ${(quarterlyStats.avgRevenue / 1e9).toFixed(1)}B
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-zinc-500 uppercase">Best Quarter</p>
            <p className="text-lg font-mono font-bold text-cyan-400">Q{quarterlyStats.bestQuarter}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-zinc-500 uppercase">Weakest Quarter</p>
            <p className="text-lg font-mono font-bold text-amber-400">Q{quarterlyStats.worstQuarter}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-zinc-500 uppercase">Range</p>
            <p className="text-lg font-mono font-bold text-zinc-300">
              ${(quarterlyStats.minRevenue / 1e9).toFixed(1)}B - ${(quarterlyStats.maxRevenue / 1e9).toFixed(1)}B
            </p>
          </div>
        </div>
      )}

      {/* Revenue & Growth Chart */}
      <div className="p-4 border-b border-zinc-800">
        <h4 className="text-xs text-zinc-500 uppercase mb-3">Revenue & YoY Growth</h4>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={quarterlyData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="quarter" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#a1a1aa', fontSize: 10 }}
              tickFormatter={(v) => `$${(v / 1e9).toFixed(0)}B`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#a1a1aa', fontSize: 10 }}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#34d399" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="revenueGrowth"
              name="YoY Growth"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Profitability Chart */}
      <div className="p-4 border-b border-zinc-800">
        <h4 className="text-xs text-zinc-500 uppercase mb-3">Quarterly Profitability</h4>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={quarterlyData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="quarter" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1e9).toFixed(0)}B`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="grossProfit"
              name="Gross Profit"
              stroke="#34d399"
              fill="url(#grossGrad)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="netIncome"
              name="Net Income"
              stroke="#818cf8"
              fill="url(#netGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quarterly Data Table */}
      <div className="overflow-x-auto max-h-64">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-zinc-900">
            <tr className="border-b border-zinc-800">
              <th className="px-3 py-2 text-left text-zinc-500 font-semibold">Quarter</th>
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">Revenue</th>
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">YoY %</th>
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">Gross %</th>
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">Net %</th>
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">EPS</th>
            </tr>
          </thead>
          <tbody>
            {quarterlyData.map((q) => (
              <tr key={q.quarter} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="px-3 py-2 font-semibold text-zinc-200">{q.quarter}</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">
                  ${(q.revenue / 1e9).toFixed(2)}B
                </td>
                <td className={cn(
                  'px-3 py-2 text-right font-mono',
                  q.revenueGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {q.revenueGrowth !== 0 ? `${q.revenueGrowth >= 0 ? '+' : ''}${q.revenueGrowth.toFixed(1)}%` : '-'}
                </td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">{q.grossMargin.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">{q.netMargin.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right font-mono text-purple-400">${q.eps.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Seasonality Note */}
      <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/30 text-xs text-zinc-500">
        <TrendingUp size={12} className="inline mr-1 text-orange-400" />
        Projections use {company?.sector || 'default'} sector seasonality pattern. Click settings to customize.
      </div>
    </div>
  );
}
