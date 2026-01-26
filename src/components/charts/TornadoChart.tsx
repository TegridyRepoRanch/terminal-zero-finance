// Tornado Chart - Sensitivity Analysis Visualization
import { useMemo, useState } from 'react';
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
import { calculateAllSchedules } from '../../lib/financial-logic';
import { cn } from '../../lib/utils';

interface SensitivityDriver {
  name: string;
  key: keyof typeof sensitivityRanges;
  lowValue: number;
  highValue: number;
  lowImpact: number;
  highImpact: number;
  baseValue: number;
}

// Define sensitivity ranges for each driver (as percentage change from base)
const sensitivityRanges = {
  revenueGrowthRate: { low: -25, high: 25, unit: '%', label: 'Revenue Growth' },
  wacc: { low: -20, high: 20, unit: '%', label: 'WACC' },
  terminalGrowthRate: { low: -30, high: 30, unit: '%', label: 'Terminal Growth' },
  cogsPercent: { low: -10, high: 10, unit: '%', label: 'COGS %' },
  sgaPercent: { low: -15, high: 15, unit: '%', label: 'SG&A %' },
  taxRate: { low: -20, high: 20, unit: '%', label: 'Tax Rate' },
  capexPercent: { low: -25, high: 25, unit: '%', label: 'CapEx %' },
};

interface TornadoChartProps {
  className?: string;
  height?: number;
}

export function TornadoChart({ className, height = 450 }: TornadoChartProps) {
  const { assumptions, valuation } = useFinanceStore();
  const [selectedMetric, setSelectedMetric] = useState<'sharePrice' | 'equityValue'>('sharePrice');

  const baseValue = selectedMetric === 'sharePrice'
    ? valuation.impliedSharePrice
    : valuation.equityValue / 1e9;

  const sensitivityData = useMemo<SensitivityDriver[]>(() => {
    const drivers: SensitivityDriver[] = [];

    Object.entries(sensitivityRanges).forEach(([key, range]) => {
      const typedKey = key as keyof typeof sensitivityRanges;
      const baseAssumptionValue = assumptions[typedKey as keyof typeof assumptions] as number;

      // Calculate low scenario
      const lowAssumptions = { ...assumptions };
      const lowValue = baseAssumptionValue * (1 + range.low / 100);
      (lowAssumptions as any)[key] = lowValue;

      // Calculate high scenario
      const highAssumptions = { ...assumptions };
      const highValue = baseAssumptionValue * (1 + range.high / 100);
      (highAssumptions as any)[key] = highValue;

      try {
        const lowResult = calculateAllSchedules(lowAssumptions);
        const highResult = calculateAllSchedules(highAssumptions);

        const lowImpact = selectedMetric === 'sharePrice'
          ? lowResult.valuation.impliedSharePrice - baseValue
          : lowResult.valuation.equityValue / 1e9 - baseValue;

        const highImpact = selectedMetric === 'sharePrice'
          ? highResult.valuation.impliedSharePrice - baseValue
          : highResult.valuation.equityValue / 1e9 - baseValue;

        drivers.push({
          name: range.label,
          key: typedKey,
          lowValue,
          highValue,
          lowImpact,
          highImpact,
          baseValue: baseAssumptionValue,
        });
      } catch (e) {
        // Skip if calculation fails (e.g., invalid assumptions)
      }
    });

    // Sort by total impact range (largest impact first)
    return drivers.sort((a, b) => {
      const rangeA = Math.abs(a.highImpact - a.lowImpact);
      const rangeB = Math.abs(b.highImpact - b.lowImpact);
      return rangeB - rangeA;
    });
  }, [assumptions, selectedMetric, baseValue]);

  // Transform data for the tornado chart
  const chartData = useMemo(() => {
    return sensitivityData.map((driver) => ({
      name: driver.name,
      low: Math.min(driver.lowImpact, driver.highImpact),
      high: Math.max(driver.lowImpact, driver.highImpact),
      lowAbs: driver.lowImpact,
      highAbs: driver.highImpact,
      range: Math.abs(driver.highImpact - driver.lowImpact),
    }));
  }, [sensitivityData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    const driver = sensitivityData.find((d) => d.name === label);

    const formatValue = (v: number) => {
      if (selectedMetric === 'sharePrice') {
        return `$${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
      }
      return `$${v >= 0 ? '+' : ''}${v.toFixed(2)}B`;
    };

    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-lg max-w-xs">
        <p className="text-sm font-semibold text-zinc-100 mb-1">{label}</p>
        <div className="text-xs space-y-1">
          <p className="text-zinc-400">
            Base: <span className="text-zinc-200">{driver?.baseValue?.toFixed(2)}</span>
          </p>
          <p className="text-red-400">
            Low scenario: <span className="font-mono">{formatValue(data?.lowAbs)}</span>
          </p>
          <p className="text-emerald-400">
            High scenario: <span className="font-mono">{formatValue(data?.highAbs)}</span>
          </p>
          <p className="text-cyan-400">
            Total range: <span className="font-mono">${data?.range?.toFixed(2)}{selectedMetric === 'equityValue' ? 'B' : ''}</span>
          </p>
        </div>
      </div>
    );
  };

  const maxRange = Math.max(...chartData.map((d) => Math.max(Math.abs(d.low), Math.abs(d.high))));
  const domainPadding = maxRange * 0.1;

  return (
    <div className={className}>
      <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
        {/* Header with metric toggle */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-300">Sensitivity Analysis (Tornado Chart)</h3>
          <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setSelectedMetric('sharePrice')}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded transition-colors',
                selectedMetric === 'sharePrice'
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Share Price
            </button>
            <button
              onClick={() => setSelectedMetric('equityValue')}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded transition-colors',
                selectedMetric === 'equityValue'
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Equity Value
            </button>
          </div>
        </div>

        {/* Base value indicator */}
        <div className="text-center mb-4">
          <span className="text-xs text-zinc-500">Base Case: </span>
          <span className="text-sm font-mono text-emerald-400">
            ${selectedMetric === 'sharePrice' ? baseValue.toFixed(2) : `${baseValue.toFixed(2)}B`}
          </span>
        </div>

        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 20, right: 40, left: 100, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickFormatter={(v) => `${v >= 0 ? '+' : ''}$${v.toFixed(0)}${selectedMetric === 'equityValue' ? 'B' : ''}`}
              domain={[-maxRange - domainPadding, maxRange + domainPadding]}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#fafafa', fontSize: 12, fontWeight: 500 }}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={0} stroke="#52525b" strokeWidth={2} />

            {/* Low impact bars (negative side) */}
            <Bar dataKey="low" stackId="a" radius={[4, 0, 0, 4]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.low < 0 ? '#f43f5e' : '#34d399'} />
              ))}
            </Bar>

            {/* High impact bars (positive side) */}
            <Bar dataKey="high" stackId="b" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.high > 0 ? '#34d399' : '#f43f5e'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#f43f5e]" />
            <span className="text-zinc-400">Decreases Value</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#34d399]" />
            <span className="text-zinc-400">Increases Value</span>
          </div>
        </div>

        {/* Insight text */}
        <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg text-xs text-zinc-400">
          <strong className="text-zinc-300">Key Insight:</strong>{' '}
          {sensitivityData[0] && (
            <>
              <span className="text-cyan-400">{sensitivityData[0].name}</span> has the largest impact on valuation,
              with a total range of{' '}
              <span className="text-emerald-400 font-mono">
                ${Math.abs(sensitivityData[0].highImpact - sensitivityData[0].lowImpact).toFixed(2)}
                {selectedMetric === 'equityValue' ? 'B' : ''}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
