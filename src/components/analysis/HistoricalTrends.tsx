// Historical Data Charting - 5-Year Trends
import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';
import { useFinanceStore } from '../../store/useFinanceStore';
import { cn } from '../../lib/utils';
import { History, TrendingUp, DollarSign, Percent } from 'lucide-react';

// Generate sample historical data (in real app, this would come from an API)
function generateHistoricalData(baseRevenue: number, years: number = 5): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  const currentYear = new Date().getFullYear();

  // Work backwards from base revenue with some randomness
  let revenue = baseRevenue;
  const growthRates = [0.12, 0.15, 0.08, 0.22, 0.18]; // Historical growth rates

  const historicalRevenues: number[] = [baseRevenue];
  for (let i = 0; i < years - 1; i++) {
    revenue = revenue / (1 + growthRates[i] + (Math.random() - 0.5) * 0.05);
    historicalRevenues.unshift(revenue);
  }

  historicalRevenues.forEach((rev, i) => {
    const year = currentYear - years + i + 1;
    const grossMargin = 0.42 + (Math.random() - 0.5) * 0.04;
    const opMargin = 0.28 + (Math.random() - 0.5) * 0.03;
    const netMargin = 0.22 + (Math.random() - 0.5) * 0.02;

    data.push({
      year: year.toString(),
      revenue: rev,
      revenueGrowth: i > 0 ? ((rev - historicalRevenues[i - 1]) / historicalRevenues[i - 1]) * 100 : 0,
      grossProfit: rev * grossMargin,
      grossMargin: grossMargin * 100,
      operatingIncome: rev * opMargin,
      operatingMargin: opMargin * 100,
      netIncome: rev * netMargin,
      netMargin: netMargin * 100,
      eps: (rev * netMargin) / 15e9, // Assume 15B shares
      fcf: rev * (netMargin - 0.03),
      capex: rev * 0.08,
      rnd: rev * 0.06,
    });
  });

  return data;
}

interface HistoricalDataPoint {
  year: string;
  revenue: number;
  revenueGrowth: number;
  grossProfit: number;
  grossMargin: number;
  operatingIncome: number;
  operatingMargin: number;
  netIncome: number;
  netMargin: number;
  eps: number;
  fcf: number;
  capex: number;
  rnd: number;
}

type MetricCategory = 'revenue' | 'profitability' | 'margins' | 'cashflow';

interface HistoricalTrendsProps {
  className?: string;
}

export function HistoricalTrends({ className }: HistoricalTrendsProps) {
  const { assumptions, company } = useFinanceStore();
  const [activeCategory, setActiveCategory] = useState<MetricCategory>('revenue');

  const historicalData = useMemo(() => {
    return generateHistoricalData(assumptions.baseRevenue);
  }, [assumptions.baseRevenue]);

  const categories: { id: MetricCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'revenue', label: 'Revenue', icon: <TrendingUp size={14} /> },
    { id: 'profitability', label: 'Profitability', icon: <DollarSign size={14} /> },
    { id: 'margins', label: 'Margins', icon: <Percent size={14} /> },
    { id: 'cashflow', label: 'Cash Flow', icon: <DollarSign size={14} /> },
  ];

  // Calculate CAGR
  const cagr = useMemo(() => {
    if (historicalData.length < 2) return 0;
    const first = historicalData[0].revenue;
    const last = historicalData[historicalData.length - 1].revenue;
    const years = historicalData.length - 1;
    return (Math.pow(last / first, 1 / years) - 1) * 100;
  }, [historicalData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-sm font-semibold text-zinc-100 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes('Margin') || entry.name.includes('Growth')
              ? `${entry.value.toFixed(1)}%`
              : `$${(entry.value / 1e9).toFixed(1)}B`}
          </p>
        ))}
      </div>
    );
  };

  const renderChart = () => {
    switch (activeCategory) {
      case 'revenue':
        return (
          <ComposedChart data={historicalData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="year" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickFormatter={(v) => `$${(v / 1e9).toFixed(0)}B`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
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
              dot={{ fill: '#f59e0b', r: 4 }}
            />
          </ComposedChart>
        );

      case 'profitability':
        return (
          <AreaChart data={historicalData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="opGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="year" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1e9).toFixed(0)}B`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="grossProfit"
              name="Gross Profit"
              stroke="#34d399"
              fill="url(#grossGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="operatingIncome"
              name="Operating Income"
              stroke="#22d3ee"
              fill="url(#opGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="netIncome"
              name="Net Income"
              stroke="#818cf8"
              fill="url(#netGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        );

      case 'margins':
        return (
          <LineChart data={historicalData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="year" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="grossMargin"
              name="Gross Margin"
              stroke="#34d399"
              strokeWidth={2}
              dot={{ fill: '#34d399', r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="operatingMargin"
              name="Operating Margin"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={{ fill: '#22d3ee', r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="netMargin"
              name="Net Margin"
              stroke="#818cf8"
              strokeWidth={2}
              dot={{ fill: '#818cf8', r: 4 }}
            />
          </LineChart>
        );

      case 'cashflow':
        return (
          <ComposedChart data={historicalData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="year" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1e9).toFixed(0)}B`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="fcf" name="Free Cash Flow" fill="#34d399" radius={[4, 4, 0, 0]} />
            <Bar dataKey="capex" name="CapEx" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="rnd"
              name="R&D"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 4 }}
            />
          </ComposedChart>
        );
    }
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const latest = historicalData[historicalData.length - 1];
    const oldest = historicalData[0];

    return {
      revenue: {
        current: latest.revenue,
        fiveYearAgo: oldest.revenue,
        cagr,
      },
      margins: {
        grossMargin: latest.grossMargin,
        opMargin: latest.operatingMargin,
        netMargin: latest.netMargin,
      },
    };
  }, [historicalData, cagr]);

  return (
    <div className={cn('bg-zinc-900/50 rounded-lg border border-zinc-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <History size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Historical Trends (5 Years)</h3>
          {company && <span className="text-xs text-zinc-500">{company.ticker}</span>}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500">Revenue CAGR:</span>
          <span className={cn('font-mono font-bold', cagr >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {cagr >= 0 ? '+' : ''}{cagr.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800 bg-zinc-900/30 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
              activeCategory === cat.id
                ? 'bg-cyan-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            )}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b border-zinc-800">
        <div className="text-center">
          <p className="text-xs text-zinc-500 uppercase">Current Revenue</p>
          <p className="text-lg font-mono font-bold text-emerald-400">
            ${(summaryStats.revenue.current / 1e9).toFixed(1)}B
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-500 uppercase">5Y CAGR</p>
          <p className={cn(
            'text-lg font-mono font-bold',
            cagr >= 0 ? 'text-emerald-400' : 'text-red-400'
          )}>
            {cagr >= 0 ? '+' : ''}{cagr.toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-500 uppercase">Gross Margin</p>
          <p className="text-lg font-mono font-bold text-cyan-400">
            {summaryStats.margins.grossMargin.toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-500 uppercase">Net Margin</p>
          <p className="text-lg font-mono font-bold text-purple-400">
            {summaryStats.margins.netMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto border-t border-zinc-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-3 py-2 text-left text-zinc-500 font-semibold">Year</th>
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">Revenue</th>
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">Growth</th>
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">Gross %</th>
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">Op %</th>
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">Net %</th>
            </tr>
          </thead>
          <tbody>
            {historicalData.map((row) => (
              <tr key={row.year} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="px-3 py-2 font-semibold text-zinc-200">{row.year}</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">
                  ${(row.revenue / 1e9).toFixed(1)}B
                </td>
                <td className={cn(
                  'px-3 py-2 text-right font-mono',
                  row.revenueGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {row.revenueGrowth >= 0 ? '+' : ''}{row.revenueGrowth.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">{row.grossMargin.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">{row.operatingMargin.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">{row.netMargin.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
