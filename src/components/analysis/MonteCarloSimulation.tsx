// Monte Carlo Simulation - Valuation Range Analysis
import { useMemo, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useFinanceStore } from '../../store/useFinanceStore';
import { calculateAllSchedules } from '../../lib/financial-logic';
import { cn } from '../../lib/utils';
import { Dice6, Play, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';

interface SimulationResult {
  sharePrice: number;
  equityValue: number;
  enterpriseValue: number;
  inputs: {
    revenueGrowth: number;
    wacc: number;
    terminalGrowth: number;
    cogsPercent: number;
  };
}

interface DistributionBin {
  range: string;
  min: number;
  max: number;
  count: number;
  frequency: number;
}

// Random number from normal distribution (Box-Muller transform)
function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

interface MonteCarloSimulationProps {
  className?: string;
}

export function MonteCarloSimulation({ className }: MonteCarloSimulationProps) {
  const { assumptions, valuation, company } = useFinanceStore();
  const [isRunning, setIsRunning] = useState(false);
  const [simulations, setSimulations] = useState<SimulationResult[]>([]);
  const [numSimulations, setNumSimulations] = useState(1000);

  // Input parameter distributions (mean, std dev as % of mean)
  const [distributions, setDistributions] = useState({
    revenueGrowth: { stdDev: 20 }, // 20% std dev
    wacc: { stdDev: 10 },
    terminalGrowth: { stdDev: 15 },
    cogsPercent: { stdDev: 5 },
  });

  const baseSharePrice = valuation.impliedSharePrice;
  const marketPrice = company?.marketPrice || 0;

  // Run Monte Carlo simulation
  const runSimulation = useCallback(async () => {
    setIsRunning(true);
    const results: SimulationResult[] = [];

    // Run in batches to avoid blocking UI
    const batchSize = 100;
    const numBatches = Math.ceil(numSimulations / batchSize);

    for (let batch = 0; batch < numBatches; batch++) {
      await new Promise((resolve) => setTimeout(resolve, 0)); // Yield to UI

      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, numSimulations);

      for (let i = batchStart; i < batchEnd; i++) {
        // Sample from distributions
        const revenueGrowth = randomNormal(
          assumptions.revenueGrowthRate,
          assumptions.revenueGrowthRate * (distributions.revenueGrowth.stdDev / 100)
        );
        const wacc = Math.max(
          1,
          randomNormal(
            assumptions.wacc,
            assumptions.wacc * (distributions.wacc.stdDev / 100)
          )
        );
        const terminalGrowth = Math.max(
          0,
          Math.min(
            wacc - 0.5, // Must be less than WACC
            randomNormal(
              assumptions.terminalGrowthRate,
              assumptions.terminalGrowthRate * (distributions.terminalGrowth.stdDev / 100)
            )
          )
        );
        const cogsPercent = Math.max(
          10,
          Math.min(
            95,
            randomNormal(
              assumptions.cogsPercent,
              assumptions.cogsPercent * (distributions.cogsPercent.stdDev / 100)
            )
          )
        );

        try {
          const modifiedAssumptions = {
            ...assumptions,
            revenueGrowthRate: revenueGrowth,
            wacc,
            terminalGrowthRate: terminalGrowth,
            cogsPercent,
          };

          const result = calculateAllSchedules(modifiedAssumptions);

          // Skip invalid results
          if (
            !isFinite(result.valuation.impliedSharePrice) ||
            result.valuation.impliedSharePrice < 0 ||
            result.valuation.impliedSharePrice > baseSharePrice * 10
          ) {
            continue;
          }

          results.push({
            sharePrice: result.valuation.impliedSharePrice,
            equityValue: result.valuation.equityValue,
            enterpriseValue: result.valuation.enterpriseValue,
            inputs: { revenueGrowth, wacc, terminalGrowth, cogsPercent },
          });
        } catch {
          // Skip failed calculations
        }
      }
    }

    setSimulations(results);
    setIsRunning(false);
  }, [assumptions, numSimulations, distributions, baseSharePrice]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (simulations.length === 0) return null;

    const prices = simulations.map((s) => s.sharePrice).sort((a, b) => a - b);
    const n = prices.length;

    const mean = prices.reduce((a, b) => a + b, 0) / n;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const percentile = (p: number) => prices[Math.floor(n * p / 100)];

    return {
      mean,
      median: percentile(50),
      stdDev,
      min: prices[0],
      max: prices[n - 1],
      p5: percentile(5),
      p25: percentile(25),
      p75: percentile(75),
      p95: percentile(95),
      count: n,
      upside: ((mean - marketPrice) / marketPrice) * 100,
      probabilityAboveMarket: prices.filter((p) => p > marketPrice).length / n * 100,
    };
  }, [simulations, marketPrice]);

  // Create histogram data
  const histogramData = useMemo<DistributionBin[]>(() => {
    if (simulations.length === 0) return [];

    const prices = simulations.map((s) => s.sharePrice);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const binCount = 30;
    const binWidth = (max - min) / binCount;

    const bins: DistributionBin[] = [];
    for (let i = 0; i < binCount; i++) {
      const binMin = min + i * binWidth;
      const binMax = binMin + binWidth;
      const count = prices.filter((p) => p >= binMin && p < binMax).length;
      bins.push({
        range: `$${binMin.toFixed(0)}-${binMax.toFixed(0)}`,
        min: binMin,
        max: binMax,
        count,
        frequency: count / simulations.length,
      });
    }
    return bins;
  }, [simulations]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload as DistributionBin;

    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-sm font-semibold text-zinc-100">{data.range}</p>
        <p className="text-xs text-zinc-400">
          Count: <span className="text-emerald-400">{data.count}</span>
        </p>
        <p className="text-xs text-zinc-400">
          Frequency: <span className="text-cyan-400">{(data.frequency * 100).toFixed(1)}%</span>
        </p>
      </div>
    );
  };

  return (
    <div className={cn('bg-zinc-900/50 rounded-lg border border-zinc-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Dice6 size={16} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Monte Carlo Simulation</h3>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={numSimulations}
            onChange={(e) => setNumSimulations(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300"
            disabled={isRunning}
          >
            <option value={500}>500 runs</option>
            <option value={1000}>1,000 runs</option>
            <option value={5000}>5,000 runs</option>
            <option value={10000}>10,000 runs</option>
          </select>
          <button
            onClick={runSimulation}
            disabled={isRunning}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              isRunning
                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            )}
          >
            {isRunning ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play size={14} />
                Run Simulation
              </>
            )}
          </button>
        </div>
      </div>

      {/* Distribution Parameters */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
        <p className="text-xs text-zinc-500 mb-2">Input Uncertainty (Standard Deviation %)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(distributions).map(([key, dist]) => (
            <div key={key} className="flex items-center gap-2">
              <label className="text-xs text-zinc-400 flex-1 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}:
              </label>
              <input
                type="number"
                value={dist.stdDev}
                onChange={(e) =>
                  setDistributions((prev) => ({
                    ...prev,
                    [key]: { stdDev: Number(e.target.value) },
                  }))
                }
                className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 text-right"
                min={1}
                max={50}
              />
              <span className="text-xs text-zinc-500">%</span>
            </div>
          ))}
        </div>
      </div>

      {simulations.length > 0 && stats ? (
        <>
          {/* Statistics Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b border-zinc-800">
            <div className="text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Mean</p>
              <p className="text-lg font-mono font-bold text-emerald-400">${stats.mean.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Median</p>
              <p className="text-lg font-mono font-bold text-cyan-400">${stats.median.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Std Dev</p>
              <p className="text-lg font-mono font-bold text-zinc-300">${stats.stdDev.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Range (5-95%)</p>
              <p className="text-lg font-mono font-bold text-zinc-300">
                ${stats.p5.toFixed(0)} - ${stats.p95.toFixed(0)}
              </p>
            </div>
          </div>

          {/* Histogram */}
          <div className="p-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={histogramData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="min"
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  tickFormatter={(v) => `$${v.toFixed(0)}`}
                />
                <YAxis
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                {marketPrice > 0 && (
                  <ReferenceLine
                    x={marketPrice}
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    label={{ value: 'Market', fill: '#f59e0b', fontSize: 10 }}
                  />
                )}
                <ReferenceLine
                  x={stats.mean}
                  stroke="#34d399"
                  strokeWidth={2}
                  label={{ value: 'Mean', fill: '#34d399', fontSize: 10 }}
                />
                <Bar dataKey="frequency" fill="#818cf8" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Insights */}
          <div className="px-4 py-3 border-t border-zinc-800 space-y-2">
            {marketPrice > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp size={14} className={stats.upside >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                <span className="text-zinc-400">
                  Expected upside: {' '}
                  <span className={cn(
                    'font-mono font-bold',
                    stats.upside >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {stats.upside >= 0 ? '+' : ''}{stats.upside.toFixed(1)}%
                  </span>
                  {' '}from market price of ${marketPrice.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Dice6 size={14} className="text-purple-400" />
              <span className="text-zinc-400">
                Probability above market: {' '}
                <span className="font-mono font-bold text-cyan-400">
                  {stats.probabilityAboveMarket.toFixed(1)}%
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="text-zinc-400">
                90% confidence interval: {' '}
                <span className="font-mono text-zinc-200">
                  ${stats.p5.toFixed(2)} - ${stats.p95.toFixed(2)}
                </span>
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="p-8 text-center">
          <Dice6 size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-400">Run simulation to see valuation distribution</p>
          <p className="text-xs text-zinc-500 mt-1">
            Adjust uncertainty parameters above and click "Run Simulation"
          </p>
        </div>
      )}
    </div>
  );
}
