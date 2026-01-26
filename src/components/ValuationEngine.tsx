// DCF Valuation Engine View
import { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatPercent } from '../lib/financial-logic';
import { TrendingUp, DollarSign, Target, Zap, BarChart3, Activity, Grid3X3, Wand2, Table, Dice6, Building2, Briefcase, History, Users, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { WaterfallChart, TornadoChart, HeatmapChart, CustomChartBuilder } from './charts';
import {
    SensitivityTable,
    MonteCarloSimulation,
    ComparableCompanies,
    PrecedentTransactions,
    HistoricalTrends,
    PeerComparison,
    QuarterlyProjections,
} from './analysis';
import { ExportMenu } from './ExportMenu';
import { FinancialStatementsView } from './FinancialStatementsView';
import { cn } from '../lib/utils';

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

// Advanced Charts Tab Types
type AdvancedChartTab = 'waterfall' | 'tornado' | 'heatmap' | 'custom';

const advancedChartTabs: { id: AdvancedChartTab; label: string; icon: React.ReactNode }[] = [
    { id: 'waterfall', label: 'Waterfall', icon: <BarChart3 size={14} /> },
    { id: 'tornado', label: 'Sensitivity', icon: <Activity size={14} /> },
    { id: 'heatmap', label: 'Heatmap', icon: <Grid3X3 size={14} /> },
    { id: 'custom', label: 'Custom Builder', icon: <Wand2 size={14} /> },
];

// Analysis Module Tab Types
type AnalysisTab = 'sensitivity' | 'monteCarlo' | 'comps' | 'precedents' | 'historical' | 'peers' | 'quarterly';

const analysisTabs: { id: AnalysisTab; label: string; icon: React.ReactNode }[] = [
    { id: 'sensitivity', label: 'Sensitivity Table', icon: <Table size={14} /> },
    { id: 'monteCarlo', label: 'Monte Carlo', icon: <Dice6 size={14} /> },
    { id: 'comps', label: 'Comps', icon: <Building2 size={14} /> },
    { id: 'precedents', label: 'Precedents', icon: <Briefcase size={14} /> },
    { id: 'historical', label: 'Historical', icon: <History size={14} /> },
    { id: 'peers', label: 'Peer Analysis', icon: <Users size={14} /> },
    { id: 'quarterly', label: 'Quarterly', icon: <Calendar size={14} /> },
];

export function ValuationEngine() {
    const { valuation, cashFlow, assumptions } = useFinanceStore();
    const [activeAdvancedTab, setActiveAdvancedTab] = useState<AdvancedChartTab>('waterfall');
    const [activeAnalysisTab, setActiveAnalysisTab] = useState<AnalysisTab>('sensitivity');
    const [showAnalysis, setShowAnalysis] = useState(true);
    const [showStatements, setShowStatements] = useState(true);

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
            {/* Header with Export */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-zinc-100">DCF Valuation</h2>
                    <p className="text-xs text-zinc-500">
                        {assumptions.projectionYears}-year projection with {formatPercent(assumptions.wacc)} WACC
                    </p>
                </div>
                <ExportMenu />
            </div>

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
                                    itemStyle={{ color: '#fafafa' }}
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
                                    itemStyle={{ color: '#fafafa' }}
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

            {/* Advanced Analytics Section */}
            <div className="bg-zinc-900/30 rounded-lg border border-zinc-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
                    <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Advanced Analytics</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Interactive visualizations for deeper analysis</p>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 overflow-x-auto">
                    {advancedChartTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveAdvancedTab(tab.id)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                                'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 focus:ring-offset-zinc-900',
                                activeAdvancedTab === tab.id
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                            )}
                            role="tab"
                            aria-selected={activeAdvancedTab === tab.id}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-4">
                    {activeAdvancedTab === 'waterfall' && <WaterfallChart height={300} />}
                    {activeAdvancedTab === 'tornado' && <TornadoChart height={400} />}
                    {activeAdvancedTab === 'heatmap' && <HeatmapChart />}
                    {activeAdvancedTab === 'custom' && <CustomChartBuilder />}
                </div>
            </div>

            {/* Analysis Modules Section */}
            <div className="bg-zinc-900/30 rounded-lg border border-zinc-800 overflow-hidden">
                <button
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    className="w-full px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between hover:bg-zinc-900 transition-colors"
                >
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Analysis Modules</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Comps, precedents, Monte Carlo, and more</p>
                    </div>
                    {showAnalysis ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                </button>

                {showAnalysis && (
                    <>
                        {/* Tab Navigation */}
                        <div className="flex items-center gap-1 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 overflow-x-auto">
                            {analysisTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveAnalysisTab(tab.id)}
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                                        'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 focus:ring-offset-zinc-900',
                                        activeAnalysisTab === tab.id
                                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                                    )}
                                    role="tab"
                                    aria-selected={activeAnalysisTab === tab.id}
                                >
                                    {tab.icon}
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="p-4">
                            {activeAnalysisTab === 'sensitivity' && <SensitivityTable />}
                            {activeAnalysisTab === 'monteCarlo' && <MonteCarloSimulation />}
                            {activeAnalysisTab === 'comps' && <ComparableCompanies />}
                            {activeAnalysisTab === 'precedents' && <PrecedentTransactions />}
                            {activeAnalysisTab === 'historical' && <HistoricalTrends />}
                            {activeAnalysisTab === 'peers' && <PeerComparison />}
                            {activeAnalysisTab === 'quarterly' && <QuarterlyProjections />}
                        </div>
                    </>
                )}
            </div>

            {/* Financial Statements Section */}
            <div className="bg-zinc-900/30 rounded-lg border border-zinc-800 overflow-hidden">
                <button
                    onClick={() => setShowStatements(!showStatements)}
                    className="w-full px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between hover:bg-zinc-900 transition-colors"
                >
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Financial Statements</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Income, Balance Sheet, Cash Flow, Depreciation, Debt schedules</p>
                    </div>
                    {showStatements ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                </button>

                {showStatements && (
                    <div className="p-0">
                        <FinancialStatementsView />
                    </div>
                )}
            </div>
        </div>
    );
}
