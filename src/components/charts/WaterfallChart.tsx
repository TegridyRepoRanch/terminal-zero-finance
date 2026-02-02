/* eslint-disable react-hooks/static-components */
// Waterfall Chart - Valuation Bridge Visualization
import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { useFinanceStore } from '../../store/useFinanceStore';

interface WaterfallDataPoint {
  name: string;
  value: number;
  start: number;
  end: number;
  fill: string;
  isTotal?: boolean;
}

interface WaterfallChartProps {
  className?: string;
  height?: number;
}

export function WaterfallChart({ className, height = 400 }: WaterfallChartProps) {
  const { valuation, assumptions, incomeStatement } = useFinanceStore();

  const waterfallData = useMemo<WaterfallDataPoint[]>(() => {
    // Get first year data
    const firstYear = incomeStatement[0];
    if (!firstYear) return [];

    // Build waterfall from Revenue to Equity Value
    const items: { name: string; value: number; isPositive: boolean; isTotal?: boolean }[] = [
      { name: 'Revenue', value: firstYear.revenue, isPositive: true, isTotal: true },
      { name: 'COGS', value: -firstYear.cogs, isPositive: false },
      { name: 'Gross Profit', value: firstYear.grossProfit, isPositive: true, isTotal: true },
      { name: 'SG&A', value: -(firstYear.revenue * assumptions.sgaPercent / 100), isPositive: false },
      { name: 'D&A', value: -firstYear.depreciation, isPositive: false },
      { name: 'EBIT', value: firstYear.ebit, isPositive: true, isTotal: true },
      { name: 'Taxes', value: -firstYear.taxes, isPositive: false },
      { name: 'Net Income', value: firstYear.netIncome, isPositive: true, isTotal: true },
    ];

    // Convert to waterfall format with running totals
    let runningTotal = 0;
    return items.map((item) => {
      const start = item.isTotal ? 0 : runningTotal;
      const end = item.isTotal ? item.value : runningTotal + item.value;
      runningTotal = item.isTotal ? item.value : end;

      return {
        name: item.name,
        value: Math.abs(item.value),
        start: Math.min(start, end) / 1e6,
        end: Math.max(start, end) / 1e6,
        fill: item.isTotal ? '#818cf8' : item.isPositive ? '#34d399' : '#f43f5e',
        isTotal: item.isTotal,
      };
    });
  }, [incomeStatement, assumptions]);

  // EV Bridge data
  const evBridgeData = useMemo<WaterfallDataPoint[]>(() => {
    const items: { name: string; value: number; isPositive: boolean; isTotal?: boolean }[] = [
      { name: 'PV of FCFs', value: valuation.sumPvUFCF, isPositive: true },
      { name: 'PV Terminal', value: valuation.pvTerminalValue, isPositive: true },
      { name: 'Enterprise Value', value: valuation.enterpriseValue, isPositive: true, isTotal: true },
      { name: 'Less: Net Debt', value: -assumptions.netDebt, isPositive: false },
      { name: 'Equity Value', value: valuation.equityValue, isPositive: true, isTotal: true },
    ];

    let runningTotal = 0;
    return items.map((item) => {
      const start = item.isTotal ? 0 : runningTotal;
      const end = item.isTotal ? item.value : runningTotal + item.value;
      runningTotal = item.isTotal ? item.value : end;

      return {
        name: item.name,
        value: Math.abs(item.value),
        start: Math.min(start, end) / 1e9,
        end: Math.max(start, end) / 1e9,
        fill: item.isTotal ? '#818cf8' : item.isPositive ? '#34d399' : '#f43f5e',
        isTotal: item.isTotal,
      };
    });
  }, [valuation, assumptions]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-sm font-semibold text-zinc-100">{label}</p>
        <p className="text-sm text-zinc-400">
          Value: <span className="text-emerald-400 font-mono">${data?.end?.toFixed(1)}B</span>
        </p>
      </div>
    );
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Statement Waterfall */}
        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Income Statement Bridge (Y1, $M)</h3>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                interval={0}
                height={60}
              />
              <YAxis
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#52525b" />
              <Bar dataKey="end" radius={[4, 4, 0, 0]}>
                {waterfallData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* EV Bridge Waterfall */}
        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Enterprise to Equity Bridge ($B)</h3>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={evBridgeData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                interval={0}
                height={60}
              />
              <YAxis
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                tickFormatter={(v) => `$${v.toFixed(1)}B`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#52525b" />
              <Bar dataKey="end" radius={[4, 4, 0, 0]}>
                {evBridgeData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#34d399]" />
          <span className="text-zinc-400">Positive</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#f43f5e]" />
          <span className="text-zinc-400">Negative</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#818cf8]" />
          <span className="text-zinc-400">Subtotal</span>
        </div>
      </div>
    </div>
  );
}
