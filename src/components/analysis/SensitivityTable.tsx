// Sensitivity Analysis Table - WACC vs Terminal Growth Matrix
import { useMemo, useState } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { calculateAllSchedules } from '../../lib/financial-logic';
import { cn } from '../../lib/utils';
import { Table, Download } from 'lucide-react';

interface SensitivityTableProps {
  className?: string;
}

export function SensitivityTable({ className }: SensitivityTableProps) {
  const { assumptions, valuation, company } = useFinanceStore();
  const [outputMetric, setOutputMetric] = useState<'sharePrice' | 'equityValue' | 'evRevenue'>('sharePrice');

  const baseSharePrice = valuation.impliedSharePrice;
  const marketPrice = company?.marketPrice || 0;

  // Generate WACC range (current ± 2%, in 0.5% increments)
  const waccValues = useMemo(() => {
    const base = assumptions.wacc;
    const values: number[] = [];
    for (let delta = -2; delta <= 2; delta += 0.5) {
      const val = base + delta;
      if (val > 0) values.push(Number(val.toFixed(1)));
    }
    return values;
  }, [assumptions.wacc]);

  // Generate Terminal Growth range (current ± 1%, in 0.25% increments)
  const terminalGrowthValues = useMemo(() => {
    const base = assumptions.terminalGrowthRate;
    const values: number[] = [];
    for (let delta = -1; delta <= 1; delta += 0.25) {
      const val = base + delta;
      if (val >= 0 && val < assumptions.wacc) values.push(Number(val.toFixed(2)));
    }
    return values;
  }, [assumptions.terminalGrowthRate, assumptions.wacc]);

  // Calculate sensitivity matrix
  const sensitivityMatrix = useMemo(() => {
    const matrix: number[][] = [];

    terminalGrowthValues.forEach((tg) => {
      const row: number[] = [];
      waccValues.forEach((wacc) => {
        // Skip invalid combinations (WACC must be > terminal growth)
        if (wacc <= tg) {
          row.push(NaN);
          return;
        }

        try {
          const modifiedAssumptions = {
            ...assumptions,
            wacc,
            terminalGrowthRate: tg,
          };
          const result = calculateAllSchedules(modifiedAssumptions);

          let value: number;
          if (outputMetric === 'sharePrice') {
            value = result.valuation.impliedSharePrice;
          } else if (outputMetric === 'equityValue') {
            value = result.valuation.equityValue / 1e9;
          } else {
            value = result.valuation.enterpriseValue / result.revenues[0];
          }
          row.push(value);
        } catch {
          row.push(NaN);
        }
      });
      matrix.push(row);
    });

    return matrix;
  }, [assumptions, waccValues, terminalGrowthValues, outputMetric]);

  // Get cell color based on value relative to base
  const getCellColor = (value: number): string => {
    if (isNaN(value)) return 'bg-zinc-800/50';

    const baseValue = outputMetric === 'sharePrice' ? baseSharePrice :
                      outputMetric === 'equityValue' ? valuation.equityValue / 1e9 :
                      valuation.enterpriseValue / assumptions.baseRevenue;

    const percentChange = ((value - baseValue) / baseValue) * 100;

    if (percentChange > 20) return 'bg-emerald-600/60';
    if (percentChange > 10) return 'bg-emerald-700/50';
    if (percentChange > 5) return 'bg-emerald-800/40';
    if (percentChange > 0) return 'bg-emerald-900/30';
    if (percentChange > -5) return 'bg-red-900/30';
    if (percentChange > -10) return 'bg-red-800/40';
    if (percentChange > -20) return 'bg-red-700/50';
    return 'bg-red-600/60';
  };

  // Check if cell is base case
  const isBaseCase = (waccIdx: number, tgIdx: number): boolean => {
    return waccValues[waccIdx] === assumptions.wacc &&
           terminalGrowthValues[tgIdx] === assumptions.terminalGrowthRate;
  };

  // Export to CSV
  const exportToCSV = () => {
    let csv = 'WACC \\ Terminal Growth,';
    csv += terminalGrowthValues.map((tg) => `${tg}%`).join(',') + '\n';

    waccValues.forEach((wacc, waccIdx) => {
      csv += `${wacc}%,`;
      csv += sensitivityMatrix.map((row) => {
        const val = row[waccIdx];
        return isNaN(val) ? 'N/A' : val.toFixed(2);
      }).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensitivity-${company?.ticker || 'analysis'}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatValue = (val: number): string => {
    if (isNaN(val)) return 'N/A';
    if (outputMetric === 'sharePrice') return `$${val.toFixed(2)}`;
    if (outputMetric === 'equityValue') return `$${val.toFixed(1)}B`;
    return `${val.toFixed(2)}x`;
  };

  return (
    <div className={cn('bg-zinc-900/50 rounded-lg border border-zinc-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Table size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Sensitivity Analysis</h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Metric Toggle */}
          <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
            {[
              { id: 'sharePrice', label: 'Share Price' },
              { id: 'equityValue', label: 'Equity ($B)' },
              { id: 'evRevenue', label: 'EV/Rev' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setOutputMetric(opt.id as typeof outputMetric)}
                className={cn(
                  'px-2 py-1 text-xs font-medium rounded transition-colors',
                  outputMetric === opt.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportToCSV}
            className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Export to CSV"
            aria-label="Export sensitivity table to CSV"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Market Price Comparison */}
      {marketPrice > 0 && outputMetric === 'sharePrice' && (
        <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/30 text-xs">
          <span className="text-zinc-500">Market Price: </span>
          <span className="text-zinc-200 font-mono">${marketPrice.toFixed(2)}</span>
          <span className="mx-2 text-zinc-600">|</span>
          <span className="text-zinc-500">Base Case: </span>
          <span className="text-emerald-400 font-mono">${baseSharePrice.toFixed(2)}</span>
          <span className={cn(
            'ml-2 font-mono',
            baseSharePrice > marketPrice ? 'text-emerald-400' : 'text-red-400'
          )}>
            ({baseSharePrice > marketPrice ? '+' : ''}{((baseSharePrice - marketPrice) / marketPrice * 100).toFixed(1)}%)
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto p-4">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr>
              <th className="px-2 py-2 text-left text-zinc-500 font-semibold border-b border-zinc-800">
                WACC ↓ \ TG →
              </th>
              {terminalGrowthValues.map((tg) => (
                <th
                  key={tg}
                  className={cn(
                    'px-3 py-2 text-center border-b border-zinc-800',
                    tg === assumptions.terminalGrowthRate ? 'text-cyan-400 font-bold' : 'text-zinc-400'
                  )}
                >
                  {tg.toFixed(2)}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {waccValues.map((wacc, waccIdx) => (
              <tr key={wacc}>
                <td className={cn(
                  'px-2 py-2 text-left border-r border-zinc-800',
                  wacc === assumptions.wacc ? 'text-cyan-400 font-bold' : 'text-zinc-400'
                )}>
                  {wacc.toFixed(1)}%
                </td>
                {terminalGrowthValues.map((tg, tgIdx) => {
                  const value = sensitivityMatrix[tgIdx]?.[waccIdx];
                  const isBase = isBaseCase(waccIdx, tgIdx);

                  return (
                    <td
                      key={tg}
                      className={cn(
                        'px-3 py-2 text-center transition-colors',
                        getCellColor(value),
                        isBase && 'ring-2 ring-cyan-400 ring-inset',
                        'hover:ring-2 hover:ring-zinc-500'
                      )}
                    >
                      <span className={cn(
                        isBase ? 'text-white font-bold' : 'text-zinc-200'
                      )}>
                        {formatValue(value)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="text-zinc-500">Color indicates % change from base case</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-3 bg-red-600/60 rounded" />
            <span className="text-zinc-500">-20%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-3 bg-zinc-700 rounded" />
            <span className="text-zinc-500">Base</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-3 bg-emerald-600/60 rounded" />
            <span className="text-zinc-500">+20%</span>
          </div>
        </div>
        <span className="text-cyan-400">Base case highlighted</span>
      </div>
    </div>
  );
}
