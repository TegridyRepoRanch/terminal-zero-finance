// ContextPanel - Collapsible panel showing financial context
import { useState } from 'react';
import { ChevronDown, ChevronUp, Database, Building2, TrendingUp } from 'lucide-react';
import type { ChatContext } from '../../lib/dd-client';

interface ContextPanelProps {
  context: ChatContext;
}

export function ContextPanel({ context }: ContextPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasContext = context.ticker || context.companyName || context.financials;

  if (!hasContext) {
    return (
      <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-500">
          <Database className="w-4 h-4" />
          <span className="text-sm">No company selected</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/50 border-b border-zinc-800">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Building2 className="w-4 h-4 text-emerald-400" />
          <div className="text-left">
            <div className="text-sm font-medium text-zinc-200">
              {context.companyName || context.ticker}
            </div>
            {context.companyName && context.ticker && (
              <div className="text-xs text-zinc-500">{context.ticker}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {context.financials && (
            <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
              Financials loaded
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && context.financials && (
        <div className="px-4 pb-4 space-y-3">
          {/* Key metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {renderMetric('Revenue', context.financials.baseRevenue as number)}
            {renderMetric('Gross Margin', context.financials.grossMargin as number, true)}
            {renderMetric('EBIT Margin', context.financials.ebitMargin as number, true)}
            {renderMetric('Net Margin', context.financials.netMargin as number, true)}
          </div>

          {/* Additional details */}
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer text-xs text-zinc-500 hover:text-zinc-400">
              <TrendingUp className="w-3 h-3" />
              View all financial data
            </summary>
            <pre className="mt-2 p-2 bg-zinc-900 rounded text-xs text-zinc-400 overflow-x-auto max-h-48">
              {JSON.stringify(context.financials, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function renderMetric(label: string, value: number | undefined, isPercent = false) {
  if (value === undefined || value === null) return null;

  const formatted = isPercent
    ? `${(value * 100).toFixed(1)}%`
    : value >= 1e9
    ? `$${(value / 1e9).toFixed(1)}B`
    : value >= 1e6
    ? `$${(value / 1e6).toFixed(1)}M`
    : `$${value.toLocaleString()}`;

  return (
    <div className="bg-zinc-900/50 rounded px-2 py-1.5">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-sm font-medium text-zinc-200">{formatted}</div>
    </div>
  );
}
