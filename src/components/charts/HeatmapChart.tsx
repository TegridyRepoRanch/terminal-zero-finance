// Heatmap Chart - Correlation & Sensitivity Matrix
import { useMemo, useState } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { calculateAllSchedules } from '../../lib/financial-logic';
import { cn } from '../../lib/utils';

interface HeatmapCell {
  x: number;
  y: number;
  xLabel: string;
  yLabel: string;
  xValue: number;
  yValue: number;
  value: number;
  percentChange: number;
}

interface AxisConfig {
  key: string;
  label: string;
  baseValue: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}

const availableAxes: Record<string, (base: number) => Omit<AxisConfig, 'baseValue'>> = {
  wacc: (base) => ({
    key: 'wacc',
    label: 'WACC',
    min: Math.max(5, base - 3),
    max: base + 3,
    step: 0.5,
    format: (v) => `${v.toFixed(1)}%`,
  }),
  terminalGrowthRate: (base) => ({
    key: 'terminalGrowthRate',
    label: 'Terminal Growth',
    min: Math.max(0, base - 1.5),
    max: Math.min(5, base + 1.5),
    step: 0.25,
    format: (v) => `${v.toFixed(2)}%`,
  }),
  revenueGrowthRate: (base) => ({
    key: 'revenueGrowthRate',
    label: 'Revenue Growth',
    min: Math.max(-5, base - 5),
    max: base + 5,
    step: 1,
    format: (v) => `${v.toFixed(0)}%`,
  }),
  cogsPercent: (base) => ({
    key: 'cogsPercent',
    label: 'COGS %',
    min: Math.max(30, base - 5),
    max: Math.min(90, base + 5),
    step: 1,
    format: (v) => `${v.toFixed(0)}%`,
  }),
  sgaPercent: (base) => ({
    key: 'sgaPercent',
    label: 'SG&A %',
    min: Math.max(5, base - 3),
    max: Math.min(40, base + 3),
    step: 0.5,
    format: (v) => `${v.toFixed(1)}%`,
  }),
};

interface HeatmapChartProps {
  className?: string;
}

export function HeatmapChart({ className }: HeatmapChartProps) {
  const { assumptions, valuation } = useFinanceStore();
  const [xAxis, setXAxis] = useState<string>('wacc');
  const [yAxis, setYAxis] = useState<string>('terminalGrowthRate');
  const [outputMetric, setOutputMetric] = useState<'sharePrice' | 'evMultiple'>('sharePrice');

  const baseValue = valuation.impliedSharePrice;

  const xConfig = useMemo<AxisConfig>(() => {
    const baseVal = assumptions[xAxis as keyof typeof assumptions] as number;
    return { ...availableAxes[xAxis](baseVal), baseValue: baseVal };
  }, [xAxis, assumptions]);

  const yConfig = useMemo<AxisConfig>(() => {
    const baseVal = assumptions[yAxis as keyof typeof assumptions] as number;
    return { ...availableAxes[yAxis](baseVal), baseValue: baseVal };
  }, [yAxis, assumptions]);

  const heatmapData = useMemo<HeatmapCell[][]>(() => {
    const xSteps: number[] = [];
    const ySteps: number[] = [];

    for (let x = xConfig.min; x <= xConfig.max; x += xConfig.step) {
      xSteps.push(Number(x.toFixed(2)));
    }
    for (let y = yConfig.min; y <= yConfig.max; y += yConfig.step) {
      ySteps.push(Number(y.toFixed(2)));
    }

    // Limit grid size for performance
    const maxSteps = 10;
    const xSampled = xSteps.length > maxSteps
      ? xSteps.filter((_, i) => i % Math.ceil(xSteps.length / maxSteps) === 0)
      : xSteps;
    const ySampled = ySteps.length > maxSteps
      ? ySteps.filter((_, i) => i % Math.ceil(ySteps.length / maxSteps) === 0)
      : ySteps;

    const matrix: HeatmapCell[][] = [];

    ySampled.forEach((yVal, yi) => {
      const row: HeatmapCell[] = [];
      xSampled.forEach((xVal, xi) => {
        try {
          const modifiedAssumptions = {
            ...assumptions,
            [xAxis]: xVal,
            [yAxis]: yVal,
          };

          const result = calculateAllSchedules(modifiedAssumptions);
          const value = outputMetric === 'sharePrice'
            ? result.valuation.impliedSharePrice
            : result.valuation.enterpriseValue / result.revenues[0];

          const percentChange = ((value - baseValue) / baseValue) * 100;

          row.push({
            x: xi,
            y: yi,
            xLabel: xConfig.format(xVal),
            yLabel: yConfig.format(yVal),
            xValue: xVal,
            yValue: yVal,
            value,
            percentChange,
          });
        } catch (e) {
          row.push({
            x: xi,
            y: yi,
            xLabel: xConfig.format(xVal),
            yLabel: yConfig.format(yVal),
            xValue: xVal,
            yValue: yVal,
            value: 0,
            percentChange: 0,
          });
        }
      });
      matrix.push(row);
    });

    return matrix;
  }, [assumptions, xAxis, yAxis, xConfig, yConfig, outputMetric, baseValue]);

  // Get color based on percent change from base
  const getCellColor = (percentChange: number): string => {
    if (percentChange > 30) return 'bg-emerald-500';
    if (percentChange > 20) return 'bg-emerald-600';
    if (percentChange > 10) return 'bg-emerald-700';
    if (percentChange > 5) return 'bg-emerald-800';
    if (percentChange > 0) return 'bg-emerald-900';
    if (percentChange > -5) return 'bg-red-900';
    if (percentChange > -10) return 'bg-red-800';
    if (percentChange > -20) return 'bg-red-700';
    if (percentChange > -30) return 'bg-red-600';
    return 'bg-red-500';
  };

  const isBaseCase = (xVal: number, yVal: number): boolean => {
    return Math.abs(xVal - xConfig.baseValue) < xConfig.step / 2 &&
           Math.abs(yVal - yConfig.baseValue) < yConfig.step / 2;
  };

  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  return (
    <div className={className}>
      <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
        {/* Header with controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-sm font-semibold text-zinc-300">Sensitivity Heatmap</h3>
          <div className="flex flex-wrap items-center gap-3">
            {/* X Axis selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">X-Axis:</label>
              <select
                value={xAxis}
                onChange={(e) => setXAxis(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {Object.entries(availableAxes).map(([key, config]) => (
                  <option key={key} value={key} disabled={key === yAxis}>
                    {config(0).label}
                  </option>
                ))}
              </select>
            </div>

            {/* Y Axis selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">Y-Axis:</label>
              <select
                value={yAxis}
                onChange={(e) => setYAxis(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {Object.entries(availableAxes).map(([key, config]) => (
                  <option key={key} value={key} disabled={key === xAxis}>
                    {config(0).label}
                  </option>
                ))}
              </select>
            </div>

            {/* Output metric toggle */}
            <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setOutputMetric('sharePrice')}
                className={cn(
                  'px-2 py-1 text-xs font-medium rounded transition-colors',
                  outputMetric === 'sharePrice'
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                Share Price
              </button>
              <button
                onClick={() => setOutputMetric('evMultiple')}
                className={cn(
                  'px-2 py-1 text-xs font-medium rounded transition-colors',
                  outputMetric === 'evMultiple'
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                EV/Revenue
              </button>
            </div>
          </div>
        </div>

        {/* Heatmap grid */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* X-axis label */}
            <div className="text-center text-xs text-zinc-400 mb-2">{xConfig.label}</div>

            <div className="flex">
              {/* Y-axis label */}
              <div className="flex items-center justify-center w-8 mr-2">
                <span className="transform -rotate-90 text-xs text-zinc-400 whitespace-nowrap">
                  {yConfig.label}
                </span>
              </div>

              <div className="flex-1">
                {/* X-axis headers */}
                <div className="flex mb-1">
                  <div className="w-12" /> {/* Spacer for Y labels */}
                  {heatmapData[0]?.map((cell, i) => (
                    <div
                      key={i}
                      className="flex-1 text-center text-[10px] text-zinc-400 font-mono px-1"
                    >
                      {cell.xLabel}
                    </div>
                  ))}
                </div>

                {/* Grid rows */}
                {heatmapData.map((row, yi) => (
                  <div key={yi} className="flex items-center">
                    {/* Y-axis label */}
                    <div className="w-12 text-right pr-2 text-[10px] text-zinc-400 font-mono">
                      {row[0]?.yLabel}
                    </div>

                    {/* Cells */}
                    {row.map((cell, xi) => (
                      <div
                        key={xi}
                        className={cn(
                          'flex-1 aspect-square m-0.5 rounded flex items-center justify-center cursor-pointer transition-all',
                          getCellColor(cell.percentChange),
                          isBaseCase(cell.xValue, cell.yValue) && 'ring-2 ring-cyan-400',
                          hoveredCell === cell && 'ring-2 ring-white scale-110 z-10'
                        )}
                        onMouseEnter={() => setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                        title={`${xConfig.format(cell.xValue)} / ${yConfig.format(cell.yValue)}: $${cell.value.toFixed(2)}`}
                      >
                        <span className="text-[9px] font-mono text-white/80">
                          {cell.value.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tooltip / Info panel */}
        <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg text-xs">
          {hoveredCell ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-zinc-400">{xConfig.label}:</span>{' '}
                <span className="text-zinc-200 font-mono">{hoveredCell.xLabel}</span>
                <span className="mx-2 text-zinc-600">|</span>
                <span className="text-zinc-400">{yConfig.label}:</span>{' '}
                <span className="text-zinc-200 font-mono">{hoveredCell.yLabel}</span>
              </div>
              <div>
                <span className="text-zinc-400">
                  {outputMetric === 'sharePrice' ? 'Share Price' : 'EV/Rev'}:
                </span>{' '}
                <span className="text-emerald-400 font-mono font-bold">
                  ${hoveredCell.value.toFixed(2)}
                </span>
                <span className={cn(
                  'ml-2 font-mono',
                  hoveredCell.percentChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  ({hoveredCell.percentChange >= 0 ? '+' : ''}{hoveredCell.percentChange.toFixed(1)}%)
                </span>
              </div>
            </div>
          ) : (
            <p className="text-zinc-400 text-center">
              Hover over cells to see detailed values. Base case highlighted with{' '}
              <span className="text-cyan-400">cyan border</span>.
            </p>
          )}
        </div>

        {/* Color legend */}
        <div className="mt-4 flex items-center justify-center gap-1">
          <span className="text-[10px] text-red-400 mr-1">-30%</span>
          <div className="w-4 h-3 bg-red-500 rounded" />
          <div className="w-4 h-3 bg-red-600 rounded" />
          <div className="w-4 h-3 bg-red-700 rounded" />
          <div className="w-4 h-3 bg-red-800 rounded" />
          <div className="w-4 h-3 bg-red-900 rounded" />
          <div className="w-4 h-3 bg-zinc-700 rounded" />
          <div className="w-4 h-3 bg-emerald-900 rounded" />
          <div className="w-4 h-3 bg-emerald-800 rounded" />
          <div className="w-4 h-3 bg-emerald-700 rounded" />
          <div className="w-4 h-3 bg-emerald-600 rounded" />
          <div className="w-4 h-3 bg-emerald-500 rounded" />
          <span className="text-[10px] text-emerald-400 ml-1">+30%</span>
        </div>
      </div>
    </div>
  );
}
