// DCF Valuation Engine View
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatPercent } from '../lib/financial-logic';
import { TrendingUp, DollarSign, Target, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface StatCardProps {
    label: string;
    value: string;
    sublabel?: string;
    icon: React.ReactNode;
    variant?: 'default' | 'highlight' | 'accent';
}

function StatCard({ label, value, sublabel, icon, variant = 'default' }: StatCardProps) {
    const bgClass = {
        default: 'bg-zinc-900/50 border-zinc-800',
        highlight: 'bg-emerald-950/30 border-emerald-800/50',
        accent: 'bg-cyan-950/30 border-cyan-800/50',
    }[variant];

    const textClass = {
        default: 'text-zinc-100',
        highlight: 'text-emerald-400',
        accent: 'text-cyan-400',
    }[variant];

    return (
        <div className={`rounded-lg border p-4 ${bgClass}`}>
            <div className="flex items-center gap-2 mb-2">
                <span className={textClass}>{icon}</span>
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
            </div>
            <p className={`text-2xl font-bold font-mono ${textClass}`}>{value}</p>
            {sublabel && <p className="text-xs text-zinc-500 mt-1">{sublabel}</p>}
        </div>
    );
}

export function ValuationEngine() {
    const { valuation, cashFlow, assumptions } = useFinanceStore();

    // Prepare chart data for UFCF
    const ufcfChartData = cashFlow.map((cf) => ({
        year: `Y${cf.year}`,
        ufcf: cf.unleveredFCF / 1e6,
    }));

    // Add terminal year for visualization
    const lastYearFCF = valuation.ufcfStream[valuation.ufcfStream.length - 1];
    const terminalYearFCF = lastYearFCF * (1 + assumptions.terminalGrowthRate / 100);

    // Prepare waterfall data for Enterprise Value breakdown
    const evBreakdown = [
        { name: 'PV of FCFs', value: valuation.sumPvUFCF / 1e6, fill: '#34d399' },
        { name: 'PV of TV', value: valuation.pvTerminalValue / 1e6, fill: '#22d3ee' },
        { name: 'Enterprise Value', value: valuation.enterpriseValue / 1e6, fill: '#818cf8' },
        { name: '- Net Debt', value: -assumptions.netDebt / 1e6, fill: '#f43f5e' },
        { name: 'Equity Value', value: valuation.equityValue / 1e6, fill: '#34d399' },
    ];

    // PV breakdown table
    const pvTable = cashFlow.map((cf, i) => ({
        year: cf.year,
        ufcf: valuation.ufcfStream[i],
        pvFactor: valuation.pvFactors[i],
        pvUfcf: valuation.pvUFCF[i],
    }));

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Implied Share Price"
                    value={`$${valuation.impliedSharePrice.toFixed(2)}`}
                    sublabel={`${(assumptions.sharesOutstanding / 1e6).toFixed(0)}M shares`}
                    icon={<Target size={16} />}
                    variant="highlight"
                />
                <StatCard
                    label="Equity Value"
                    value={formatCurrency(valuation.equityValue)}
                    sublabel="EV minus Net Debt"
                    icon={<DollarSign size={16} />}
                    variant="highlight"
                />
                <StatCard
                    label="Enterprise Value"
                    value={formatCurrency(valuation.enterpriseValue)}
                    sublabel="PV of FCFs + Terminal"
                    icon={<TrendingUp size={16} />}
                    variant="accent"
                />
                <StatCard
                    label="Terminal Value"
                    value={formatCurrency(valuation.terminalValue)}
                    sublabel={`${formatPercent(assumptions.terminalGrowthRate)} perpetual growth`}
                    icon={<Zap size={16} />}
                    variant="default"
                />
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* UFCF Trend Chart */}
                <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                        Unlevered Free Cash Flow Trend
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={ufcfChartData}>
                                <defs>
                                    <linearGradient id="ufcfGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                <XAxis dataKey="year" stroke="#71717a" fontSize={12} />
                                <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `$${v}M`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                    labelStyle={{ color: '#d4d4d8' }}
                                    formatter={(value) => [`$${(value as number).toFixed(1)}M`, 'UFCF']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="ufcf"
                                    stroke="#34d399"
                                    strokeWidth={2}
                                    fill="url(#ufcfGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* EV Breakdown Chart */}
                <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                        Equity Value Bridge
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={evBreakdown} layout="vertical" margin={{ left: 20, right: 20, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                                <XAxis
                                    type="number"
                                    stroke="#a1a1aa"
                                    fontSize={12}
                                    tick={{ fill: '#fafafa', fontWeight: 500 }}
                                    tickFormatter={(v) => `$${v}M`}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    stroke="#a1a1aa"
                                    fontSize={12}
                                    width={120}
                                    tick={{ fill: '#fafafa', fontWeight: 500 }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                    labelStyle={{ color: '#d4d4d8' }}
                                    formatter={(value) => [`$${Math.abs(value as number).toFixed(1)}M`, '']}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {evBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Present Value Table */}
            <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
                    <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">DCF Calculation Details</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">WACC: {formatPercent(assumptions.wacc)} • Terminal Growth: {formatPercent(assumptions.terminalGrowthRate)}</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm font-mono">
                        <thead>
                            <tr className="border-b border-zinc-800">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Year</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">UFCF</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Discount Factor</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">PV of UFCF</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pvTable.map((row) => (
                                <tr key={row.year} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                    <td className="px-4 py-2.5 text-zinc-400">Y{row.year}</td>
                                    <td className="px-4 py-2.5 text-emerald-400">{formatCurrency(row.ufcf)}</td>
                                    <td className="px-4 py-2.5 text-zinc-400">{row.pvFactor.toFixed(4)}</td>
                                    <td className="px-4 py-2.5 text-cyan-400">{formatCurrency(row.pvUfcf)}</td>
                                </tr>
                            ))}
                            {/* Terminal Value Row */}
                            <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
                                <td className="px-4 py-2.5 text-zinc-400">Terminal</td>
                                <td className="px-4 py-2.5 text-emerald-400">{formatCurrency(terminalYearFCF)} (Y{assumptions.projectionYears + 1})</td>
                                <td className="px-4 py-2.5 text-zinc-400">{valuation.pvFactors[valuation.pvFactors.length - 1].toFixed(4)}</td>
                                <td className="px-4 py-2.5 text-cyan-400">{formatCurrency(valuation.pvTerminalValue)}</td>
                            </tr>
                            {/* Total */}
                            <tr className="bg-zinc-800/50 font-semibold">
                                <td className="px-4 py-3 text-zinc-300">Total PV</td>
                                <td className="px-4 py-3"></td>
                                <td className="px-4 py-3"></td>
                                <td className="px-4 py-3 text-emerald-400">{formatCurrency(valuation.enterpriseValue)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Valuation Formula */}
            <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
                <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">
                    Valuation Formula
                </h3>
                <div className="space-y-2 text-sm font-mono text-zinc-400">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-emerald-400">Terminal Value</span>
                        <span>=</span>
                        <span>UFCF<sub>n</sub> × (1 + g)</span>
                        <span>/</span>
                        <span>(WACC - g)</span>
                        <span>=</span>
                        <span className="text-cyan-400">{formatCurrency(valuation.terminalValue)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-emerald-400">Enterprise Value</span>
                        <span>=</span>
                        <span>Σ PV(UFCF) + PV(TV)</span>
                        <span>=</span>
                        <span className="text-cyan-400">{formatCurrency(valuation.enterpriseValue)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-emerald-400">Equity Value</span>
                        <span>=</span>
                        <span>EV - Net Debt</span>
                        <span>=</span>
                        <span className="text-cyan-400">{formatCurrency(valuation.equityValue)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-emerald-400">Share Price</span>
                        <span>=</span>
                        <span>Equity Value / Shares</span>
                        <span>=</span>
                        <span className="text-cyan-400 text-lg">${valuation.impliedSharePrice.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
