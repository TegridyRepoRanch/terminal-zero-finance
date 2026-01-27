// Price Target Calculator
// Multiple methods for calculating and weighting price targets

import { useMemo, useState } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatCurrency, formatPercent } from '../../lib/financial-logic';
import {
    Target,
    TrendingUp,
    TrendingDown,
    Calculator,
    Scale,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell,
} from 'recharts';

type TargetMethod = 'dcf' | 'pe' | 'evEbitda' | 'evRevenue' | 'custom';

interface PriceTargetInput {
    method: TargetMethod;
    label: string;
    value: number;
    weight: number;
    enabled: boolean;
}

interface PriceTargetResult {
    method: string;
    target: number;
    weight: number;
    contribution: number;
    upside: number;
}

const DEFAULT_TARGETS: Record<TargetMethod, Omit<PriceTargetInput, 'value'>> = {
    dcf: { method: 'dcf', label: 'DCF Valuation', weight: 40, enabled: true },
    pe: { method: 'pe', label: 'P/E Multiple', weight: 20, enabled: true },
    evEbitda: { method: 'evEbitda', label: 'EV/EBITDA', weight: 20, enabled: true },
    evRevenue: { method: 'evRevenue', label: 'EV/Revenue', weight: 10, enabled: false },
    custom: { method: 'custom', label: 'Custom Target', weight: 10, enabled: false },
};

export function PriceTargetCalculator() {
    const { company, valuation, assumptions, incomeStatement } = useFinanceStore();

    // Current market price
    const currentPrice = company?.marketPrice || 100;

    // Get base year financial data from income statement (year 0 or first year)
    const baseYear = incomeStatement?.[0];
    const baseRevenue = baseYear?.revenue || assumptions?.baseRevenue || 0;
    const baseNetIncome = baseYear?.netIncome || 0;
    const baseEbit = baseYear?.ebit || 0; // EBIT = Operating Income
    const baseDepreciation = baseYear?.depreciation || 0;

    // Calculate implied prices from different methods
    const dcfPrice = valuation?.impliedSharePrice || 0;

    // For P/E multiple method
    const [targetPE, setTargetPE] = useState(20);
    const eps = baseNetIncome && assumptions?.sharesOutstanding
        ? baseNetIncome / assumptions.sharesOutstanding
        : 0;
    const pePrice = eps * targetPE;

    // For EV/EBITDA method (EBITDA = EBIT + Depreciation)
    const [targetEvEbitda, setTargetEvEbitda] = useState(12);
    const ebitda = baseEbit + baseDepreciation;
    const evFromEbitda = ebitda * targetEvEbitda;
    const equityFromEbitda = evFromEbitda - (assumptions?.netDebt || 0);
    const evEbitdaPrice = assumptions?.sharesOutstanding
        ? equityFromEbitda / assumptions.sharesOutstanding
        : 0;

    // For EV/Revenue method
    const [targetEvRevenue, setTargetEvRevenue] = useState(3);
    const evFromRevenue = baseRevenue * targetEvRevenue;
    const equityFromRevenue = evFromRevenue - (assumptions?.netDebt || 0);
    const evRevenuePrice = assumptions?.sharesOutstanding
        ? equityFromRevenue / assumptions.sharesOutstanding
        : 0;

    // Custom target
    const [customTarget, setCustomTarget] = useState(currentPrice * 1.2);

    // Target inputs state
    const [targets, setTargets] = useState<PriceTargetInput[]>([
        { ...DEFAULT_TARGETS.dcf, value: dcfPrice },
        { ...DEFAULT_TARGETS.pe, value: pePrice },
        { ...DEFAULT_TARGETS.evEbitda, value: evEbitdaPrice },
        { ...DEFAULT_TARGETS.evRevenue, value: evRevenuePrice },
        { ...DEFAULT_TARGETS.custom, value: customTarget },
    ]);

    // Update target values when calculations change
    useMemo(() => {
        setTargets(prev => prev.map(t => {
            switch (t.method) {
                case 'dcf': return { ...t, value: dcfPrice };
                case 'pe': return { ...t, value: pePrice };
                case 'evEbitda': return { ...t, value: evEbitdaPrice };
                case 'evRevenue': return { ...t, value: evRevenuePrice };
                case 'custom': return { ...t, value: customTarget };
                default: return t;
            }
        }));
    }, [dcfPrice, pePrice, evEbitdaPrice, evRevenuePrice, customTarget]);

    // Calculate weighted average price target
    const { weightedTarget, results } = useMemo(() => {
        const enabledTargets = targets.filter(t => t.enabled && t.value > 0);
        const totalWeight = enabledTargets.reduce((sum, t) => sum + t.weight, 0);

        if (totalWeight === 0 || enabledTargets.length === 0) {
            return { weightedTarget: 0, results: [] };
        }

        const normalizedResults: PriceTargetResult[] = enabledTargets.map(t => {
            const normalizedWeight = t.weight / totalWeight;
            const contribution = t.value * normalizedWeight;
            const upside = ((t.value - currentPrice) / currentPrice) * 100;
            return {
                method: t.label,
                target: t.value,
                weight: normalizedWeight * 100,
                contribution,
                upside,
            };
        });

        const weightedTarget = normalizedResults.reduce((sum, r) => sum + r.contribution, 0);

        return { weightedTarget, results: normalizedResults };
    }, [targets, currentPrice]);

    // Overall upside/downside
    const totalUpside = currentPrice > 0 ? ((weightedTarget - currentPrice) / currentPrice) * 100 : 0;

    // Toggle target enabled
    const toggleTarget = (method: TargetMethod) => {
        setTargets(prev => prev.map(t =>
            t.method === method ? { ...t, enabled: !t.enabled } : t
        ));
    };

    // Update weight
    const updateWeight = (method: TargetMethod, weight: number) => {
        setTargets(prev => prev.map(t =>
            t.method === method ? { ...t, weight: Math.max(0, Math.min(100, weight)) } : t
        ));
    };

    // Chart data
    const chartData = [
        { name: 'Current', price: currentPrice, fill: '#71717a' },
        ...results.map(r => ({
            name: r.method.replace(' Multiple', '').replace(' Valuation', ''),
            price: r.target,
            fill: r.upside >= 0 ? '#22c55e' : '#ef4444',
        })),
        { name: 'Target', price: weightedTarget, fill: '#3b82f6' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Target className="text-blue-400" size={20} />
                    <h3 className="text-lg font-semibold text-zinc-100">Price Target Calculator</h3>
                </div>
                <div className="text-xs text-zinc-500">
                    Current: ${currentPrice.toFixed(2)}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="text-blue-400" size={14} />
                        <span className="text-xs text-zinc-500 uppercase">Weighted Target</span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-blue-400">
                        ${weightedTarget.toFixed(2)}
                    </p>
                </div>

                <div className={cn(
                    "bg-zinc-900/50 rounded-lg border p-4",
                    totalUpside >= 0 ? "border-emerald-800/50" : "border-red-800/50"
                )}>
                    <div className="flex items-center gap-2 mb-2">
                        {totalUpside >= 0 ? (
                            <TrendingUp className="text-emerald-400" size={14} />
                        ) : (
                            <TrendingDown className="text-red-400" size={14} />
                        )}
                        <span className="text-xs text-zinc-500 uppercase">
                            {totalUpside >= 0 ? 'Upside' : 'Downside'}
                        </span>
                    </div>
                    <p className={cn(
                        "text-2xl font-bold font-mono",
                        totalUpside >= 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                        {totalUpside >= 0 ? '+' : ''}{totalUpside.toFixed(1)}%
                    </p>
                </div>

                <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Calculator className="text-cyan-400" size={14} />
                        <span className="text-xs text-zinc-500 uppercase">DCF Fair Value</span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-cyan-400">
                        ${dcfPrice.toFixed(2)}
                    </p>
                </div>

                <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Scale className="text-purple-400" size={14} />
                        <span className="text-xs text-zinc-500 uppercase">Methods Used</span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-purple-400">
                        {results.length}
                    </p>
                </div>
            </div>

            {/* Price Target Chart */}
            <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                    Price Target Comparison
                </h4>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 20 }}>
                            <XAxis
                                type="number"
                                stroke="#71717a"
                                fontSize={12}
                                tickFormatter={(v) => `$${v.toFixed(0)}`}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                stroke="#71717a"
                                fontSize={12}
                                width={60}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#18181b',
                                    border: '1px solid #27272a',
                                    borderRadius: '8px',
                                }}
                                formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, 'Price']}
                            />
                            <ReferenceLine x={currentPrice} stroke="#71717a" strokeDasharray="3 3" />
                            <Bar dataKey="price" radius={[0, 4, 4, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Method Configuration */}
            <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
                    <h4 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
                        Valuation Methods
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        Configure which methods to include and their weights
                    </p>
                </div>

                <div className="divide-y divide-zinc-800">
                    {targets.map((target) => (
                        <div
                            key={target.method}
                            className={cn(
                                "px-4 py-3 transition-colors",
                                target.enabled ? "bg-zinc-900/30" : "bg-zinc-950/50 opacity-60"
                            )}
                        >
                            <div className="flex items-center justify-between gap-4">
                                {/* Toggle & Label */}
                                <div className="flex items-center gap-3 flex-1">
                                    <button
                                        onClick={() => toggleTarget(target.method)}
                                        className={cn(
                                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                            target.enabled
                                                ? "bg-blue-600 border-blue-500"
                                                : "bg-zinc-800 border-zinc-700"
                                        )}
                                    >
                                        {target.enabled && (
                                            <span className="text-white text-xs">✓</span>
                                        )}
                                    </button>
                                    <span className="text-sm text-zinc-200">{target.label}</span>
                                </div>

                                {/* Method-specific inputs */}
                                {target.method === 'pe' && target.enabled && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-500">Target P/E:</span>
                                        <input
                                            type="number"
                                            value={targetPE}
                                            onChange={(e) => setTargetPE(Number(e.target.value))}
                                            className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 text-right"
                                        />
                                    </div>
                                )}
                                {target.method === 'evEbitda' && target.enabled && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-500">Target EV/EBITDA:</span>
                                        <input
                                            type="number"
                                            value={targetEvEbitda}
                                            onChange={(e) => setTargetEvEbitda(Number(e.target.value))}
                                            className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 text-right"
                                        />
                                    </div>
                                )}
                                {target.method === 'evRevenue' && target.enabled && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-500">Target EV/Rev:</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={targetEvRevenue}
                                            onChange={(e) => setTargetEvRevenue(Number(e.target.value))}
                                            className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 text-right"
                                        />
                                    </div>
                                )}
                                {target.method === 'custom' && target.enabled && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-500">Price:</span>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">$</span>
                                            <input
                                                type="number"
                                                value={customTarget}
                                                onChange={(e) => setCustomTarget(Number(e.target.value))}
                                                className="w-20 bg-zinc-800 border border-zinc-700 rounded pl-5 pr-2 py-1 text-xs text-zinc-200 text-right"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Weight */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-500">Weight:</span>
                                    <input
                                        type="number"
                                        value={target.weight}
                                        onChange={(e) => updateWeight(target.method, Number(e.target.value))}
                                        disabled={!target.enabled}
                                        className="w-14 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 text-right disabled:opacity-50"
                                    />
                                    <span className="text-xs text-zinc-500">%</span>
                                </div>

                                {/* Target Price */}
                                <div className="w-24 text-right">
                                    <span className={cn(
                                        "font-mono text-sm",
                                        target.enabled ? "text-zinc-200" : "text-zinc-500"
                                    )}>
                                        ${target.value.toFixed(2)}
                                    </span>
                                </div>

                                {/* Upside/Downside */}
                                <div className="w-20 text-right">
                                    {target.enabled && target.value > 0 && (
                                        <span className={cn(
                                            "text-xs font-mono flex items-center justify-end gap-1",
                                            target.value >= currentPrice ? "text-emerald-400" : "text-red-400"
                                        )}>
                                            {target.value >= currentPrice ? (
                                                <ArrowUp size={12} />
                                            ) : (
                                                <ArrowDown size={12} />
                                            )}
                                            {Math.abs(((target.value - currentPrice) / currentPrice) * 100).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Results Table */}
            {results.length > 0 && (
                <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
                        <h4 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
                            Weighted Calculation
                        </h4>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800">
                                <th className="px-4 py-2 text-left text-xs text-zinc-500 uppercase">Method</th>
                                <th className="px-4 py-2 text-right text-xs text-zinc-500 uppercase">Target</th>
                                <th className="px-4 py-2 text-right text-xs text-zinc-500 uppercase">Weight</th>
                                <th className="px-4 py-2 text-right text-xs text-zinc-500 uppercase">Contribution</th>
                                <th className="px-4 py-2 text-right text-xs text-zinc-500 uppercase">Upside</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((result) => (
                                <tr key={result.method} className="border-b border-zinc-800/50">
                                    <td className="px-4 py-2 text-zinc-200">{result.method}</td>
                                    <td className="px-4 py-2 text-right font-mono text-zinc-200">
                                        ${result.target.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono text-zinc-400">
                                        {result.weight.toFixed(1)}%
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono text-cyan-400">
                                        ${result.contribution.toFixed(2)}
                                    </td>
                                    <td className={cn(
                                        "px-4 py-2 text-right font-mono",
                                        result.upside >= 0 ? "text-emerald-400" : "text-red-400"
                                    )}>
                                        {result.upside >= 0 ? '+' : ''}{result.upside.toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-zinc-800/30 font-semibold">
                                <td className="px-4 py-3 text-zinc-100">Weighted Target</td>
                                <td className="px-4 py-3 text-right font-mono text-blue-400">
                                    ${weightedTarget.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-zinc-400">
                                    100%
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-blue-400">
                                    ${weightedTarget.toFixed(2)}
                                </td>
                                <td className={cn(
                                    "px-4 py-3 text-right font-mono",
                                    totalUpside >= 0 ? "text-emerald-400" : "text-red-400"
                                )}>
                                    {totalUpside >= 0 ? '+' : ''}{totalUpside.toFixed(1)}%
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* Methodology Notes */}
            <div className="bg-zinc-900/30 rounded-lg border border-zinc-800 p-4">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Methodology Notes
                </h4>
                <div className="grid md:grid-cols-2 gap-4 text-xs text-zinc-400">
                    <div>
                        <p className="text-zinc-300 font-medium mb-1">DCF Valuation</p>
                        <p>Present value of projected cash flows using {formatPercent(assumptions?.wacc || 0)} WACC</p>
                    </div>
                    <div>
                        <p className="text-zinc-300 font-medium mb-1">P/E Multiple</p>
                        <p>EPS ({eps > 0 ? `$${eps.toFixed(2)}` : 'N/A'}) × Target P/E ({targetPE}x)</p>
                    </div>
                    <div>
                        <p className="text-zinc-300 font-medium mb-1">EV/EBITDA</p>
                        <p>EBITDA ({formatCurrency(ebitda)}) × Multiple ({targetEvEbitda}x) - Net Debt</p>
                    </div>
                    <div>
                        <p className="text-zinc-300 font-medium mb-1">EV/Revenue</p>
                        <p>Revenue ({formatCurrency(baseRevenue)}) × Multiple ({targetEvRevenue}x) - Net Debt</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
