// Precedent Transactions Analysis Module
import { useMemo, useState } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { cn } from '../../lib/utils';
import { Briefcase, Calendar, TrendingUp, Filter } from 'lucide-react';

// Sample precedent transactions data
const PRECEDENT_TRANSACTIONS: TransactionData[] = [
  {
    id: 1,
    date: '2024-03',
    acquirer: 'Microsoft',
    target: 'Activision Blizzard',
    sector: 'Gaming',
    dealValue: 68.7,
    evRevenue: 8.5,
    evEbitda: 22.5,
    premium: 45.2,
    description: 'Gaming consolidation play',
  },
  {
    id: 2,
    date: '2023-10',
    acquirer: 'Cisco',
    target: 'Splunk',
    sector: 'Enterprise Software',
    dealValue: 28.0,
    evRevenue: 7.2,
    evEbitda: 45.5,
    premium: 31.0,
    description: 'Security & observability expansion',
  },
  {
    id: 3,
    date: '2023-08',
    acquirer: 'Broadcom',
    target: 'VMware',
    sector: 'Enterprise Software',
    dealValue: 61.0,
    evRevenue: 4.8,
    evEbitda: 18.2,
    premium: 44.0,
    description: 'Infrastructure software consolidation',
  },
  {
    id: 4,
    date: '2023-05',
    acquirer: 'Adobe',
    target: 'Figma',
    sector: 'Design Software',
    dealValue: 20.0,
    evRevenue: 50.0,
    evEbitda: 0,
    premium: 0,
    description: 'Design tool acquisition (pending)',
  },
  {
    id: 5,
    date: '2022-10',
    acquirer: 'Elon Musk',
    target: 'Twitter',
    sector: 'Social Media',
    dealValue: 44.0,
    evRevenue: 9.2,
    evEbitda: 0,
    premium: 38.0,
    description: 'Social media privatization',
  },
  {
    id: 6,
    date: '2022-01',
    acquirer: 'Microsoft',
    target: 'Nuance',
    sector: 'Healthcare AI',
    dealValue: 19.7,
    evRevenue: 11.5,
    evEbitda: 35.2,
    premium: 23.0,
    description: 'Healthcare AI/voice recognition',
  },
  {
    id: 7,
    date: '2021-09',
    acquirer: 'Salesforce',
    target: 'Slack',
    sector: 'Enterprise Software',
    dealValue: 27.7,
    evRevenue: 26.5,
    evEbitda: 0,
    premium: 55.0,
    description: 'Workplace collaboration',
  },
  {
    id: 8,
    date: '2021-05',
    acquirer: 'Amazon',
    target: 'MGM',
    sector: 'Entertainment',
    dealValue: 8.45,
    evRevenue: 6.2,
    evEbitda: 15.5,
    premium: 0,
    description: 'Content library acquisition',
  },
  {
    id: 9,
    date: '2020-12',
    acquirer: 'Salesforce',
    target: 'Tableau',
    sector: 'Analytics',
    dealValue: 15.7,
    evRevenue: 10.8,
    evEbitda: 0,
    premium: 42.0,
    description: 'Data visualization platform',
  },
  {
    id: 10,
    date: '2020-09',
    acquirer: 'NVIDIA',
    target: 'ARM',
    sector: 'Semiconductors',
    dealValue: 40.0,
    evRevenue: 21.5,
    evEbitda: 55.0,
    premium: 0,
    description: 'Chip architecture (blocked)',
  },
];

interface TransactionData {
  id: number;
  date: string;
  acquirer: string;
  target: string;
  sector: string;
  dealValue: number; // in billions
  evRevenue: number;
  evEbitda: number;
  premium: number;
  description: string;
}

const SECTORS = [...new Set(PRECEDENT_TRANSACTIONS.map((t) => t.sector))];

interface PrecedentTransactionsProps {
  className?: string;
}

type SortColumn = 'date' | 'dealValue' | 'evRevenue' | 'premium';

// SortHeader component - moved outside to avoid re-creation during render
function SortHeader({
  column,
  label,
  sortBy,
  sortDesc,
  onSort,
}: {
  column: SortColumn;
  label: string;
  sortBy: SortColumn;
  sortDesc: boolean;
  onSort: (column: SortColumn) => void;
}) {
  return (
    <th
      className="px-3 py-2 text-right text-zinc-500 font-semibold cursor-pointer hover:text-zinc-300 transition-colors"
      onClick={() => onSort(column)}
    >
      <span className="flex items-center justify-end gap-1">
        {label}
        {sortBy === column && (
          <span className="text-cyan-400">{sortDesc ? '↓' : '↑'}</span>
        )}
      </span>
    </th>
  );
}

export function PrecedentTransactions({ className }: PrecedentTransactionsProps) {
  const { incomeStatement } = useFinanceStore();
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortColumn>('date');
  const [sortDesc, setSortDesc] = useState(true);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let txns = [...PRECEDENT_TRANSACTIONS];

    // Filter by sector
    if (selectedSectors.length > 0) {
      txns = txns.filter((t) => selectedSectors.includes(t.sector));
    }

    // Sort
    txns.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = a.date.localeCompare(b.date);
          break;
        case 'dealValue':
          comparison = a.dealValue - b.dealValue;
          break;
        case 'evRevenue':
          comparison = a.evRevenue - b.evRevenue;
          break;
        case 'premium':
          comparison = a.premium - b.premium;
          break;
      }
      return sortDesc ? -comparison : comparison;
    });

    return txns;
  }, [selectedSectors, sortBy, sortDesc]);

  // Calculate statistics
  const stats = useMemo(() => {
    const txns = filteredTransactions.filter((t) => t.evRevenue > 0);
    if (txns.length === 0) return null;

    const calcMedian = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    const evRevenues = txns.map((t) => t.evRevenue);
    const evEbitdas = txns.filter((t) => t.evEbitda > 0).map((t) => t.evEbitda);
    const premiums = txns.filter((t) => t.premium > 0).map((t) => t.premium);

    return {
      evRevenue: {
        median: calcMedian(evRevenues),
        mean: evRevenues.reduce((a, b) => a + b, 0) / evRevenues.length,
        min: Math.min(...evRevenues),
        max: Math.max(...evRevenues),
      },
      evEbitda: evEbitdas.length > 0 ? {
        median: calcMedian(evEbitdas),
        mean: evEbitdas.reduce((a, b) => a + b, 0) / evEbitdas.length,
      } : null,
      premium: premiums.length > 0 ? {
        median: calcMedian(premiums),
        mean: premiums.reduce((a, b) => a + b, 0) / premiums.length,
      } : null,
      count: txns.length,
    };
  }, [filteredTransactions]);

  // Calculate implied valuations
  const impliedValuations = useMemo(() => {
    if (!stats) return null;
    const firstYear = incomeStatement[0];
    if (!firstYear) return null;

    const revenue = firstYear.revenue;

    return {
      evRevenueMedian: (revenue * stats.evRevenue.median) / 1e9,
      evRevenueRange: {
        low: (revenue * stats.evRevenue.min) / 1e9,
        high: (revenue * stats.evRevenue.max) / 1e9,
      },
    };
  }, [stats, incomeStatement]);

  const toggleSector = (sector: string) => {
    setSelectedSectors((prev) =>
      prev.includes(sector)
        ? prev.filter((s) => s !== sector)
        : [...prev, sector]
    );
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(column);
      setSortDesc(true);
    }
  };

  return (
    <div className={cn('bg-zinc-900/50 rounded-lg border border-zinc-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Precedent Transactions</h3>
          <span className="text-xs text-zinc-500">({filteredTransactions.length} deals)</span>
        </div>
      </div>

      {/* Sector Filter */}
      <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={12} className="text-zinc-500" />
          <span className="text-xs text-zinc-500">Sectors:</span>
          {SECTORS.map((sector) => (
            <button
              key={sector}
              onClick={() => toggleSector(sector)}
              className={cn(
                'px-2 py-0.5 text-xs rounded border transition-colors',
                selectedSectors.includes(sector)
                  ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'
              )}
            >
              {sector}
            </button>
          ))}
          {selectedSectors.length > 0 && (
            <button
              onClick={() => setSelectedSectors([])}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Statistics Summary */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-zinc-800 bg-zinc-900/20">
          <div className="text-center">
            <p className="text-xs text-zinc-500 uppercase">EV/Rev Median</p>
            <p className="text-lg font-mono font-bold text-amber-400">{stats.evRevenue.median.toFixed(1)}x</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-zinc-500 uppercase">EV/Rev Range</p>
            <p className="text-lg font-mono font-bold text-zinc-300">
              {stats.evRevenue.min.toFixed(1)}x - {stats.evRevenue.max.toFixed(1)}x
            </p>
          </div>
          {stats.evEbitda && (
            <div className="text-center">
              <p className="text-xs text-zinc-500 uppercase">EV/EBITDA Median</p>
              <p className="text-lg font-mono font-bold text-cyan-400">{stats.evEbitda.median.toFixed(1)}x</p>
            </div>
          )}
          {stats.premium && (
            <div className="text-center">
              <p className="text-xs text-zinc-500 uppercase">Premium Median</p>
              <p className="text-lg font-mono font-bold text-emerald-400">{stats.premium.median.toFixed(0)}%</p>
            </div>
          )}
        </div>
      )}

      {/* Transactions Table */}
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-zinc-900">
            <tr className="border-b border-zinc-800">
              <SortHeader column="date" label="Date" sortBy={sortBy} sortDesc={sortDesc} onSort={handleSort} />
              <th className="px-3 py-2 text-left text-zinc-500 font-semibold">Target</th>
              <th className="px-3 py-2 text-left text-zinc-500 font-semibold">Acquirer</th>
              <th className="px-3 py-2 text-left text-zinc-500 font-semibold">Sector</th>
              <SortHeader column="dealValue" label="Deal ($B)" sortBy={sortBy} sortDesc={sortDesc} onSort={handleSort} />
              <SortHeader column="evRevenue" label="EV/Rev" sortBy={sortBy} sortDesc={sortDesc} onSort={handleSort} />
              <th className="px-3 py-2 text-right text-zinc-500 font-semibold">EV/EBITDA</th>
              <SortHeader column="premium" label="Premium" sortBy={sortBy} sortDesc={sortDesc} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((txn) => (
              <tr key={txn.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1 text-zinc-400">
                    <Calendar size={10} />
                    {txn.date}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="font-semibold text-zinc-200">{txn.target}</span>
                </td>
                <td className="px-3 py-2 text-zinc-400">{txn.acquirer}</td>
                <td className="px-3 py-2">
                  <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 text-[10px]">
                    {txn.sector}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">${txn.dealValue.toFixed(1)}</td>
                <td className="px-3 py-2 text-right font-mono text-amber-400">{txn.evRevenue.toFixed(1)}x</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">
                  {txn.evEbitda > 0 ? `${txn.evEbitda.toFixed(1)}x` : '-'}
                </td>
                <td className="px-3 py-2 text-right font-mono text-emerald-400">
                  {txn.premium > 0 ? `${txn.premium.toFixed(0)}%` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Implied Valuation */}
      {impliedValuations && (
        <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-amber-400" />
            <span className="text-xs text-zinc-500 uppercase">Implied Valuation from Precedents</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-zinc-400">EV at Median Multiple</p>
              <p className="text-xl font-mono font-bold text-amber-400">
                ${impliedValuations.evRevenueMedian.toFixed(1)}B
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">EV Range</p>
              <p className="text-xl font-mono font-bold text-zinc-300">
                ${impliedValuations.evRevenueRange.low.toFixed(1)}B - ${impliedValuations.evRevenueRange.high.toFixed(1)}B
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
