// Break-Even Calculator
// Calculates break-even price, units, and time to profitability

import { useMemo, useState } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatCurrency, formatPercent } from '../../lib/financial-logic';
import {
    Calculator,
    TrendingUp,
    DollarSign,
    BarChart2,
    Target,
    Percent,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Area,
    ComposedChart,
} from 'recharts';

interface BreakEvenInputs {
    entryPrice: number;
    shares: number;
    targetReturn: number; // Percentage
    commissionPerTrade: number;
    taxRate: number;
}

interface BreakEvenResults {
    totalInvestment: number;
    totalCosts: number; // Entry + exit commissions
    breakEvenPrice: number; // Price needed to cover costs
    breakEvenPercent: number; // % gain needed
    targetPrice: number; // Price for target return
    targetProfit: number; // Dollar profit at target
    profitAfterTax: number; // After-tax profit at target
    riskRewardRatio: number | null; // If stop loss is set
}

function calculateBreakEven(
    inputs: BreakEvenInputs,
    stopLossPrice?: number
): BreakEvenResults {
    const { entryPrice, shares, targetReturn, commissionPerTrade, taxRate } = inputs;

    // Guard against invalid inputs that would cause division by zero
    const safeShares = shares > 0 ? shares : 1;
    const safeEntryPrice = entryPrice > 0 ? entryPrice : 1;

    const totalInvestment = safeEntryPrice * safeShares;
    const totalCosts = commissionPerTrade * 2; // Entry and exit

    // Break-even price: must cover investment + costs
    const breakEvenValue = totalInvestment + totalCosts;
    const breakEvenPrice = breakEvenValue / safeShares;
    const breakEvenPercent = ((breakEvenPrice - safeEntryPrice) / safeEntryPrice) * 100;

    // Target price for desired return
    const targetGrossProfit = totalInvestment * (targetReturn / 100);
    const targetPrice = (totalInvestment + targetGrossProfit + totalCosts) / safeShares;
    const targetProfit = (targetPrice * safeShares) - totalInvestment - totalCosts;
    const profitAfterTax = targetProfit * (1 - taxRate / 100);

    // Risk/reward ratio if stop loss is set
    let riskRewardRatio: number | null = null;
    if (stopLossPrice && stopLossPrice < safeEntryPrice) {
        const riskPerShare = safeEntryPrice - stopLossPrice;
        const rewardPerShare = targetPrice - safeEntryPrice;
        riskRewardRatio = riskPerShare > 0 ? rewardPerShare / riskPerShare : null;
    }

    return {
        totalInvestment,
        totalCosts,
        breakEvenPrice,
        breakEvenPercent,
        targetPrice,
        targetProfit,
        profitAfterTax,
        riskRewardRatio,
    };
}

interface InputFieldProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    prefix?: string;
    suffix?: string;
    min?: number;
    max?: number;
    step?: number;
    icon?: React.ReactNode;
}

function InputField({
    label,
    value,
    onChange,
    prefix,
    suffix,
    min = 0,
    max,
    step = 1,
    icon,
}: InputFieldProps) {
    return (
        <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                {icon}
                {label}
            </label>
            <div className="relative">
                {prefix && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                        {prefix}
                    </span>
                )}
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    min={min}
                    max={max}
                    step={step}
                    className={cn(
                        'w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 text-sm text-zinc-200',
                        'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
                        prefix ? 'pl-7 pr-3' : 'px-3',
                        suffix ? 'pr-10' : ''
                    )}
                />
                {suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                        {suffix}
                    </span>
                )}
            </div>
        </div>
    );
}

export function BreakEvenCalculator() {
    const { company } = useFinanceStore();

    const [inputs, setInputs] = useState<BreakEvenInputs>({
        entryPrice: company?.marketPrice || 100,
        shares: 100,
        targetReturn: 20,
        commissionPerTrade: 0,
        taxRate: 25,
    });

    const [stopLoss, setStopLoss] = useState<number | null>(null);
    const [useStopLoss, setUseStopLoss] = useState(false);

    const results = useMemo(() => {
        return calculateBreakEven(inputs, useStopLoss ? stopLoss || undefined : undefined);
    }, [inputs, stopLoss, useStopLoss]);

    // Generate chart data for profit/loss visualization
    const chartData = useMemo(() => {
        const { entryPrice, shares } = inputs;
        const data: Array<{
            price: number;
            profit: number;
            profitAfterTax: number;
            breakEven: number;
        }> = [];

        // Price range: -30% to +50% from entry
        const minPrice = entryPrice * 0.7;
        const maxPrice = entryPrice * 1.5;
        const step = (maxPrice - minPrice) / 50;

        for (let price = minPrice; price <= maxPrice; price += step) {
            const grossProfit = (price - entryPrice) * shares - results.totalCosts;
            const taxableProfit = Math.max(0, grossProfit);
            const tax = taxableProfit * (inputs.taxRate / 100);
            const netProfit = grossProfit - (grossProfit > 0 ? tax : 0);

            data.push({
                price: Number(price.toFixed(2)),
                profit: Number(grossProfit.toFixed(2)),
                profitAfterTax: Number(netProfit.toFixed(2)),
                breakEven: 0,
            });
        }

        return data;
    }, [inputs, results.totalCosts]);

    const updateInput = <K extends keyof BreakEvenInputs>(
        key: K,
        value: BreakEvenInputs[K]
    ) => {
        setInputs((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Calculator size={20} className="text-emerald-500" />
                <div>
                    <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
                        Break-Even Calculator
                    </h3>
                    <p className="text-xs text-zinc-500">
                        Calculate your break-even point and target returns
                    </p>
                </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <InputField
                    label="Entry Price"
                    value={inputs.entryPrice}
                    onChange={(v) => updateInput('entryPrice', v)}
                    prefix="$"
                    step={0.01}
                    icon={<DollarSign size={12} />}
                />
                <InputField
                    label="Number of Shares"
                    value={inputs.shares}
                    onChange={(v) => updateInput('shares', v)}
                    min={1}
                    icon={<BarChart2 size={12} />}
                />
                <InputField
                    label="Target Return"
                    value={inputs.targetReturn}
                    onChange={(v) => updateInput('targetReturn', v)}
                    suffix="%"
                    min={0}
                    max={1000}
                    icon={<TrendingUp size={12} />}
                />
                <InputField
                    label="Commission/Trade"
                    value={inputs.commissionPerTrade}
                    onChange={(v) => updateInput('commissionPerTrade', v)}
                    prefix="$"
                    step={0.01}
                    icon={<DollarSign size={12} />}
                />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <InputField
                    label="Tax Rate"
                    value={inputs.taxRate}
                    onChange={(v) => updateInput('taxRate', v)}
                    suffix="%"
                    min={0}
                    max={100}
                    icon={<Percent size={12} />}
                />
                <div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        <Target size={12} />
                        Stop Loss (Optional)
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={useStopLoss}
                            onChange={(e) => setUseStopLoss(e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                        />
                        <input
                            type="number"
                            value={stopLoss || ''}
                            onChange={(e) => setStopLoss(e.target.value ? Number(e.target.value) : null)}
                            disabled={!useStopLoss}
                            placeholder="$"
                            step={0.01}
                            className={cn(
                                'flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200',
                                'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
                                !useStopLoss && 'opacity-50'
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={14} className="text-zinc-500" />
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Total Investment
                        </span>
                    </div>
                    <p className="text-xl font-bold font-mono text-zinc-200">
                        {formatCurrency(results.totalInvestment)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                        + ${results.totalCosts.toFixed(2)} costs
                    </p>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Target size={14} className="text-yellow-500" />
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Break-Even Price
                        </span>
                    </div>
                    <p className="text-xl font-bold font-mono text-yellow-400">
                        ${results.breakEvenPrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                        +{results.breakEvenPercent.toFixed(2)}% from entry
                    </p>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={14} className="text-emerald-500" />
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Target Price
                        </span>
                    </div>
                    <p className="text-xl font-bold font-mono text-emerald-400">
                        ${results.targetPrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                        {formatPercent(inputs.targetReturn)} return
                    </p>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={14} className="text-green-500" />
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Target Profit (After Tax)
                        </span>
                    </div>
                    <p className="text-xl font-bold font-mono text-green-400">
                        {formatCurrency(results.profitAfterTax)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                        Gross: {formatCurrency(results.targetProfit)}
                    </p>
                </div>
            </div>

            {/* Risk/Reward Ratio */}
            {results.riskRewardRatio !== null && (
                <div className="bg-zinc-800/50 rounded-lg p-4 flex items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Risk/Reward Ratio
                        </span>
                        <p className="text-lg font-bold font-mono mt-1">
                            <span className={cn(
                                results.riskRewardRatio >= 2
                                    ? 'text-emerald-400'
                                    : results.riskRewardRatio >= 1
                                    ? 'text-yellow-400'
                                    : 'text-red-400'
                            )}>
                                1:{results.riskRewardRatio.toFixed(2)}
                            </span>
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-zinc-500">
                            Risk: ${((inputs.entryPrice - (stopLoss || 0)) * inputs.shares).toFixed(2)}
                        </p>
                        <p className="text-xs text-zinc-500">
                            Reward: ${((results.targetPrice - inputs.entryPrice) * inputs.shares).toFixed(2)}
                        </p>
                    </div>
                </div>
            )}

            {/* Profit/Loss Chart */}
            <div className="bg-zinc-800/50 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                    Profit/Loss at Different Price Levels
                </h4>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                                    <stop offset="50%" stopColor="#34d399" stopOpacity={0} />
                                    <stop offset="50%" stopColor="#f43f5e" stopOpacity={0} />
                                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.3} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis
                                dataKey="price"
                                stroke="#71717a"
                                fontSize={10}
                                tickFormatter={(v) => `$${v}`}
                            />
                            <YAxis
                                stroke="#71717a"
                                fontSize={10}
                                tickFormatter={(v) => `$${v}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#18181b',
                                    border: '1px solid #27272a',
                                    borderRadius: '8px',
                                }}
                                labelStyle={{ color: '#d4d4d8' }}
                                itemStyle={{ color: '#fafafa' }}
                                formatter={(value: number | undefined, name?: string) => [
                                    `$${(value ?? 0).toFixed(2)}`,
                                    name === 'profit' ? 'Gross P/L' : 'After-Tax P/L',
                                ]}
                                labelFormatter={(label) => `Price: $${label}`}
                            />
                            <ReferenceLine y={0} stroke="#71717a" strokeDasharray="3 3" />
                            <ReferenceLine
                                x={inputs.entryPrice}
                                stroke="#3b82f6"
                                strokeDasharray="3 3"
                                label={{ value: 'Entry', fill: '#3b82f6', fontSize: 10 }}
                            />
                            <ReferenceLine
                                x={Number(results.breakEvenPrice.toFixed(2))}
                                stroke="#eab308"
                                strokeDasharray="3 3"
                                label={{ value: 'B/E', fill: '#eab308', fontSize: 10 }}
                            />
                            <ReferenceLine
                                x={Number(results.targetPrice.toFixed(2))}
                                stroke="#22c55e"
                                strokeDasharray="3 3"
                                label={{ value: 'Target', fill: '#22c55e', fontSize: 10 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="profit"
                                fill="url(#profitGradient)"
                                stroke="none"
                            />
                            <Line
                                type="monotone"
                                dataKey="profit"
                                stroke="#71717a"
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="profitAfterTax"
                                stroke="#34d399"
                                strokeWidth={2}
                                dot={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-2 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-0.5 bg-zinc-500 inline-block" /> Gross P/L
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-0.5 bg-emerald-500 inline-block" /> After-Tax P/L
                    </span>
                </div>
            </div>

            {/* Quick Reference Table */}
            <div className="bg-zinc-800/50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-zinc-700">
                            <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Scenario
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Price
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                % Change
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Gross P/L
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                After Tax
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {[
                            { label: 'Break-Even', price: results.breakEvenPrice },
                            { label: '+10%', price: inputs.entryPrice * 1.1 },
                            { label: '+20%', price: inputs.entryPrice * 1.2 },
                            { label: 'Target', price: results.targetPrice },
                            { label: '-10%', price: inputs.entryPrice * 0.9 },
                            { label: '-20%', price: inputs.entryPrice * 0.8 },
                        ].map((row) => {
                            const grossPL = (row.price - inputs.entryPrice) * inputs.shares - results.totalCosts;
                            const tax = grossPL > 0 ? grossPL * (inputs.taxRate / 100) : 0;
                            const netPL = grossPL - tax;
                            const pctChange = ((row.price - inputs.entryPrice) / inputs.entryPrice) * 100;

                            return (
                                <tr key={row.label} className="hover:bg-zinc-800/50">
                                    <td className="px-4 py-2 text-zinc-300">{row.label}</td>
                                    <td className="px-4 py-2 text-right font-mono text-zinc-300">
                                        ${row.price.toFixed(2)}
                                    </td>
                                    <td className={cn(
                                        'px-4 py-2 text-right font-mono',
                                        pctChange >= 0 ? 'text-green-400' : 'text-red-400'
                                    )}>
                                        {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
                                    </td>
                                    <td className={cn(
                                        'px-4 py-2 text-right font-mono',
                                        grossPL >= 0 ? 'text-green-400' : 'text-red-400'
                                    )}>
                                        {grossPL >= 0 ? '+' : ''}{formatCurrency(grossPL)}
                                    </td>
                                    <td className={cn(
                                        'px-4 py-2 text-right font-mono',
                                        netPL >= 0 ? 'text-emerald-400' : 'text-red-400'
                                    )}>
                                        {netPL >= 0 ? '+' : ''}{formatCurrency(netPL)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
