// Financial Statements Tabbed View
// View all 6 projected financial statements

import { useState } from 'react';
import { FileText, TrendingUp, Wallet, DollarSign, Calculator, PieChart } from 'lucide-react';
import { IncomeStatement } from './IncomeStatement';
import { BalanceSheet } from './BalanceSheet';
import { CashFlowStatement } from './CashFlowStatement';
import { DepreciationSchedule } from './DepreciationSchedule';
import { DebtSchedule } from './DebtSchedule';
import { cn } from '../lib/utils';
import type { CashFlowRow } from '../lib/financial-logic';

type StatementTab = 'income' | 'balance' | 'cashflow' | 'depreciation' | 'debt' | 'dcf';

interface TabConfig {
  id: StatementTab;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  description: string;
}

const tabs: TabConfig[] = [
  {
    id: 'income',
    label: 'Income Statement',
    shortLabel: 'Income',
    icon: <TrendingUp size={16} />,
    description: 'Revenue, expenses, and profitability projections',
  },
  {
    id: 'balance',
    label: 'Balance Sheet',
    shortLabel: 'Balance',
    icon: <Wallet size={16} />,
    description: 'Assets, liabilities, and equity projections',
  },
  {
    id: 'cashflow',
    label: 'Cash Flow',
    shortLabel: 'Cash Flow',
    icon: <DollarSign size={16} />,
    description: 'Operating, investing, and financing cash flows',
  },
  {
    id: 'depreciation',
    label: 'Depreciation Schedule',
    shortLabel: 'Depreciation',
    icon: <Calculator size={16} />,
    description: 'PP&E and depreciation expense schedule',
  },
  {
    id: 'debt',
    label: 'Debt Schedule',
    shortLabel: 'Debt',
    icon: <FileText size={16} />,
    description: 'Debt balances, interest, and repayment schedule',
  },
  {
    id: 'dcf',
    label: 'DCF Summary',
    shortLabel: 'DCF',
    icon: <PieChart size={16} />,
    description: 'Discounted cash flow valuation summary',
  },
];

// Simple DCF Summary component
function DCFSummary() {
  const { useFinanceStore } = require('../store/useFinanceStore');
  const { valuation, assumptions, cashFlow } = useFinanceStore();

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    }
    if (Math.abs(value) >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Valuation Summary */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">DCF Valuation Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <p className="text-xs text-zinc-500 uppercase">Sum of PV (FCFs)</p>
            <p className="text-xl font-bold text-emerald-400 font-mono">{formatCurrency(valuation.sumPvUFCF)}</p>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <p className="text-xs text-zinc-500 uppercase">Terminal Value (PV)</p>
            <p className="text-xl font-bold text-cyan-400 font-mono">{formatCurrency(valuation.pvTerminalValue)}</p>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <p className="text-xs text-zinc-500 uppercase">Enterprise Value</p>
            <p className="text-xl font-bold text-purple-400 font-mono">{formatCurrency(valuation.enterpriseValue)}</p>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <p className="text-xs text-zinc-500 uppercase">Equity Value</p>
            <p className="text-xl font-bold text-emerald-400 font-mono">{formatCurrency(valuation.equityValue)}</p>
          </div>
        </div>
      </div>

      {/* Implied Share Price */}
      <div className="bg-gradient-to-r from-emerald-950/30 to-cyan-950/30 border border-emerald-800/50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Implied Share Price</p>
            <p className="text-4xl font-bold text-emerald-400 font-mono">${valuation.impliedSharePrice.toFixed(2)}</p>
            <p className="text-xs text-zinc-500 mt-1">
              Based on {assumptions.sharesOutstanding.toLocaleString()} shares outstanding
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-400">Key Assumptions</p>
            <p className="text-sm text-zinc-300">WACC: {assumptions.wacc}%</p>
            <p className="text-sm text-zinc-300">Terminal Growth: {assumptions.terminalGrowthRate}%</p>
          </div>
        </div>
      </div>

      {/* Cash Flow Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Projected Cash Flows & Present Values</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="text-left py-2 px-3 text-zinc-500">Year</th>
                <th className="text-right py-2 px-3 text-zinc-500">UFCF</th>
                <th className="text-right py-2 px-3 text-zinc-500">Discount Factor</th>
                <th className="text-right py-2 px-3 text-zinc-500">PV of UFCF</th>
              </tr>
            </thead>
            <tbody>
              {cashFlow.map((cf: CashFlowRow, i: number) => (
                <tr key={cf.year} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-2 px-3 text-zinc-300">Year {cf.year}</td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-400">
                    {formatCurrency(cf.unleveredFCF)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-zinc-400">
                    {valuation.pvFactors[i]?.toFixed(4)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-cyan-400">
                    {formatCurrency(valuation.pvUFCF[i])}
                  </td>
                </tr>
              ))}
              <tr className="bg-zinc-800/50 font-semibold">
                <td className="py-2 px-3 text-zinc-200">Terminal Value</td>
                <td className="py-2 px-3 text-right font-mono text-emerald-400">
                  {formatCurrency(valuation.terminalValue)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-zinc-400">
                  {valuation.pvFactors[valuation.pvFactors.length - 1]?.toFixed(4)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-cyan-400">
                  {formatCurrency(valuation.pvTerminalValue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function FinancialStatementsView() {
  const [activeTab, setActiveTab] = useState<StatementTab>('income');

  const renderContent = () => {
    switch (activeTab) {
      case 'income':
        return <IncomeStatement />;
      case 'balance':
        return <BalanceSheet />;
      case 'cashflow':
        return <CashFlowStatement />;
      case 'depreciation':
        return <DepreciationSchedule />;
      case 'debt':
        return <DebtSchedule />;
      case 'dcf':
        return <DCFSummary />;
      default:
        return null;
    }
  };

  const activeTabConfig = tabs.find((t) => t.id === activeTab);

  return (
    <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
        <h2 className="text-lg font-semibold text-zinc-100">Financial Statements</h2>
        <p className="text-sm text-zinc-500">Review projected financial statements and schedules</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-zinc-800 bg-zinc-900/30">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'text-emerald-400 border-emerald-400 bg-emerald-500/5'
                  : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/50'
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Description */}
      {activeTabConfig && (
        <div className="px-6 py-3 bg-zinc-900/20 border-b border-zinc-800/50">
          <p className="text-xs text-zinc-500">{activeTabConfig.description}</p>
        </div>
      )}

      {/* Content */}
      <div className="p-6">{renderContent()}</div>
    </div>
  );
}
