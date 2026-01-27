// Investment Metrics Component
// Displays Margin of Safety, Reverse DCF, Risk Metrics, and Earnings Quality

import { useMemo, useState } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import {
    calculateMarginOfSafety,
    calculateReverseDCF,
    getMarginOfSafetyBgColor,
    formatPercent,
} from '../../lib/financial-logic';
import { calculateRiskMetricsFromAssumptions, getRiskMetricColor, formatRiskMetric } from '../../lib/risk-metrics';
import { calculateEarningsQualityFromHistory, getQualityLevelColor, getQualityScoreColor } from '../../lib/earnings-quality';
import type { EarningsQualityResult } from '../../lib/earnings-quality';
import {
    Shield,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Target,
    Activity,
    DollarSign,
    ChevronDown,
    ChevronUp,
    Info,
    RefreshCw,
    Calculator,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface MetricCardProps {
    label: string;
    value: string | number;
    sublabel?: string;
    icon: React.ReactNode;
    colorClass?: string;
    tooltip?: string;
}

function MetricCard({ label, value, sublabel, icon, colorClass = 'text-zinc-100', tooltip }: MetricCardProps) {
    return (
        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4 group relative">
            <div className="flex items-center gap-2 mb-2">
                <span className={colorClass}>{icon}</span>
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
                {tooltip && (
                    <div className="relative">
                        <Info size={12} className="text-zinc-600 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 w-48 hidden group-hover:block z-10">
                            {tooltip}
                        </div>
                    </div>
                )}
            </div>
            <p className={cn('text-2xl font-bold font-mono', colorClass)}>{value}</p>
            {sublabel && <p className="text-xs text-zinc-500 mt-1">{sublabel}</p>}
        </div>
    );
}

export function InvestmentMetrics() {
    const { company, assumptions, refreshStockPrice, incomeStatement, balanceSheet, historicalData } = useFinanceStore();
    const [showDetails, setShowDetails] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const marketPrice = company?.marketPrice || 0;
    const hasMarketPrice = marketPrice > 0;

    // Calculate all metrics
    const marginOfSafety = useMemo(() => {
        if (!hasMarketPrice) return null;
        return calculateMarginOfSafety(assumptions, marketPrice);
    }, [assumptions, marketPrice, hasMarketPrice]);

    const reverseDCF = useMemo(() => {
        if (!hasMarketPrice) return null;
        return calculateReverseDCF(assumptions, marketPrice);
    }, [assumptions, marketPrice, hasMarketPrice]);

    const riskMetrics = useMemo(() => {
        return calculateRiskMetricsFromAssumptions(assumptions, incomeStatement, balanceSheet);
    }, [assumptions, incomeStatement, balanceSheet]);

    const earningsQuality = useMemo((): EarningsQualityResult | null => {
        // Use historical data if available
        if (historicalData && historicalData.data.length >= 2) {
            return calculateEarningsQualityFromHistory(historicalData.data);
        }

        // Otherwise create a simplified result based on projected data
        const latestIncome = incomeStatement[incomeStatement.length - 1];
        if (!latestIncome) return null;

        // Simple approximation when we don't have OCF data
        const grossMargin = latestIncome.revenue > 0 ? (latestIncome.grossProfit / latestIncome.revenue) * 100 : 0;
        const opMargin = latestIncome.revenue > 0 ? (latestIncome.ebit / latestIncome.revenue) * 100 : 0;
        const netMargin = latestIncome.revenue > 0 ? (latestIncome.netIncome / latestIncome.revenue) * 100 : 0;

        // Basic quality score based on margin health
        let overallScore = 60;
        if (grossMargin > 30 && opMargin > 10 && netMargin > 5) {
            overallScore = 75;
        } else if (grossMargin > 20 && opMargin > 5) {
            overallScore = 60;
        } else if (opMargin > 0) {
            overallScore = 45;
        } else {
            overallScore = 30;
        }

        return {
            accrualRatio: null,
            cashConversion: null,
            revenueQuality: null,
            earningsVolatility: null,
            overallScore,
            cashFlowScore: 60,
            accrualScore: 60,
            consistencyScore: 60,
            qualityLevel: overallScore >= 70 ? 'good' : overallScore >= 50 ? 'fair' : 'poor',
            redFlags: [],
            summary: 'Quality assessment based on projected margins. Import historical SEC data for detailed analysis.',
        };
    }, [incomeStatement, historicalData]);

    const handleRefreshPrice = async () => {
        if (!company?.ticker) return;
        setIsRefreshing(true);
        try {
            await refreshStockPrice();
        } finally {
            setIsRefreshing(false);
        }
    };

    if (!hasMarketPrice) {
        return (
            <div className="bg-zinc-900/30 rounded-lg border border-zinc-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Calculator size={20} className="text-zinc-500" />
                    <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
                        Investment Metrics
                    </h3>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                    <Target size={24} className="text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm text-zinc-400 mb-2">
                        No market price available
                    </p>
                    <p className="text-xs text-zinc-500">
                        Search for a stock or import SEC data to compare DCF value against market price.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/30 rounded-lg border border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Calculator size={16} className="text-emerald-500" />
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
                            Investment Metrics
                        </h3>
                        <p className="text-xs text-zinc-500">
                            {company?.ticker} @ ${marketPrice.toFixed(2)}
                            <button
                                onClick={handleRefreshPrice}
                                disabled={isRefreshing}
                                className="ml-2 text-zinc-400 hover:text-zinc-200 inline-flex items-center"
                            >
                                <RefreshCw size={10} className={cn(isRefreshing && 'animate-spin')} />
                            </button>
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-zinc-500 hover:text-zinc-300"
                >
                    {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {/* Key Metrics Grid */}
            <div className="p-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Margin of Safety */}
                    {marginOfSafety && (
                        <MetricCard
                            label="Margin of Safety"
                            value={`${marginOfSafety.marginOfSafety >= 0 ? '+' : ''}${marginOfSafety.marginOfSafety.toFixed(1)}%`}
                            sublabel={marginOfSafety.verdict.replace('-', ' ')}
                            icon={<Shield size={16} />}
                            colorClass={
                                marginOfSafety.marginOfSafety >= 15
                                    ? 'text-emerald-400'
                                    : marginOfSafety.marginOfSafety >= -15
                                    ? 'text-yellow-400'
                                    : 'text-red-400'
                            }
                            tooltip="Difference between DCF value and market price. Positive = undervalued."
                        />
                    )}

                    {/* Implied Growth Rate */}
                    {reverseDCF && (
                        <MetricCard
                            label="Implied Growth"
                            value={formatPercent(reverseDCF.impliedGrowthRate)}
                            sublabel={
                                reverseDCF.growthPremium >= 0
                                    ? `+${reverseDCF.growthPremium.toFixed(1)}% vs assumed`
                                    : `${reverseDCF.growthPremium.toFixed(1)}% vs assumed`
                            }
                            icon={
                                reverseDCF.isOvervalued ? (
                                    <TrendingUp size={16} />
                                ) : (
                                    <TrendingDown size={16} />
                                )
                            }
                            colorClass={
                                reverseDCF.isOvervalued ? 'text-orange-400' : 'text-green-400'
                            }
                            tooltip="Growth rate the market is pricing in based on current stock price."
                        />
                    )}

                    {/* Risk Level */}
                    <MetricCard
                        label="Risk Level"
                        value={riskMetrics.riskLevel.charAt(0).toUpperCase() + riskMetrics.riskLevel.slice(1)}
                        sublabel={`Score: ${riskMetrics.riskScore}/100`}
                        icon={<Activity size={16} />}
                        colorClass={
                            riskMetrics.riskLevel === 'low'
                                ? 'text-emerald-400'
                                : riskMetrics.riskLevel === 'moderate'
                                ? 'text-yellow-400'
                                : riskMetrics.riskLevel === 'high'
                                ? 'text-orange-400'
                                : 'text-red-400'
                        }
                        tooltip="Overall financial risk based on leverage, liquidity, and coverage ratios."
                    />

                    {/* Earnings Quality */}
                    {earningsQuality && (
                        <MetricCard
                            label="Earnings Quality"
                            value={earningsQuality.qualityLevel.charAt(0).toUpperCase() + earningsQuality.qualityLevel.slice(1)}
                            sublabel={`Score: ${earningsQuality.overallScore}/100`}
                            icon={<DollarSign size={16} />}
                            colorClass={getQualityLevelColor(earningsQuality.qualityLevel)}
                            tooltip="Quality of earnings based on cash conversion and accruals."
                        />
                    )}
                </div>

                {/* Valuation Comparison */}
                {marginOfSafety && (
                    <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Valuation Comparison
                            </span>
                            <span
                                className={cn(
                                    'px-2 py-1 rounded-full text-xs font-medium border',
                                    getMarginOfSafetyBgColor(marginOfSafety.verdict)
                                )}
                            >
                                {marginOfSafety.verdict.replace('-', ' ')}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-xs text-zinc-500 mb-1">Market Price</p>
                                <p className="text-lg font-bold font-mono text-zinc-300">
                                    ${marketPrice.toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 mb-1">DCF Value</p>
                                <p className="text-lg font-bold font-mono text-emerald-400">
                                    ${marginOfSafety.dcfValue.toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 mb-1">Gap</p>
                                <p
                                    className={cn(
                                        'text-lg font-bold font-mono',
                                        marginOfSafety.absoluteGap >= 0
                                            ? 'text-green-400'
                                            : 'text-red-400'
                                    )}
                                >
                                    {marginOfSafety.absoluteGap >= 0 ? '+' : ''}$
                                    {marginOfSafety.absoluteGap.toFixed(2)}
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-zinc-500 mt-3 text-center">
                            {marginOfSafety.verdictDescription}
                        </p>
                    </div>
                )}

                {/* Detailed View */}
                {showDetails && (
                    <div className="space-y-4">
                        {/* Reverse DCF Sensitivity */}
                        {reverseDCF && (
                            <div className="bg-zinc-800/50 rounded-lg p-4">
                                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                                    Reverse DCF Sensitivity
                                </h4>
                                <p className="text-xs text-zinc-400 mb-3">
                                    Implied growth rates at different price levels
                                </p>
                                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                                    <div>
                                        <p className="text-zinc-500 mb-1">-20%</p>
                                        <p className="font-mono text-green-400">
                                            {formatPercent(reverseDCF.sensitivity.growthRateAt20PercentDiscount)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-zinc-500 mb-1">-10%</p>
                                        <p className="font-mono text-green-400">
                                            {formatPercent(reverseDCF.sensitivity.growthRateAt10PercentDiscount)}
                                        </p>
                                    </div>
                                    <div className="bg-zinc-700/50 rounded py-1">
                                        <p className="text-zinc-400 mb-1">Current</p>
                                        <p className="font-mono text-yellow-400">
                                            {formatPercent(reverseDCF.impliedGrowthRate)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-zinc-500 mb-1">+10%</p>
                                        <p className="font-mono text-orange-400">
                                            {formatPercent(reverseDCF.sensitivity.growthRateAt10PercentPremium)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-zinc-500 mb-1">+20%</p>
                                        <p className="font-mono text-red-400">
                                            {formatPercent(reverseDCF.sensitivity.growthRateAt20PercentPremium)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Risk Metrics Detail */}
                        <div className="bg-zinc-800/50 rounded-lg p-4">
                            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                                Risk Metrics Detail
                            </h4>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <p className="text-zinc-500 mb-1">Current Ratio</p>
                                    <p className={cn('font-mono', getRiskMetricColor(riskMetrics.currentRatio, 'currentRatio'))}>
                                        {formatRiskMetric(riskMetrics.currentRatio)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-zinc-500 mb-1">Debt/Equity</p>
                                    <p className={cn('font-mono', getRiskMetricColor(riskMetrics.debtToEquity, 'debtToEquity', true))}>
                                        {formatRiskMetric(riskMetrics.debtToEquity)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-zinc-500 mb-1">Interest Coverage</p>
                                    <p className={cn('font-mono', getRiskMetricColor(riskMetrics.interestCoverage, 'interestCoverage'))}>
                                        {formatRiskMetric(riskMetrics.interestCoverage)}x
                                    </p>
                                </div>
                                <div>
                                    <p className="text-zinc-500 mb-1">Net Debt/EBITDA</p>
                                    <p className={cn('font-mono', getRiskMetricColor(riskMetrics.netDebtToEBITDA, 'netDebtToEBITDA', true))}>
                                        {formatRiskMetric(riskMetrics.netDebtToEBITDA)}x
                                    </p>
                                </div>
                            </div>

                            {/* Risk Warnings */}
                            {riskMetrics.warnings.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-zinc-700">
                                    <p className="text-xs text-zinc-500 mb-2">Warnings:</p>
                                    <div className="space-y-1">
                                        {riskMetrics.warnings.slice(0, 3).map((warning, i) => (
                                            <div key={i} className="flex items-start gap-2">
                                                <AlertTriangle
                                                    size={12}
                                                    className={
                                                        warning.severity === 'high'
                                                            ? 'text-red-500'
                                                            : warning.severity === 'medium'
                                                            ? 'text-orange-500'
                                                            : 'text-yellow-500'
                                                    }
                                                />
                                                <span className="text-xs text-zinc-400">
                                                    {warning.message}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Earnings Quality Detail */}
                        {earningsQuality && (
                            <div className="bg-zinc-800/50 rounded-lg p-4">
                                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                                    Earnings Quality Detail
                                </h4>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                    <div>
                                        <p className="text-zinc-500 mb-1">Cash Conversion</p>
                                        <p className={cn('font-mono', getQualityScoreColor(earningsQuality.cashFlowScore))}>
                                            {earningsQuality.cashConversion?.toFixed(0) || 'N/A'}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-zinc-500 mb-1">Accrual Ratio</p>
                                        <p className={cn('font-mono', getQualityScoreColor(earningsQuality.accrualScore))}>
                                            {earningsQuality.accrualRatio?.toFixed(1) || 'N/A'}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-zinc-500 mb-1">Revenue Quality</p>
                                        <p className={cn('font-mono', getQualityScoreColor((earningsQuality.revenueQuality || 0) > 80 ? 80 : 60))}>
                                            {earningsQuality.revenueQuality?.toFixed(0) || 'N/A'}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-zinc-500 mb-1">Overall Score</p>
                                        <p className={cn('font-mono font-bold', getQualityScoreColor(earningsQuality.overallScore))}>
                                            {earningsQuality.overallScore}/100
                                        </p>
                                    </div>
                                </div>

                                {/* Red Flags */}
                                {earningsQuality.redFlags.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-zinc-700">
                                        <p className="text-xs text-zinc-500 mb-2">Red Flags:</p>
                                        <div className="space-y-1">
                                            {earningsQuality.redFlags.slice(0, 3).map((flag, i) => (
                                                <div key={i} className="flex items-start gap-2">
                                                    <AlertTriangle
                                                        size={12}
                                                        className={
                                                            flag.severity === 'high'
                                                                ? 'text-red-500'
                                                                : flag.severity === 'medium'
                                                                ? 'text-orange-500'
                                                                : 'text-yellow-500'
                                                        }
                                                    />
                                                    <span className="text-xs text-zinc-400">
                                                        {flag.message}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <p className="text-xs text-zinc-500 mt-3">{earningsQuality.summary}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
