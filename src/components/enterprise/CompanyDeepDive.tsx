// Company Deep Dive Component
// Comprehensive analysis view for a single company
// Includes earnings analysis, DCF valuation, red flags, and more

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileText,
  BarChart3,
  DollarSign,
  Calendar,
  ChevronRight,
  RefreshCw,
  Download,
  ExternalLink,
  MessageSquare,
  Target,
  Shield,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useEnterpriseStore } from '../../store/useEnterpriseStore';
import { earningsAnalyzer, type EarningsAnalysis } from '../../lib/earnings-analyzer';
import { dcfGenerator, generateDCF, formatDCFSummary, type DCFValuation } from '../../lib/dcf-generator';
import { fetchComprehensiveFMPData, isFMPConfigured } from '../../lib/fmp-api';
import type { FMPComprehensiveData } from '../../lib/fmp-api';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ManagementToneGauge({ tone }: { tone: EarningsAnalysis['managementTone'] }) {
  const getColor = (value: number) => {
    if (value > 0.3) return 'text-emerald-400';
    if (value < -0.3) return 'text-red-400';
    return 'text-zinc-400';
  };

  const getBarWidth = (value: number) => {
    return `${Math.abs(value) * 100}%`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">Overall Tone</span>
        <span className={`text-sm font-medium ${getColor(tone.overall)}`}>
          {tone.overall > 0.3 ? 'Positive' : tone.overall < -0.3 ? 'Negative' : 'Neutral'}
        </span>
      </div>

      <div className="space-y-2">
        {[
          { label: 'Confidence', value: tone.confidence, inverse: false },
          { label: 'Defensiveness', value: tone.defensiveness, inverse: true },
          { label: 'Forward-Looking', value: tone.forwardLooking, inverse: false },
          { label: 'Transparency', value: tone.transparency, inverse: false },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-zinc-500">{item.label}</span>
              <span className={item.inverse ? (item.value > 0.5 ? 'text-amber-400' : 'text-emerald-400') : (item.value > 0.5 ? 'text-emerald-400' : 'text-zinc-400')}>
                {(item.value * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${item.inverse
                  ? (item.value > 0.5 ? 'bg-amber-500' : 'bg-emerald-500')
                  : (item.value > 0.5 ? 'bg-emerald-500' : 'bg-zinc-600')
                }`}
                style={{ width: getBarWidth(item.value) }}
              />
            </div>
          </div>
        ))}
      </div>

      {tone.comparedToPrior !== 'unknown' && (
        <div className="pt-2 border-t border-zinc-800">
          <span className="text-xs text-zinc-500">vs. Prior Quarter: </span>
          <span className={`text-xs font-medium ${
            tone.comparedToPrior === 'more_positive' ? 'text-emerald-400' :
            tone.comparedToPrior === 'more_negative' ? 'text-red-400' :
            'text-zinc-400'
          }`}>
            {tone.comparedToPrior.replace('_', ' ')}
          </span>
        </div>
      )}
    </div>
  );
}

function RedFlagCard({ flag }: { flag: EarningsAnalysis['redFlags'][0] }) {
  const severityStyles = {
    critical: 'border-red-500/50 bg-red-500/10',
    high: 'border-red-500/30 bg-red-500/5',
    medium: 'border-amber-500/30 bg-amber-500/5',
    low: 'border-zinc-700 bg-zinc-900/50',
  };

  return (
    <div className={`p-3 border rounded-lg ${severityStyles[flag.severity]}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
          flag.severity === 'critical' || flag.severity === 'high' ? 'text-red-400' :
          flag.severity === 'medium' ? 'text-amber-400' : 'text-zinc-500'
        }`} />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">{flag.category}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              flag.severity === 'critical' ? 'bg-red-500/30 text-red-400' :
              flag.severity === 'high' ? 'bg-red-500/20 text-red-400' :
              flag.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
              'bg-zinc-800 text-zinc-500'
            }`}>
              {flag.severity}
            </span>
          </div>
          <p className="text-sm text-zinc-200 font-medium mb-1">{flag.flag}</p>
          <p className="text-xs text-zinc-500 mb-2">{flag.context}</p>
          <blockquote className="text-xs text-zinc-400 italic border-l-2 border-zinc-700 pl-2">
            "{flag.quote}"
          </blockquote>
        </div>
      </div>
    </div>
  );
}

function GuidanceChangeCard({ change }: { change: EarningsAnalysis['guidanceChanges'][0] }) {
  const directionStyles = {
    raised: { icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    lowered: { icon: ArrowDownRight, color: 'text-red-400', bg: 'bg-red-500/10' },
    maintained: { icon: Target, color: 'text-zinc-400', bg: 'bg-zinc-800' },
    withdrawn: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    introduced: { icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  };

  const style = directionStyles[change.direction];
  const Icon = style.icon;

  return (
    <div className={`p-3 rounded-lg ${style.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${style.color}`} />
        <span className="font-medium text-zinc-200">{change.metric}</span>
        <span className={`text-xs uppercase ${style.color}`}>{change.direction}</span>
      </div>
      {(change.newValue || change.previousValue) && (
        <div className="flex items-center gap-2 text-sm">
          {change.previousValue && (
            <span className="text-zinc-500 line-through">{change.previousValue}</span>
          )}
          {change.newValue && (
            <span className={style.color}>{change.newValue}</span>
          )}
        </div>
      )}
      {change.managementComment && (
        <p className="text-xs text-zinc-500 mt-2">{change.managementComment}</p>
      )}
    </div>
  );
}

function DCFSummaryCard({ dcf }: { dcf: DCFValuation }) {
  const upsideColor = dcf.upsideDownside >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-zinc-800/50 rounded-lg">
          <p className="text-xs text-zinc-500 mb-1">Current Price</p>
          <p className="text-lg font-semibold text-zinc-100">${dcf.currentPrice.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-zinc-800/50 rounded-lg">
          <p className="text-xs text-zinc-500 mb-1">Fair Value</p>
          <p className={`text-lg font-semibold ${upsideColor}`}>
            ${dcf.impliedSharePrice.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-zinc-400">Upside/Downside</span>
          <span className={`text-xl font-bold ${upsideColor}`}>
            {dcf.upsideDownside >= 0 ? '+' : ''}{(dcf.upsideDownside * 100).toFixed(1)}%
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Bull Case</span>
            <span className="text-emerald-400">${dcf.bullCase.impliedPrice.toFixed(2)} (+{(dcf.bullCase.upside * 100).toFixed(0)}%)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Base Case</span>
            <span className="text-zinc-300">${dcf.baseCase.impliedPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Bear Case</span>
            <span className="text-red-400">${dcf.bearCase.impliedPrice.toFixed(2)} ({(dcf.bearCase.upside * 100).toFixed(0)}%)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-2 bg-zinc-800/50 rounded text-center">
          <p className="text-xs text-zinc-500">EV/EBITDA</p>
          <p className="text-sm font-medium text-zinc-200">{dcf.impliedEVToEBITDA.toFixed(1)}x</p>
        </div>
        <div className="p-2 bg-zinc-800/50 rounded text-center">
          <p className="text-xs text-zinc-500">FCF Yield</p>
          <p className="text-sm font-medium text-zinc-200">{(dcf.impliedFCFYield * 100).toFixed(1)}%</p>
        </div>
        <div className="p-2 bg-zinc-800/50 rounded text-center">
          <p className="text-xs text-zinc-500">WACC</p>
          <p className="text-sm font-medium text-zinc-200">{(dcf.assumptions.wacc * 100).toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CompanyDeepDiveProps {
  ticker: string;
  onClose?: () => void;
}

export function CompanyDeepDive({ ticker, onClose }: CompanyDeepDiveProps) {
  const { setCompanyData, getCompanyData } = useEnterpriseStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fmpData, setFmpData] = useState<FMPComprehensiveData | null>(null);
  const [earningsAnalysis, setEarningsAnalysis] = useState<EarningsAnalysis | null>(null);
  const [dcfValuation, setDcfValuation] = useState<DCFValuation | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'earnings' | 'dcf' | 'filings'>('overview');

  // Load company data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        // Check if we have cached data
        const cached = getCompanyData(ticker);
        if (cached && cached.dcfValuation) {
          setDcfValuation(cached.dcfValuation);
          if (cached.earningsAnalyses.length > 0) {
            setEarningsAnalysis(cached.earningsAnalyses[0]);
          }
        }

        // Fetch fresh FMP data
        if (isFMPConfigured()) {
          console.log(`[CompanyDeepDive] Fetching FMP data for ${ticker}`);
          const data = await fetchComprehensiveFMPData(ticker);
          setFmpData(data);

          // Generate DCF
          if (data.incomeStatements.annual.length >= 2) {
            const dcf = generateDCF(data);
            setDcfValuation(dcf);
            setCompanyData(ticker, { dcfValuation: dcf });
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load company data');
        console.error('[CompanyDeepDive] Error:', e);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [ticker, getCompanyData, setCompanyData]);

  // Analyze earnings
  const handleAnalyzeEarnings = async () => {
    if (!fmpData) return;

    setIsLoading(true);
    try {
      const { analyses } = await earningsAnalyzer.fetchAndAnalyze(ticker, 2);
      if (analyses.length > 0) {
        setEarningsAnalysis(analyses[0]);
        setCompanyData(ticker, {
          earningsAnalyses: analyses,
          lastEarningsAnalysisAt: new Date(),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to analyze earnings');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !fmpData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading {ticker} data...</p>
        </div>
      </div>
    );
  }

  if (error && !fmpData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-200 mb-2">Error Loading Data</h3>
          <p className="text-sm text-zinc-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const profile = fmpData?.profile;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-zinc-100">{ticker}</h1>
              {profile && (
                <span className="text-lg text-zinc-400">{profile.companyName}</span>
              )}
            </div>
            {profile && (
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <span>{profile.sector}</span>
                <span>•</span>
                <span>{profile.industry}</span>
                <span>•</span>
                <span>{profile.exchange}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <div className="text-right">
                <p className="text-2xl font-bold text-zinc-100">${profile.price.toFixed(2)}</p>
                <p className={`text-sm ${profile.changes >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {profile.changes >= 0 ? '+' : ''}{profile.changes.toFixed(2)} today
                </p>
              </div>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 mt-4">
          {(['overview', 'earnings', 'dcf', 'filings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DCF Summary */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                DCF Valuation
              </h2>
              {dcfValuation ? (
                <DCFSummaryCard dcf={dcfValuation} />
              ) : (
                <p className="text-zinc-500 text-sm">Loading valuation...</p>
              )}
            </div>

            {/* Earnings Summary */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  Management Tone
                </h2>
                {!earningsAnalysis && (
                  <button
                    onClick={handleAnalyzeEarnings}
                    disabled={isLoading}
                    className="text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    Analyze Earnings
                  </button>
                )}
              </div>
              {earningsAnalysis ? (
                <ManagementToneGauge tone={earningsAnalysis.managementTone} />
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">No earnings analysis yet</p>
                  <button
                    onClick={handleAnalyzeEarnings}
                    disabled={isLoading}
                    className="mt-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg disabled:opacity-50"
                  >
                    {isLoading ? 'Analyzing...' : 'Run AI Analysis'}
                  </button>
                </div>
              )}
            </div>

            {/* Key Takeaway */}
            {earningsAnalysis && (
              <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-zinc-100 mb-3">Key Takeaway</h2>
                <p className="text-zinc-300">{earningsAnalysis.keyTakeaway}</p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <h3 className="text-sm font-medium text-emerald-400 mb-2">Bullish Points</h3>
                    <ul className="space-y-1">
                      {earningsAnalysis.bullishPoints.slice(0, 3).map((point, i) => (
                        <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                          <TrendingUp className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-1" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-red-400 mb-2">Bearish Points</h3>
                    <ul className="space-y-1">
                      {earningsAnalysis.bearishPoints.slice(0, 3).map((point, i) => (
                        <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                          <TrendingDown className="w-3 h-3 text-red-400 flex-shrink-0 mt-1" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Red Flags */}
            {earningsAnalysis && earningsAnalysis.redFlags.length > 0 && (
              <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Red Flags ({earningsAnalysis.redFlags.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {earningsAnalysis.redFlags.map((flag, i) => (
                    <RedFlagCard key={i} flag={flag} />
                  ))}
                </div>
              </div>
            )}

            {/* Guidance Changes */}
            {earningsAnalysis && earningsAnalysis.guidanceChanges.length > 0 && (
              <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-cyan-400" />
                  Guidance Changes
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {earningsAnalysis.guidanceChanges.map((change, i) => (
                    <GuidanceChangeCard key={i} change={change} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'earnings' && earningsAnalysis && (
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-zinc-100 mb-4">Executive Summary</h2>
              <p className="text-zinc-300 whitespace-pre-line">{earningsAnalysis.summary}</p>
            </div>

            {/* Topics */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-zinc-100 mb-4">Key Topics Discussed</h2>
              <div className="space-y-4">
                {earningsAnalysis.topics.map((topic, i) => (
                  <div key={i} className="p-4 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-zinc-200">{topic.topic}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${topic.sentiment > 0 ? 'text-emerald-400' : topic.sentiment < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                          {(topic.sentiment * 100).toFixed(0)}% sentiment
                        </span>
                        <span className="text-xs text-zinc-500">{topic.mentions} mentions</span>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-500 mb-2">{topic.context}</p>
                    {topic.keyQuotes.length > 0 && (
                      <blockquote className="text-sm text-zinc-400 italic border-l-2 border-zinc-700 pl-3">
                        "{topic.keyQuotes[0]}"
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Trading Implications */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-zinc-100 mb-4">Trading Implications</h2>
              <p className="text-zinc-300">{earningsAnalysis.tradingImplications}</p>
              {earningsAnalysis.watchItems.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Watch Items</h3>
                  <ul className="space-y-1">
                    {earningsAnalysis.watchItems.map((item, i) => (
                      <li key={i} className="text-sm text-zinc-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'dcf' && dcfValuation && (
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
                {formatDCFSummary(dcfValuation)}
              </pre>
            </div>

            {/* Sensitivity Matrix */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-zinc-100 mb-4">Sensitivity Analysis</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="p-2 text-left text-zinc-500">WACC / Terminal Growth</th>
                      {[0.015, 0.02, 0.025, 0.03, 0.035].map((tg) => (
                        <th key={tg} className="p-2 text-center text-zinc-500">
                          {(tg * 100).toFixed(1)}%
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dcfValuation.waccSensitivity.map((row) => (
                      <tr key={row.wacc} className="border-b border-zinc-800">
                        <td className="p-2 text-zinc-400">{(row.wacc * 100).toFixed(1)}%</td>
                        {dcfValuation.sensitivityMatrix
                          .filter((m) => Math.abs(m.wacc - row.wacc) < 0.001)
                          .map((cell) => {
                            const upside = (cell.impliedPrice - dcfValuation.currentPrice) / dcfValuation.currentPrice;
                            return (
                              <td
                                key={cell.terminalGrowth}
                                className={`p-2 text-center ${
                                  upside > 0.1 ? 'text-emerald-400' :
                                  upside < -0.1 ? 'text-red-400' :
                                  'text-zinc-300'
                                }`}
                              >
                                ${cell.impliedPrice.toFixed(2)}
                              </td>
                            );
                          })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Assumptions */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-zinc-100 mb-4">Key Assumptions</h2>
              <ul className="space-y-2">
                {dcfValuation.assumptionNotes.map((note, i) => (
                  <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-1.5 flex-shrink-0" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'filings' && fmpData && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">Recent SEC Filings</h2>
            <div className="space-y-2">
              {fmpData.recentFilings.map((filing, i) => (
                <a
                  key={i}
                  href={filing.finalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-zinc-500" />
                    <div>
                      <p className="font-medium text-zinc-200">{filing.type}</p>
                      <p className="text-sm text-zinc-500">Filed: {filing.fillingDate}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-zinc-500" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CompanyDeepDive;
