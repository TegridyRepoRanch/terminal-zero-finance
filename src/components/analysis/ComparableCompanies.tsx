// Comparable Companies Analysis Module
import { useMemo, useState } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { cn } from '../../lib/utils';
import { Building2, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Sample comparable companies data (in real app, this would come from an API)
const SAMPLE_COMPS: CompData[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', marketCap: 2800, evRevenue: 7.2, evEbitda: 22.5, peRatio: 28.5, revenueGrowth: 8.2, grossMargin: 43.5, netMargin: 25.1 },
  { ticker: 'MSFT', name: 'Microsoft Corp', sector: 'Technology', marketCap: 2600, evRevenue: 11.8, evEbitda: 24.3, peRatio: 32.1, revenueGrowth: 12.5, grossMargin: 69.8, netMargin: 34.2 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', marketCap: 1700, evRevenue: 5.8, evEbitda: 16.2, peRatio: 23.8, revenueGrowth: 15.3, grossMargin: 56.4, netMargin: 24.1 },
  { ticker: 'META', name: 'Meta Platforms', sector: 'Technology', marketCap: 1250, evRevenue: 8.5, evEbitda: 18.5, peRatio: 25.2, revenueGrowth: 18.5, grossMargin: 81.2, netMargin: 28.5 },
  { ticker: 'NVDA', name: 'NVIDIA Corp', sector: 'Technology', marketCap: 1200, evRevenue: 22.5, evEbitda: 45.2, peRatio: 55.8, revenueGrowth: 122.3, grossMargin: 72.8, netMargin: 48.2 },
  { ticker: 'AMZN', name: 'Amazon.com', sector: 'Consumer Discretionary', marketCap: 1600, evRevenue: 2.8, evEbitda: 15.8, peRatio: 42.5, revenueGrowth: 12.8, grossMargin: 46.5, netMargin: 6.2 },
  { ticker: 'CRM', name: 'Salesforce', sector: 'Technology', marketCap: 250, evRevenue: 7.5, evEbitda: 28.5, peRatio: 45.2, revenueGrowth: 11.2, grossMargin: 75.2, netMargin: 12.5 },
  { ticker: 'ADBE', name: 'Adobe Inc.', sector: 'Technology', marketCap: 220, evRevenue: 12.5, evEbitda: 25.8, peRatio: 38.5, revenueGrowth: 10.5, grossMargin: 88.2, netMargin: 28.8 },
];

interface CompData {
  ticker: string;
  name: string;
  sector: string;
  marketCap: number; // in billions
  evRevenue: number;
  evEbitda: number;
  peRatio: number;
  revenueGrowth: number;
  grossMargin: number;
  netMargin: number;
}

interface ComparableCompaniesProps {
  className?: string;
}

export function ComparableCompanies({ className }: ComparableCompaniesProps) {
  const { assumptions, valuation, incomeStatement, company } = useFinanceStore();
  const [selectedComps, setSelectedComps] = useState<string[]>(['AAPL', 'MSFT', 'GOOGL', 'META']);
  const [showAddModal, setShowAddModal] = useState(false);

  // Calculate implied metrics for target company
  const targetMetrics = useMemo(() => {
    const firstYear = incomeStatement[0];
    if (!firstYear) return null;

    const revenue = firstYear.revenue;
    const ebitda = firstYear.ebit + (firstYear.depreciation || 0);
    const netIncome = firstYear.netIncome;

    return {
      ticker: company?.ticker || 'TARGET',
      name: company?.name || 'Target Company',
      sector: company?.sector || 'Technology',
      marketCap: valuation.equityValue / 1e9,
      evRevenue: valuation.enterpriseValue / revenue,
      evEbitda: valuation.enterpriseValue / ebitda,
      peRatio: valuation.equityValue / netIncome,
      revenueGrowth: assumptions.revenueGrowthRate,
      grossMargin: (firstYear.grossProfit / revenue) * 100,
      netMargin: (netIncome / revenue) * 100,
    };
  }, [assumptions, valuation, incomeStatement, company]);

  // Get selected comp data
  const selectedCompData = useMemo(() => {
    return SAMPLE_COMPS.filter((c) => selectedComps.includes(c.ticker));
  }, [selectedComps]);

  // Calculate median and mean of selected comps
  const compStats = useMemo(() => {
    if (selectedCompData.length === 0) return null;

    const calcMedian = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    const calcMean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      evRevenue: {
        median: calcMedian(selectedCompData.map((c) => c.evRevenue)),
        mean: calcMean(selectedCompData.map((c) => c.evRevenue)),
      },
      evEbitda: {
        median: calcMedian(selectedCompData.map((c) => c.evEbitda)),
        mean: calcMean(selectedCompData.map((c) => c.evEbitda)),
      },
      peRatio: {
        median: calcMedian(selectedCompData.map((c) => c.peRatio)),
        mean: calcMean(selectedCompData.map((c) => c.peRatio)),
      },
      revenueGrowth: {
        median: calcMedian(selectedCompData.map((c) => c.revenueGrowth)),
        mean: calcMean(selectedCompData.map((c) => c.revenueGrowth)),
      },
      grossMargin: {
        median: calcMedian(selectedCompData.map((c) => c.grossMargin)),
        mean: calcMean(selectedCompData.map((c) => c.grossMargin)),
      },
    };
  }, [selectedCompData]);

  // Calculate implied valuations from comps
  const impliedValuations = useMemo(() => {
    if (!compStats || !targetMetrics) return null;

    const firstYear = incomeStatement[0];
    if (!firstYear) return null;

    const revenue = firstYear.revenue;
    const ebitda = firstYear.ebit + (firstYear.depreciation || 0);
    const netIncome = firstYear.netIncome;

    return {
      evRevenueMedian: (revenue * compStats.evRevenue.median) / 1e9,
      evRevenueMean: (revenue * compStats.evRevenue.mean) / 1e9,
      evEbitdaMedian: (ebitda * compStats.evEbitda.median) / 1e9,
      evEbitdaMean: (ebitda * compStats.evEbitda.mean) / 1e9,
      peMedian: (netIncome * compStats.peRatio.median) / 1e9,
      peMean: (netIncome * compStats.peRatio.mean) / 1e9,
    };
  }, [compStats, targetMetrics, incomeStatement]);

  const toggleComp = (ticker: string) => {
    setSelectedComps((prev) =>
      prev.includes(ticker)
        ? prev.filter((t) => t !== ticker)
        : [...prev, ticker]
    );
  };

  const getComparisonIcon = (targetVal: number, compVal: number) => {
    const diff = ((targetVal - compVal) / compVal) * 100;
    if (diff > 10) return <TrendingUp size={12} className="text-emerald-400" />;
    if (diff < -10) return <TrendingDown size={12} className="text-red-400" />;
    return <Minus size={12} className="text-zinc-500" />;
  };

  return (
    <div className={cn('bg-zinc-900/50 rounded-lg border border-zinc-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Comparable Companies Analysis</h3>
        </div>
        <button
          onClick={() => setShowAddModal(!showAddModal)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded transition-colors"
        >
          <Plus size={12} />
          Add Comps
        </button>
      </div>

      {/* Comp Selector (inline) */}
      <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/30">
        <div className="flex flex-wrap gap-2">
          {SAMPLE_COMPS.map((comp) => (
            <button
              key={comp.ticker}
              onClick={() => toggleComp(comp.ticker)}
              className={cn(
                'px-2 py-1 text-xs rounded border transition-colors',
                selectedComps.includes(comp.ticker)
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'
              )}
            >
              {comp.ticker}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-3 py-2 text-left text-zinc-500 font-semibold">Company</th>
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">Mkt Cap ($B)</th>
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">EV/Rev</th>
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">EV/EBITDA</th>
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">P/E</th>
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">Rev Growth</th>
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">Gross Margin</th>
            </tr>
          </thead>
          <tbody>
            {/* Target Company Row */}
            {targetMetrics && (
              <tr className="border-b border-zinc-700 bg-emerald-950/20">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-400">{targetMetrics.ticker}</span>
                    <span className="text-zinc-500">(Target)</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono text-emerald-400">
                  ${targetMetrics.marketCap.toFixed(1)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-zinc-200">
                  {targetMetrics.evRevenue.toFixed(1)}x
                </td>
                <td className="px-3 py-2 text-right font-mono text-zinc-200">
                  {targetMetrics.evEbitda.toFixed(1)}x
                </td>
                <td className="px-3 py-2 text-right font-mono text-zinc-200">
                  {targetMetrics.peRatio.toFixed(1)}x
                </td>
                <td className="px-3 py-2 text-right font-mono text-zinc-200">
                  {targetMetrics.revenueGrowth.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right font-mono text-zinc-200">
                  {targetMetrics.grossMargin.toFixed(1)}%
                </td>
              </tr>
            )}

            {/* Comp Rows */}
            {selectedCompData.map((comp) => (
              <tr key={comp.ticker} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200">{comp.ticker}</span>
                    <span className="text-zinc-500 text-[10px]">{comp.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">${comp.marketCap.toFixed(0)}</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">
                  <span className="flex items-center justify-end gap-1">
                    {comp.evRevenue.toFixed(1)}x
                    {targetMetrics && getComparisonIcon(targetMetrics.evRevenue, comp.evRevenue)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">{comp.evEbitda.toFixed(1)}x</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">{comp.peRatio.toFixed(1)}x</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">{comp.revenueGrowth.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">{comp.grossMargin.toFixed(1)}%</td>
              </tr>
            ))}

            {/* Statistics Rows */}
            {compStats && (
              <>
                <tr className="border-t border-zinc-700 bg-zinc-800/50">
                  <td className="px-3 py-2 font-semibold text-cyan-400">Median</td>
                  <td className="px-3 py-2 text-right text-zinc-500">-</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-cyan-400">
                    {compStats.evRevenue.median.toFixed(1)}x
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-cyan-400">
                    {compStats.evEbitda.median.toFixed(1)}x
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-cyan-400">
                    {compStats.peRatio.median.toFixed(1)}x
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-cyan-400">
                    {compStats.revenueGrowth.median.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-cyan-400">
                    {compStats.grossMargin.median.toFixed(1)}%
                  </td>
                </tr>
                <tr className="bg-zinc-800/30">
                  <td className="px-3 py-2 font-semibold text-zinc-400">Mean</td>
                  <td className="px-3 py-2 text-right text-zinc-500">-</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-400">
                    {compStats.evRevenue.mean.toFixed(1)}x
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-400">
                    {compStats.evEbitda.mean.toFixed(1)}x
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-400">
                    {compStats.peRatio.mean.toFixed(1)}x
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-400">
                    {compStats.revenueGrowth.mean.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-400">
                    {compStats.grossMargin.mean.toFixed(1)}%
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Implied Valuations */}
      {impliedValuations && (
        <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/30">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Implied Valuation (EV, $B)</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-zinc-400">EV/Revenue (Median)</p>
              <p className="text-lg font-mono font-bold text-emerald-400">
                ${impliedValuations.evRevenueMedian.toFixed(1)}B
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">EV/EBITDA (Median)</p>
              <p className="text-lg font-mono font-bold text-cyan-400">
                ${impliedValuations.evEbitdaMedian.toFixed(1)}B
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">P/E (Median)</p>
              <p className="text-lg font-mono font-bold text-purple-400">
                ${impliedValuations.peMedian.toFixed(1)}B
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
